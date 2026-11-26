/**
 * X / pbs.twimg.com URL helpers and formatting utilities.
 * Pure functions with zero external dependencies (shared by browser and Node validator).
 */

export const PROMPT_LOCATION_TYPES = Object.freeze({
  body: 'ポスト本文内',
  reply: 'ツリー（自己リプライ）内',
  quote: '引用ポスト内',
  alt: '画像のALTテキスト内',
  linked_post: '作者の別ポスト',
  other: '元ポスト周辺（メモ参照）',
});

export const MEDIA_TYPES = Object.freeze({
  image: '画像',
  video: '動画',
});

export const PROMPT_LANGUAGES = Object.freeze({
  ja: '日本語',
  en: '英語',
  zh: '中国語',
  ko: '韓国語',
  other: 'その他',
});

export const POST_STYLES = Object.freeze({
  real: '実写系',
  anime: 'アニメ系',
  illust: 'イラスト系',
  cg3d: '3D・CG系',
  pixel: 'ドット・ゲーム系',
  other: 'その他',
});

const ALLOWED_X_HOSTS = new Set([
  'x.com',
  'www.x.com',
  'mobile.x.com',
  'twitter.com',
  'www.twitter.com',
  'mobile.twitter.com',
]);

const ALLOWED_PBS_PATHS = [
  '/media/',
  '/tweet_video_thumb/',
  '/ext_tw_video_thumb/',
  '/amplify_video_thumb/',
];

const VIDEO_FILE_PATH_RE = /\.(mp4|m3u8|webm|mov|m4v|avi|mkv|ogv)(?:$|:)/i;

const ALLOWED_IMAGE_SIZES = new Set([
  'thumb',
  'small',
  'medium',
  'large',
  'orig',
  '360x360',
  '900x900',
  '4096x4096',
]);

/**
 * Extract numeric Tweet/Post ID from a valid X / Twitter status URL.
 * Returns null if the URL is invalid or not a status URL.
 * @param {string} rawUrl
 * @returns {string | null}
 */
export function extractTweetId(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return null;
  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  if (!ALLOWED_X_HOSTS.has(parsed.hostname.toLowerCase())) return null;

  // Matches /<user>/status/<id>, /i/web/status/<id>, /i/status/<id>, with optional trailing path
  const match = parsed.pathname.match(/^\/(?:[^/]+\/status|i\/web\/status|i\/status)\/(\d{1,25})(?:\/|$)/i);
  return match ? match[1] : null;
}

/**
 * Validate that a URL points safely to https://x.com or https://twitter.com.
 * @param {string} rawUrl
 * @returns {string | null}
 */
export function getSafeXUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return null;
  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  if (!ALLOWED_X_HOSTS.has(parsed.hostname.toLowerCase())) return null;
  return parsed.toString();
}

/**
 * Validate that an external URL uses https: (blocks javascript:, data:, etc.).
 * @param {string} rawUrl
 * @returns {string | null}
 */
export function getSafeHttpsUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return null;
  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  return parsed.toString();
}

/**
 * Check if a URL points to a direct video host/file (strictly forbidden by SPEC §4.2).
 * @param {string} rawUrl
 * @returns {boolean}
 */
export function isDirectVideoUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return false;
  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  if (host === 'video.twimg.com' || host.endsWith('.video.twimg.com')) {
    return true;
  }
  return VIDEO_FILE_PATH_RE.test(parsed.pathname);
}

/**
 * Check if a URL is a valid direct-link X image/thumbnail CDN URL (https://pbs.twimg.com/...).
 * Rejects non-HTTPS URLs, non-pbs.twimg.com hosts, and direct video files.
 * @param {string} rawUrl
 * @returns {boolean}
 */
export function isPbsImageUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return false;
  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  if (parsed.hostname.toLowerCase() !== 'pbs.twimg.com') return false;
  if (VIDEO_FILE_PATH_RE.test(parsed.pathname)) return false;
  return ALLOWED_PBS_PATHS.some((prefix) => parsed.pathname.startsWith(prefix));
}

