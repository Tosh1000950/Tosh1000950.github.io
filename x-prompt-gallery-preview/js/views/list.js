/**
 * List View & reusable Prompt Card component.
 *
 * Strictly adheres to SPEC §4.2:
 * - Displays large direct-linked X images (pbs.twimg.com) using `name=small/medium`.
 * - Overlays site's own UI (Japanese title, tags, author @handle, model, category, style, language, likes snapshot) on cards.
 * - NEVER places official X embeds in the list view.
 * - Defaults to original post date newest first (originalPostedAt descending) per SPEC §5.1.
 */

import {
  POST_STYLES,
  PROMPT_LANGUAGES,
  buildCardImageSrcSet,
  buildPbsImageUrl,
  formatDateJa,
  formatLikesExactJa,
  formatLikesShortJa,
  getPostCardThumbnail,
  getPromptLanguageLabel,
  getStyleLabel,
  hasSeparatePromptPost,
  isValidLikesCount,
  isVideoPost,
  normalizeHandle,
  normalizeImageItem,
} from '../url-utils.js';

export const SORT_OPTIONS = Object.freeze([
  { value: 'original-desc', label: '元の投稿日（新しい順）' },
  { value: 'original-asc', label: '元の投稿日（古い順）' },
  { value: 'likes-desc', label: 'いいね数順（収集時点）' },
  { value: 'published-desc', label: '掲載日（新しい順）' },
]);

function normalizeSortKey(sortBy) {
  switch (sortBy) {
    case 'original-asc':
      return 'original-asc';
    case 'likes-desc':
    case 'likes':
      return 'likes-desc';
    case 'published-desc':
    case 'published':
      return 'published-desc';
    case 'original-desc':
    case 'original':
    default:
      return 'original-desc';
  }
}

function compareDatesDesc(a, b) {
  const sa = typeof a === 'string' ? a.trim() : '';
  const sb = typeof b === 'string' ? b.trim() : '';
  if (sa === sb) return 0;
  if (!sa) return 1;
  if (!sb) return -1;
  return sb.localeCompare(sa);
}

function compareDatesAsc(a, b) {
  const sa = typeof a === 'string' ? a.trim() : '';
  const sb = typeof b === 'string' ? b.trim() : '';
  if (sa === sb) return 0;
  if (!sa) return 1;
  if (!sb) return -1;
  return sa.localeCompare(sb);
}

function compareLikesDesc(a, b) {
  const hasA = isValidLikesCount(a);
  const hasB = isValidLikesCount(b);
  if (hasA && hasB) return b - a;
  if (hasA) return -1;
  if (hasB) return 1;
  return 0;
}

/**
 * Create a single direct-linked image / video-thumbnail card element
 * (reused in List, Weekly, and Author views).
 * @param {object} post
 * @param {{ sortBy?: string }} [options]
 * @returns {HTMLElement}
 */
