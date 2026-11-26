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

/**
 * Format YYYY-MM-DD as Japanese date (e.g. "2026年11月26日").
 * @param {string} isoDate
 * @returns {string}
 */
export function formatDateJa(isoDate) {
  if (typeof isoDate !== 'string') return '—';
  const match = isoDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return isoDate;
  return `${match[1]}年${Number(match[2])}月${Number(match[3])}日`;
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