/**
 * Build a direct-link pbs.twimg.com image URL with a specific `name` size variant.
 * Handles both modern (`?format=jpg&name=orig`) and legacy (`.jpg` / `.jpg:large`) URLs.
 *
 * Size guidance:
 * - 'small'  : max 680px  (thumbnails / mobile cards srcset)
 * - 'medium' : max 1200px (gallery cards)
 * - 'large'  : max 2048px (detail view)
 * - 'orig'   : original
 *
 * @param {string} rawUrl
 * @param {'thumb' | 'small' | 'medium' | 'large' | 'orig'} [sizeName='medium']
 * @returns {string | null}
 */
export function buildPbsImageUrl(rawUrl, sizeName = 'medium') {
  if (!isPbsImageUrl(rawUrl)) return null;
  const safeSize = ALLOWED_IMAGE_SIZES.has(sizeName) ? sizeName : 'medium';

  const parsed = new URL(rawUrl.trim());
  const pathname = parsed.pathname;

  // For /media/<id> paths, normalize legacy extension / :size suffix to canonical ?format=...&name=...
  if (pathname.startsWith('/media/')) {
    const legacyMatch = pathname.match(/^(\/media\/[^.:/]+)\.(jpg|jpeg|png|webp)(?::[a-z0-9]+)?$/i);
    if (legacyMatch) {
      const basePath = legacyMatch[1];
      const ext = legacyMatch[2].toLowerCase() === 'jpeg' ? 'jpg' : legacyMatch[2].toLowerCase();
      parsed.pathname = basePath;
      parsed.searchParams.set('format', ext);
      parsed.searchParams.set('name', safeSize);
      return parsed.toString();
    }

    // Modern /media/<id>?format=jpg&name=...
    if (!parsed.searchParams.get('format')) {
      parsed.searchParams.set('format', 'jpg');
    }
    parsed.searchParams.set('name', safeSize);
    return parsed.toString();
  }

  // Video thumb / other allowed pbs.twimg.com paths: strip legacy :size suffix and set `name` query param safely
  parsed.pathname = pathname.replace(/:[a-z0-9]+$/i, '');
  parsed.searchParams.set('name', safeSize);
  return parsed.toString();
}

/**
 * Build responsive srcset for list cards using X CDN's `small` and `medium` variants.
 * @param {string} rawUrl
 * @returns {string}
 */
export function buildCardImageSrcSet(rawUrl) {
  const small = buildPbsImageUrl(rawUrl, 'small');
  const medium = buildPbsImageUrl(rawUrl, 'medium');
  if (!small || !medium) return '';
  return `${small} 680w, ${medium} 1200w`;
}

/**
 * Normalize an image item (either URL string or `{ url, alt }` object).
 * @param {string | { url?: string, alt?: string }} item
 * @param {string} [fallbackAlt='']
 * @returns {{ url: string, alt: string } | null}
 */
export function normalizeImageItem(item, fallbackAlt = '') {
  if (typeof item === 'string') {
    const trimmed = item.trim();
    return trimmed ? { url: trimmed, alt: fallbackAlt } : null;
  }
  if (item && typeof item === 'object' && typeof item.url === 'string' && item.url.trim()) {
    return {
      url: item.url.trim(),
      alt: typeof item.alt === 'string' && item.alt.trim() ? item.alt.trim() : fallbackAlt,
    };
  }
  return null;
}

/**
 * Normalize an X handle by removing leading `@` and surrounding whitespace.
 * @param {string} handle
 * @returns {string}
 */
export function normalizeHandle(handle) {
  if (typeof handle !== 'string') return '';
  return handle.trim().replace(/^@+/, '');
}

/**
 * Normalize a tag string for tolerant matching against siteConfig.pinnedTags:
 * - NFKC normalization (unifies full-width ASCII, spaces, hyphens, underscores)
 * - Case-insensitive (toLowerCase)
 * - Treats spaces, hyphens (ASCII & Unicode dashes), and underscores as equivalent/optional
 *   (e.g. "Nano Banana", "nano banana", "nano-banana", "nano_banana", "NanoBanana" -> "nanobanana").
 * Preserves Japanese katakana prolonged sound mark "ー" (U+30FC).
 * @param {unknown} tag
 * @returns {string}
 */
export function normalizeTagKey(tag) {
  if (typeof tag !== 'string') return '';
  return tag
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[\s\-_\u2010-\u2015\u2212]+/g, '');
}