export function createPromptCard(post, { sortBy = 'original-desc' } = {}) {
  const isVideo = isVideoPost(post);
  const article = document.createElement('article');
  article.className = isVideo ? 'prompt-card prompt-card--video' : 'prompt-card';
  article.dataset.postId = post.id;
  article.dataset.mediaType = isVideo ? 'video' : 'image';
  if (post.style) {
    article.dataset.style = post.style;
  }
  if (post.promptLanguage) {
    article.dataset.promptLanguage = post.promptLanguage;
  }
  if (isValidLikesCount(post.likesAtCuration)) {
    article.dataset.likesAtCuration = String(post.likesAtCuration);
  }

  const images = (Array.isArray(post.images) ? post.images : [])
    .map((item) => normalizeImageItem(item, post.title))
    .filter(Boolean);
  const primaryThumb = getPostCardThumbnail(post);
  const mediumUrl = primaryThumb ? buildPbsImageUrl(primaryThumb.url, 'medium') : null;
  const srcSet = primaryThumb ? buildCardImageSrcSet(primaryThumb.url) : '';

  const mediaWrap = document.createElement('div');
  mediaWrap.className = 'card-media';

  if (mediumUrl) {
    const img = document.createElement('img');
    img.className = 'card-img';
    img.src = mediumUrl;
    if (srcSet) {
      img.srcset = srcSet;
      img.sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 340px';
    }
    img.alt = primaryThumb.alt || post.title;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => {
      img.remove();
      mediaWrap.appendChild(createCardImageFallback(isVideo));
    });
    mediaWrap.appendChild(img);
  } else {
    mediaWrap.appendChild(createCardImageFallback(isVideo));
  }

  // Site-UI play-badge overlay for video posts (SPEC §4.2 — thumbnail direct link, playback only in detail embed)
  if (isVideo) {
    const playOverlay = document.createElement('div');
    playOverlay.className = 'card-play-overlay';
    playOverlay.setAttribute('aria-hidden', 'true');
    playOverlay.innerHTML =
      '<span class="card-play-circle"><svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" focusable="false"><path d="M8 5.14v13.72a1 1 0 0 0 1.53.85l10.6-6.86a1 1 0 0 0 0-1.7L9.53 4.29A1 1 0 0 0 8 5.14z"/></svg></span>';
    mediaWrap.appendChild(playOverlay);
  }

  // Primary stretched link opens detail view (accessible keyboard + right-click support)
  const cardLink = document.createElement('a');
  cardLink.className = 'card-stretched-link';
  cardLink.href = `#/post/${encodeURIComponent(post.id)}`;
  cardLink.setAttribute(
    'aria-label',
    isVideo
      ? `${post.title}（動画ポスト：詳細のX公式埋め込みで再生）`
      : `${post.title}（詳細とX公式埋め込みを見る）`
  );

  // Top overlay: model, category, video / language / multi-image / thread badges
  const topOverlay = document.createElement('div');
  topOverlay.className = 'card-top-overlay';

  const leftBadges = document.createElement('div');
  leftBadges.className = 'card-badges-left';

  if (post.model) {
    const modelBadge = document.createElement('span');
    modelBadge.className = 'card-badge card-badge--model';
    modelBadge.textContent = post.model;
    leftBadges.appendChild(modelBadge);
  }

  if (post.category) {
    const catBadge = document.createElement('span');
    catBadge.className = 'card-badge';
    catBadge.textContent = post.category;
    leftBadges.appendChild(catBadge);
  }

  const rightBadges = document.createElement('div');
  rightBadges.className = 'card-badges-right';

  if (isVideo) {
    const videoBadge = document.createElement('span');
    videoBadge.className = 'card-badge card-badge--video';
    videoBadge.textContent = '▶ 動画';
    rightBadges.appendChild(videoBadge);
  }

  if (post.style) {
    const styleBadge = document.createElement('span');
    styleBadge.className = 'card-badge card-badge--style';
    styleBadge.textContent = getStyleLabel(post.style);
    rightBadges.appendChild(styleBadge);
  }

  if (post.promptLanguage) {
    const langBadge = document.createElement('span');
    langBadge.className = 'card-badge card-badge--lang';
    langBadge.textContent = getPromptLanguageLabel(post.promptLanguage);
    rightBadges.appendChild(langBadge);
  }

  if (!isVideo && images.length > 1) {
    const countBadge = document.createElement('span');
    countBadge.className = 'card-badge';
    countBadge.textContent = `${images.length}枚`;
    rightBadges.appendChild(countBadge);
  }

  if (hasSeparatePromptPost(post)) {
    const threadBadge = document.createElement('span');
    threadBadge.className = 'card-badge card-badge--thread';
    threadBadge.textContent = 'ツリー';
    rightBadges.appendChild(threadBadge);
  }

  topOverlay.append(leftBadges, rightBadges);

  // Bottom overlay: Japanese title, author @handle, tags
  const bottomOverlay = document.createElement('div');
  bottomOverlay.className = 'card-bottom-overlay';

  const titleEl = document.createElement('h3');
  titleEl.className = 'card-title';
  titleEl.textContent = post.title;

  const metaRow = document.createElement('div');
  metaRow.className = 'card-meta-row';

  const handle = normalizeHandle(post.author?.handle);
  if (handle) {
    const authorLink = document.createElement('a');
    authorLink.className = 'card-author-link';
    authorLink.href = `#/author/${encodeURIComponent(handle)}`;
    authorLink.textContent = `@${handle}`;
    authorLink.setAttribute('aria-label', `作者 @${handle} の掲載一覧を見る`);
    metaRow.appendChild(authorLink);
  }

  const metaStats = document.createElement('div');
  metaStats.className = 'card-meta-stats';

  const likesShort = formatLikesShortJa(post.likesAtCuration);
  if (likesShort !== null) {
    const likesExact = formatLikesExactJa(post.likesAtCuration);
    const likesEl = document.createElement('span');
    likesEl.className = 'card-likes';
    likesEl.title = `収集時点のいいね数: ${likesExact}`;
    likesEl.setAttribute('aria-label', `収集時点のいいね数 ${likesExact}`);
    likesEl.textContent = `♥ ${likesShort}（収集時点）`;
    metaStats.appendChild(likesEl);
  }

  const normalizedSort = normalizeSortKey(sortBy);
  const dateValue =
    normalizedSort === 'published-desc'
      ? post.publishedAt || post.originalPostedAt
      : post.originalPostedAt || post.publishedAt;
  if (dateValue) {
    const dateEl = document.createElement('span');
    dateEl.className = 'card-date';
    dateEl.textContent =
      normalizedSort === 'published-desc'
        ? `掲載 ${formatDateJa(dateValue)}`
        : `投稿 ${formatDateJa(dateValue)}`;
    metaStats.appendChild(dateEl);
  }

  if (metaStats.childElementCount > 0) {
    metaRow.appendChild(metaStats);
  }

  bottomOverlay.append(titleEl, metaRow);

  if (Array.isArray(post.tags) && post.tags.length > 0) {
    const tagsWrap = document.createElement('div');
    tagsWrap.className = 'card-tags';
    post.tags.slice(0, 3).forEach((tag) => {
      const tagSpan = document.createElement('span');
      tagSpan.className = 'card-tag';
      tagSpan.textContent = `#${tag}`;
      tagsWrap.appendChild(tagSpan);
    });
    if (post.tags.length > 3) {
      const moreSpan = document.createElement('span');
      moreSpan.className = 'card-tag';
      moreSpan.textContent = `+${post.tags.length - 3}`;
      tagsWrap.appendChild(moreSpan);
    }
    bottomOverlay.appendChild(tagsWrap);
  }

  article.append(mediaWrap, cardLink, topOverlay, bottomOverlay);
  return article;
}