/**
 * Build X profile URL from author handle.
 * @param {string} handle
 * @returns {string | null}
 */
export function buildAuthorXUrl(handle) {
  const clean = normalizeHandle(handle);
  if (!clean || !/^[A-Za-z0-9_]{1,30}$/.test(clean)) return null;
  return `https://x.com/${clean}`;
}

/**
 * Determine whether a record's prompt lives in a separate post (thread reply / linked post).
 * When true, the detail view embeds BOTH the parent post and the prompt post.
 * @param {{ parentPostUrl?: string, promptPostUrl?: string }} post
 * @returns {boolean}
 */
export function hasSeparatePromptPost(post) {
  if (!post) return false;
  const parentId = extractTweetId(post.parentPostUrl);
  const promptId = extractTweetId(post.promptPostUrl);
  return Boolean(parentId && promptId && parentId !== promptId);
}

/**
 * Get Japanese label for promptLocationType.
 * @param {string} type
 * @returns {string}
 */
export function getPromptLocationLabel(type) {
  return PROMPT_LOCATION_TYPES[type] || PROMPT_LOCATION_TYPES.other;
}

/**
 * Get Japanese label for mediaType ("image" | "video").
 * @param {string} type
 * @returns {string}
 */
export function getMediaTypeLabel(type) {
  return MEDIA_TYPES[type] || MEDIA_TYPES.image;
}

/**
 * Get Japanese label for promptLanguage ("ja" | "en" | "zh" | "ko" | "other").
 * @param {string} lang
 * @returns {string}
 */
export function getPromptLanguageLabel(lang) {
  return PROMPT_LANGUAGES[lang] || PROMPT_LANGUAGES.other;
}

/**
 * Get Japanese label for style ("real" | "anime" | "illust" | "cg3d" | "pixel" | "other").
 * @param {string} style
 * @returns {string}
 */
export function getStyleLabel(style) {
  return POST_STYLES[style] || POST_STYLES.other;
}

/**
 * Check whether a likes count snapshot is a valid non-negative integer.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidLikesCount(value) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/**
 * Format a like count snapshot compactly in Japanese for gallery cards
 * (e.g. 42000 -> "4.2万", 1250 -> "1,250", 0 -> "0").
 * Returns null if value is not a valid non-negative integer.
 * @param {unknown} likes
 * @returns {string | null}
 */
export function formatLikesShortJa(likes) {
  if (!isValidLikesCount(likes)) return null;
  if (likes >= 10000) {
    const man = Math.floor(likes / 1000) / 10;
    const formatted = Number.isInteger(man) ? man.toLocaleString('ja-JP') : man.toFixed(1);
    return `${formatted}万`;
  }
  return likes.toLocaleString('ja-JP');
}

/**
 * Format a like count snapshot with thousands separators for detail metadata (e.g. 42000 -> "42,000").
 * Returns null if value is not a valid non-negative integer.
 * @param {unknown} likes
 * @returns {string | null}
 */
export function formatLikesExactJa(likes) {
  if (!isValidLikesCount(likes)) return null;
  return likes.toLocaleString('ja-JP');
}

/**
 * Determine whether a record represents a video post.
 * @param {{ mediaType?: string }} post
 * @returns {boolean}
 */
export function isVideoPost(post) {
  return post?.mediaType === 'video';
}

/**
 * Get the primary direct-link thumbnail image for a card (videoThumbnail for video posts, images[0] for image posts).
 * @param {object} post
 * @returns {{ url: string, alt: string } | null}
 */
export function getPostCardThumbnail(post) {
  if (!post) return null;
  const fallbackAlt = post.title || '';
  if (isVideoPost(post)) {
    const thumb = normalizeImageItem(post.videoThumbnail, fallbackAlt);
    if (thumb) return thumb;
  }
  const images = Array.isArray(post.images) ? post.images : [];
  for (const item of images) {
    const normalized = normalizeImageItem(item, fallbackAlt);
    if (normalized) return normalized;
  }
  return null;
}

/**
 * Get all direct-link still images / video thumbnail to render in the detail left column.
 * Never includes direct video streams.
 * @param {object} post
 * @returns {Array<{ url: string, alt: string }>}
 */
export function getPostMediaGallery(post) {
  if (!post) return [];
  const fallbackAlt = post.title || '';
  const list = [];
  const seen = new Set();

  const pushUnique = (rawItem) => {
    const item = normalizeImageItem(rawItem, fallbackAlt);
    if (!item || seen.has(item.url)) return;
    seen.add(item.url);
    list.push(item);
  };

  if (isVideoPost(post) && post.videoThumbnail) {
    pushUnique(post.videoThumbnail);
  }
  if (Array.isArray(post.images)) {
    post.images.forEach(pushUnique);
  }
  return list;
}

const TWITTER_SNOWFLAKE_EPOCH_MS = 1288834974657n;
const MIN_SNOWFLAKE_TWEET_ID = 100000000000000n;
const MAX_VALID_TIMESTAMP_MS = 4102444800000; // 2100-01-01T00:00:00Z
const DISPLAY_TIME_ZONE = 'Asia/Tokyo';
const ISO_DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATETIME_RE =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:?\d{2})?$/i;
const ISO_DATETIME_NO_TZ_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?$/;
const RFC2822_DATETIME_RE =
  /^(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+)?(?:[A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+[+-]\d{4}\s+\d{4}|\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4}\s+\d{2}:\d{2}(?::\d{2})?\s+(?:GMT|UTC|[+-]\d{4}))$/;

/**
 * Extract the exact UTC creation timestamp (epoch ms) from an X/Twitter Snowflake status URL.
 * Returns null for non-X URLs, pre-Snowflake IDs, or placeholder IDs (e.g. 0000000000000000000).
 * @param {string} rawUrl
 * @returns {number | null}
 */
export function extractTweetTimestampMs(rawUrl) {
  const tweetId = extractTweetId(rawUrl);
  if (!tweetId) return null;
  let idBig;
  try {
    idBig = BigInt(tweetId);
  } catch {
    return null;
  }
  if (idBig < MIN_SNOWFLAKE_TWEET_ID) return null;
  const ms = Number((idBig >> 22n) + TWITTER_SNOWFLAKE_EPOCH_MS);
  if (!Number.isFinite(ms) || ms < Number(TWITTER_SNOWFLAKE_EPOCH_MS) || ms > MAX_VALID_TIMESTAMP_MS) {
    return null;
  }
  return ms;
}

/**
 * Format an epoch millisecond timestamp as YYYY-MM-DD in the specified IANA time zone.
 * @param {number} ms
 * @param {string} [timeZone='Asia/Tokyo']
 * @returns {string | null}
 */
export function formatTimestampYmdInTimeZone(ms, timeZone = DISPLAY_TIME_ZONE) {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(ms));
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  if (!year || !month || !day) return null;
  return `${year}-${month}-${day}`;
}

function parseDateOnlyToUtcMidnightMs(raw) {
  if (typeof raw !== 'string') return null;
  const match = raw.trim().match(ISO_DATE_ONLY_RE);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const ms = Date.UTC(year, month - 1, day);
  const check = new Date(ms);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return ms;
}