function createCardImageFallback(isVideo = false) {
  const wrap = document.createElement('div');
  wrap.className = 'card-img-fallback';

  const title = document.createElement('span');
  title.className = 'card-img-fallback-title';
  title.textContent = isVideo ? '動画サムネイルを読み込めませんでした' : '画像を読み込めませんでした';

  const sub = document.createElement('span');
  sub.textContent = isVideo
    ? '詳細のX公式埋め込みから再生・確認できます'
    : '詳細からX元ポストを確認できます';

  wrap.append(title, sub);
  return wrap;
}

/**
 * Sort posts according to selected sort order (default: originalPostedAt newest first per SPEC §5.1).
 * @param {Array<object>} posts
 * @param {'original-desc' | 'original-asc' | 'likes-desc' | 'published-desc' | 'original' | 'published'} [sortBy='original-desc']
 * @returns {Array<object>}
 */
export function sortPosts(posts, sortBy = 'original-desc') {
  const key = normalizeSortKey(sortBy);
  return [...posts].sort((a, b) => {
    if (key === 'original-asc') {
      return (
        compareDatesAsc(a.originalPostedAt, b.originalPostedAt) ||
        compareDatesAsc(a.publishedAt, b.publishedAt) ||
        String(a.id || '').localeCompare(String(b.id || ''))
      );
    }

    if (key === 'likes-desc') {
      return (
        compareLikesDesc(a.likesAtCuration, b.likesAtCuration) ||
        compareDatesDesc(a.originalPostedAt, b.originalPostedAt) ||
        compareDatesDesc(a.publishedAt, b.publishedAt) ||
        String(b.id || '').localeCompare(String(a.id || ''))
      );
    }

    if (key === 'published-desc') {
      return (
        compareDatesDesc(a.publishedAt, b.publishedAt) ||
        compareDatesDesc(a.originalPostedAt, b.originalPostedAt) ||
        String(b.id || '').localeCompare(String(a.id || ''))
      );
    }

    // Default: original-desc (original post date newest first)
    return (
      compareDatesDesc(a.originalPostedAt, b.originalPostedAt) ||
      compareDatesDesc(a.publishedAt, b.publishedAt) ||
      compareLikesDesc(a.likesAtCuration, b.likesAtCuration) ||
      String(b.id || '').localeCompare(String(a.id || ''))
    );
  });
}

/**
 * Render the main List View (Manifesto banner, Weekly Pickup, Filter Panel, Card Grid).
 * @param {object} params
 * @param {HTMLElement} params.container
 * @param {Array<object>} params.posts - Enabled posts only
 * @param {object} params.siteConfig
 * @param {{ category: string, model: string, tag: string, sort: 'published' | 'original' }} params.filters
 * @param {(nextFilters: object) => void} params.onFilterChange
 */