function parseUtcDatetimeMs(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (ISO_DATETIME_RE.test(trimmed)) {
    const normalized = ISO_DATETIME_NO_TZ_RE.test(trimmed)
      ? `${trimmed.replace(' ', 'T')}Z`
      : trimmed.replace(' ', 'T');
    const ms = Date.parse(normalized);
    return Number.isFinite(ms) ? ms : null;
  }
  if (RFC2822_DATETIME_RE.test(trimmed)) {
    const ms = Date.parse(trimmed);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

/**
 * Resolve a post's original posting date in Asia/Tokyo (JST) without altering stored UTC data.
 * - Full UTC/offset timestamps (ISO-8601 or RFC 2822) are converted directly to Asia/Tokyo.
 * - Date-only YYYY-MM-DD strings stored from UTC API responses are resolved to their exact
 *   Asia/Tokyo date via the parent post's Twitter/X Snowflake ID when consistent (within ±1 day),
 *   so posts made between 15:00–23:59 UTC match the official X embed's Japan-time date.
 * @param {string} originalPostedAt
 * @param {string} [parentPostUrl='']
 * @returns {{ ymd: string | null, sortMs: number | null }}
 */
export function resolveOriginalPostDateJst(originalPostedAt, parentPostUrl = '') {
  if (typeof originalPostedAt !== 'string' || !originalPostedAt.trim()) {
    return { ymd: null, sortMs: null };
  }
  const trimmed = originalPostedAt.trim();

  const dateOnlyUtcMs = parseDateOnlyToUtcMidnightMs(trimmed);
  if (dateOnlyUtcMs !== null) {
    const sfMs = extractTweetTimestampMs(parentPostUrl);
    if (sfMs !== null) {
      const sfUtcYmd = formatTimestampYmdInTimeZone(sfMs, 'UTC');
      const sfUtcMidnightMs = parseDateOnlyToUtcMidnightMs(sfUtcYmd);
      if (sfUtcMidnightMs !== null && Math.abs(sfUtcMidnightMs - dateOnlyUtcMs) <= 86400000) {
        return {
          ymd: formatTimestampYmdInTimeZone(sfMs, DISPLAY_TIME_ZONE),
          sortMs: sfMs,
        };
      }
    }
    return { ymd: trimmed, sortMs: dateOnlyUtcMs };
  }

  const tsMs = parseUtcDatetimeMs(trimmed);
  if (tsMs !== null) {
    return {
      ymd: formatTimestampYmdInTimeZone(tsMs, DISPLAY_TIME_ZONE),
      sortMs: tsMs,
    };
  }

  return { ymd: null, sortMs: null };
}

/**
 * Get the numeric sort timestamp (epoch ms) for a post's originalPostedAt (consistent with JST display).
 * @param {{ originalPostedAt?: string, parentPostUrl?: string }} post
 * @returns {number | null}
 */
export function getOriginalPostSortMs(post) {
  if (!post) return null;
  return resolveOriginalPostDateJst(post.originalPostedAt, post.parentPostUrl).sortMs;
}

/**
 * Format an original X post date in Japanese using Asia/Tokyo (JST) time (e.g. "2022年7月11日").
 * @param {string} originalPostedAt
 * @param {string} [parentPostUrl='']
 * @returns {string}
 */
export function formatOriginalPostDateJa(originalPostedAt, parentPostUrl = '') {
  if (typeof originalPostedAt !== 'string' || !originalPostedAt.trim()) return '—';
  const { ymd } = resolveOriginalPostDateJst(originalPostedAt, parentPostUrl);
  if (ymd) return formatDateJa(ymd);
  return formatDateJa(originalPostedAt);
}

/**
 * Format YYYY-MM-DD (or a full UTC/ISO timestamp converted to Asia/Tokyo) as Japanese date
 * (e.g. "2026年11月26日").
 * @param {string} isoDate
 * @returns {string}
 */
export function formatDateJa(isoDate) {
  if (typeof isoDate !== 'string' || !isoDate.trim()) return '—';
  const trimmed = isoDate.trim();
  const match = trimmed.match(ISO_DATE_ONLY_RE);
  if (match) {
    return `${match[1]}年${Number(match[2])}月${Number(match[3])}日`;
  }
  const tsMs = parseUtcDatetimeMs(trimmed);
  if (tsMs !== null) {
    const jstYmd = formatTimestampYmdInTimeZone(tsMs, DISPLAY_TIME_ZONE);
    const jstMatch = jstYmd?.match(ISO_DATE_ONLY_RE);
    if (jstMatch) {
      return `${jstMatch[1]}年${Number(jstMatch[2])}月${Number(jstMatch[3])}日`;
    }
  }
  return isoDate;
}

/**
 * Compute ISO week string (e.g. "2026-W48") from YYYY-MM-DD.
 * @param {string} isoDate
 * @returns {string}
 */
export function getIsoWeekKey(isoDate) {
  if (typeof isoDate !== 'string') return '未分類';
  const match = isoDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '未分類';
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Format ISO week key ("2026-W48") for Japanese headings.
 * @param {string} weekKey
 * @returns {string}
 */
export function formatWeekKeyJa(weekKey) {
  if (typeof weekKey !== 'string') return '週刊まとめ';
  const match = weekKey.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return weekKey;
  return `${match[1]}年 第${Number(match[2])}週`;
}