export function renderListView({ container, posts, siteConfig, filters, onFilterChange }) {
  container.innerHTML = '';

  // 1. Compact Three-Way-Win Manifesto Banner
  const banner = document.createElement('section');
  banner.className = 'manifesto-banner';
  banner.setAttribute('aria-label', '三方良しの運営宣言');

  const bannerText = document.createElement('div');
  const kicker = document.createElement('p');
  kicker.className = 'manifesto-kicker';
  kicker.textContent = '三方良しキュレーション';

  const headline = document.createElement('h1');
  headline.className = 'manifesto-headline';
  headline.textContent =
    siteConfig?.tagline ||
    '画像もプロンプトも抜きません。一次ソースはXに置いたまま、作者のポストに返します。';

  const sub = document.createElement('p');
  sub.className = 'manifesto-sub';
  sub.textContent =
    '気になる画像・動画サムネイルをタップすると、大きな表示とX公式埋め込みを並べて確認でき、プロンプトの場所案内から元ポストへ迷わず辿れます。';

  bannerText.append(kicker, headline, sub);

  const bannerActions = document.createElement('div');
  bannerActions.className = 'manifesto-actions';

  const aboutBtn = document.createElement('a');
  aboutBtn.href = '#/about';
  aboutBtn.className = 'btn btn--outline btn--sm';
  aboutBtn.textContent = '三方良しの方針';

  const submitBtn = document.createElement('a');
  submitBtn.href = '#/submit';
  submitBtn.className = 'btn btn--accent btn--sm';
  submitBtn.textContent = '自薦・掲載依頼';

  bannerActions.append(aboutBtn, submitBtn);
  banner.append(bannerText, bannerActions);
  container.appendChild(banner);

  // 2. Empty state when 0 enabled posts exist (initial pre-seed state)
  if (posts.length === 0) {
    const empty = document.createElement('section');
    empty.className = 'empty-state-card';

    const badge = document.createElement('span');
    badge.className = 'empty-state-badge';
    badge.textContent = '初回キュレーション準備中';

    const heading = document.createElement('h2');
    heading.textContent = '現在、初回掲載（20〜30件）の選定を進めています';

    const desc = document.createElement('p');
    desc.textContent =
      '本サイトは件数ではなく鮮度と作者への還元を重視しています。バズ基準と権利配慮を満たすポストを手作業で選定し、順次公開します。作者ご本人からの自薦も歓迎しています。';

    const actions = document.createElement('div');
    actions.className = 'empty-state-actions';

    const a1 = document.createElement('a');
    a1.href = '#/about';
    a1.className = 'btn btn--primary';
    a1.textContent = 'このサイトについて読む';

    const a2 = document.createElement('a');
    a2.href = '#/submit';
    a2.className = 'btn btn--outline';
    a2.textContent = '自薦・掲載依頼の案内';

    const a3 = document.createElement('a');
    a3.href = '#/removal';
    a3.className = 'btn btn--ghost';
    a3.textContent = '削除・修正の依頼';

    actions.append(a1, a2, a3);
    empty.append(badge, heading, desc, actions);
    container.appendChild(empty);
    return;
  }

  const hasActiveFilter = Boolean(
    filters.category || filters.style || filters.model || filters.language || filters.tag
  );

  // 3. Weekly Pickup section (shown when no filters are active)
  const pickupPosts = sortPosts(posts.filter((p) => p.weeklyPickup === true), 'published-desc');
  if (!hasActiveFilter && pickupPosts.length > 0) {
    const pickupSec = document.createElement('section');
    pickupSec.className = 'pickup-section';
    pickupSec.setAttribute('aria-labelledby', 'pickup-heading');

    const headRow = document.createElement('div');
    headRow.className = 'section-heading-row';

    const h2 = document.createElement('h2');
    h2.id = 'pickup-heading';
    h2.className = 'section-title';
    h2.textContent = '今週のピックアップ';

    const weeklyLink = document.createElement('a');
    weeklyLink.href = '#/weekly';
    weeklyLink.className = 'section-subtitle';
    weeklyLink.textContent = '週刊まとめを見る →';

    headRow.append(h2, weeklyLink);

    const pickupGrid = document.createElement('div');
    pickupGrid.className = 'pickup-grid';
    pickupPosts.slice(0, 3).forEach((post) => {
      pickupGrid.appendChild(createPromptCard(post, { sortBy: 'published-desc' }));
    });

    pickupSec.append(headRow, pickupGrid);
    container.appendChild(pickupSec);
  }

  // 4. Filter Panel (Category, Style, Model, Prompt Language, Tag, Sort)
  const configuredCategories = Array.isArray(siteConfig?.categories) ? siteConfig.categories : [];
  const presentCategories = new Set(posts.map((p) => p.category).filter(Boolean));
  if (filters.category) presentCategories.add(filters.category);
  const categories = [
    ...configuredCategories.filter((cat) => presentCategories.has(cat)),
    ...[...presentCategories]
      .filter((cat) => !configuredCategories.includes(cat))
      .sort((a, b) => a.localeCompare(b, 'ja')),
  ];

  const styleOptions = Object.keys(POST_STYLES).map((code) => ({
    value: code,
    label: getStyleLabel(code),
  }));

  const models = [...new Set(posts.map((p) => p.model).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'ja')
  );

  const presentLangSet = new Set(posts.map((p) => p.promptLanguage || 'other'));
  if (filters.language) presentLangSet.add(filters.language);
  const languageOptions = Object.keys(PROMPT_LANGUAGES)
    .filter((code) => presentLangSet.has(code))
    .map((code) => ({ value: code, label: getPromptLanguageLabel(code) }));

  const tagCounts = new Map();
  posts.forEach((p) => {
    (Array.isArray(p.tags) ? p.tags : []).forEach((t) => {
      tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
    });
  });
  const sortedTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ja'))
    .map(([tag]) => tag);

  const activeSort = normalizeSortKey(filters.sort);
  const filtered = sortPosts(
    posts.filter((p) => {
      if (filters.category && p.category !== filters.category) return false;
      if (filters.style && (p.style || 'other') !== filters.style) return false;
      if (filters.model && p.model !== filters.model) return false;
      if (filters.language && (p.promptLanguage || 'other') !== filters.language) return false;
      if (filters.tag && !(Array.isArray(p.tags) && p.tags.includes(filters.tag))) return false;
      return true;
    }),
    activeSort
  );

  const filterPanel = document.createElement('section');
  filterPanel.className = 'filter-panel';
  filterPanel.setAttribute('aria-label', '一覧の絞り込み・並べ替え');

  const controls = document.createElement('div');
  controls.className = 'filter-controls';

  controls.append(
    createSelectField({
      id: 'filter-category',
      label: 'カテゴリ',
      value: filters.category,
      options: categories,
      allLabel: 'すべてのカテゴリ',
      onChange: (value) => onFilterChange({ ...filters, category: value }),
    }),
    createSelectField({
      id: 'filter-style',
      label: '作風',
      value: filters.style,
      options: styleOptions,
      allLabel: 'すべての作風',
      onChange: (value) => onFilterChange({ ...filters, style: value }),
    }),
    createSelectField({
      id: 'filter-model',
      label: '対応モデル',
      value: filters.model,
      options: models,
      allLabel: 'すべてのモデル',
      onChange: (value) => onFilterChange({ ...filters, model: value }),
    }),
    createSelectField({
      id: 'filter-language',
      label: 'プロンプト言語',
      value: filters.language,
      options: languageOptions,
      allLabel: 'すべての言語',
      onChange: (value) => onFilterChange({ ...filters, language: value }),
    }),
    createSortField({
      value: activeSort,
      onChange: (value) => onFilterChange({ ...filters, sort: value }),
    })
  );

  filterPanel.appendChild(controls);

  if (sortedTags.length > 0) {
    const tagRibbon = document.createElement('div');
    tagRibbon.className = 'tag-ribbon';
    tagRibbon.setAttribute('role', 'group');
    tagRibbon.setAttribute('aria-label', 'タグで絞り込み');

    const ribbonLabel = document.createElement('span');
    ribbonLabel.className = 'tag-ribbon-label';
    ribbonLabel.textContent = 'タグ:';
    tagRibbon.appendChild(ribbonLabel);

    sortedTags.forEach((tag) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tag-chip';
      const isSelected = filters.tag === tag;
      btn.setAttribute('aria-pressed', String(isSelected));
      btn.textContent = `#${tag}`;
      btn.addEventListener('click', () => {
        onFilterChange({ ...filters, tag: isSelected ? '' : tag });
      });
      tagRibbon.appendChild(btn);
    });

    filterPanel.appendChild(tagRibbon);
  }

  const metaRow = document.createElement('div');
  metaRow.className = 'filter-meta-row';

  const countSpan = document.createElement('span');
  countSpan.className = 'filter-count';
  const strongCount = document.createElement('strong');
  strongCount.textContent = `${filtered.length}件`;
  countSpan.append(
    document.createTextNode('表示中: '),
    strongCount,
    document.createTextNode(` / 全${posts.length}件（プロンプト本文は保持しないため、カテゴリ・作風・モデル・プロンプト言語・タグで絞り込めます）`)
  );
  metaRow.appendChild(countSpan);

  if (hasActiveFilter) {
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'btn btn--ghost btn--sm';
    resetBtn.textContent = '絞り込みを解除';
    resetBtn.addEventListener('click', () => {
      onFilterChange({ category: '', style: '', model: '', language: '', tag: '', sort: activeSort });
    });
    metaRow.appendChild(resetBtn);
  }

  filterPanel.appendChild(metaRow);
  container.appendChild(filterPanel);

  // 5. Main Card Grid
  const listHeadingRow = document.createElement('div');
  listHeadingRow.className = 'section-heading-row';
  const listH2 = document.createElement('h2');
  listH2.className = 'section-title';
  listH2.textContent = hasActiveFilter ? '絞り込み結果' : 'ギャラリー一覧';

  const activeSortOption = SORT_OPTIONS.find((opt) => opt.value === activeSort) || SORT_OPTIONS[0];
  const sortSub = document.createElement('span');
  sortSub.className = 'section-subtitle';
  sortSub.textContent = `並び順：${activeSortOption.label}`;

  listHeadingRow.append(listH2, sortSub);
  container.appendChild(listHeadingRow);

  if (filtered.length === 0) {
    const noMatch = document.createElement('div');
    noMatch.className = 'empty-state-card';

    const h = document.createElement('h2');
    h.textContent = '条件に一致する掲載がありません';
    const p = document.createElement('p');
    p.textContent = '絞り込み条件を変更するか、条件を解除して一覧をご覧ください。';

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'btn btn--primary';
    resetBtn.textContent = 'すべての絞り込みを解除';
    resetBtn.addEventListener('click', () => {
      onFilterChange({ category: '', style: '', model: '', language: '', tag: '', sort: activeSort });
    });

    noMatch.append(h, p, resetBtn);
    container.appendChild(noMatch);
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'gallery-grid';
  const fragment = document.createDocumentFragment();
  filtered.forEach((post) => {
    fragment.appendChild(createPromptCard(post, { sortBy: activeSort }));
  });
  grid.appendChild(fragment);
  container.appendChild(grid);
}

function createSelectField({ id, label, value, options, allLabel, onChange }) {
  const wrap = document.createElement('div');
  wrap.className = 'filter-field';

  const labelEl = document.createElement('label');
  labelEl.className = 'filter-label';
  labelEl.htmlFor = id;
  labelEl.textContent = label;

  const select = document.createElement('select');
  select.className = 'filter-select';
  select.id = id;

  const allOpt = document.createElement('option');
  allOpt.value = '';
  allOpt.textContent = allLabel;
  select.appendChild(allOpt);

  options.forEach((optItem) => {
    const opt = document.createElement('option');
    if (typeof optItem === 'string') {
      opt.value = optItem;
      opt.textContent = optItem;
    } else {
      opt.value = optItem.value;
      opt.textContent = optItem.label;
    }
    select.appendChild(opt);
  });

  select.value = value || '';
  select.addEventListener('change', () => onChange(select.value));

  wrap.append(labelEl, select);
  return wrap;
}

function createSortField({ value, onChange }) {
  const wrap = document.createElement('div');
  wrap.className = 'filter-field';

  const labelEl = document.createElement('label');
  labelEl.className = 'filter-label';
  labelEl.htmlFor = 'filter-sort';
  labelEl.textContent = '並び順';

  const select = document.createElement('select');
  select.className = 'filter-select';
  select.id = 'filter-sort';

  SORT_OPTIONS.forEach((item) => {
    const opt = document.createElement('option');
    opt.value = item.value;
    opt.textContent = item.label;
    select.appendChild(opt);
  });

  select.value = normalizeSortKey(value);
  select.addEventListener('change', () => onChange(select.value));

  wrap.append(labelEl, select);
  return wrap;
}
