/**
 * List View & reusable Prompt Card component.
 *
 * Strictly adheres to SPEC §4.2:
 * - Displays large direct-linked X images (pbs.twimg.com) using `name=small/medium`.
 * - Overlays site's own UI (Japanese title, tags, author @handle, model, category) on cards.
 * - NEVER places official X embeds in the list view.
 * - Defaults to newest first (publishedAt descending).
 */

import {
  buildCardImageSrcSet,
  buildPbsImageUrl,
  formatDateJa,
  hasSeparatePromptPost,
  normalizeHandle,
  normalizeImageItem,
} from '../url-utils.js';

/**
 * Create a single direct-linked image card element (reused in List, Weekly, and Author views).
 * @param {object} post
 * @returns {HTMLElement}
 */
export function createPromptCard(post) {
  const article = document.createElement('article');
  article.className = 'prompt-card';
  article.dataset.postId = post.id;

  const images = (Array.isArray(post.images) ? post.images : [])
    .map((item) => normalizeImageItem(item, post.title))
    .filter(Boolean);
  const firstImage = images[0] || null;
  const mediumUrl = firstImage ? buildPbsImageUrl(firstImage.url, 'medium') : null;
  const srcSet = firstImage ? buildCardImageSrcSet(firstImage.url) : '';

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
    img.alt = firstImage.alt || post.title;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => {
      img.remove();
      mediaWrap.appendChild(createCardImageFallback());
    });
    mediaWrap.appendChild(img);
  } else {
    mediaWrap.appendChild(createCardImageFallback());
  }

  // Primary stretched link opens detail view (accessible keyboard + right-click support)
  const cardLink = document.createElement('a');
  cardLink.className = 'card-stretched-link';
  cardLink.href = `#/post/${encodeURIComponent(post.id)}`;
  cardLink.setAttribute('aria-label', `${post.title}（詳細とX公式埋め込みを見る）`);

  // Top overlay: model, category, multi-image / thread badges
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

  if (images.length > 1) {
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

  if (post.publishedAt) {
    const dateEl = document.createElement('span');
    dateEl.className = 'card-date';
    dateEl.textContent = formatDateJa(post.publishedAt);
    metaRow.appendChild(dateEl);
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

function createCardImageFallback() {
  const wrap = document.createElement('div');
  wrap.className = 'card-img-fallback';

  const title = document.createElement('span');
  title.className = 'card-img-fallback-title';
  title.textContent = '画像を読み込めませんでした';

  const sub = document.createElement('span');
  sub.textContent = '詳細からX元ポストを確認できます';

  wrap.append(title, sub);
  return wrap;
}

/**
 * Sort posts according to selected sort order (default: newest publishedAt first).
 * @param {Array<object>} posts
 * @param {'published' | 'original'} sortBy
 * @returns {Array<object>}
 */
export function sortPosts(posts, sortBy = 'published') {
  return [...posts].sort((a, b) => {
    const primaryA = sortBy === 'original' ? (a.originalPostedAt || '') : (a.publishedAt || '');
    const primaryB = sortBy === 'original' ? (b.originalPostedAt || '') : (b.publishedAt || '');
    if (primaryA !== primaryB) return primaryB.localeCompare(primaryA);

    const secondaryA = sortBy === 'original' ? (a.publishedAt || '') : (a.originalPostedAt || '');
    const secondaryB = sortBy === 'original' ? (b.publishedAt || '') : (b.originalPostedAt || '');
    if (secondaryA !== secondaryB) return secondaryB.localeCompare(secondaryA);

    return String(b.id || '').localeCompare(String(a.id || ''));
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
    '気になる画像をタップすると、大きな画像とX公式埋め込みを並べて表示。プロンプトの場所案内から元ポストへ迷わず辿れます。';

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

  const hasActiveFilter = Boolean(filters.category || filters.model || filters.tag);

  // 3. Weekly Pickup section (shown when no filters are active)
  const pickupPosts = sortPosts(posts.filter((p) => p.weeklyPickup === true), 'published');
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
      pickupGrid.appendChild(createPromptCard(post));
    });

    pickupSec.append(headRow, pickupGrid);
    container.appendChild(pickupSec);
  }

  // 4. Filter Panel (Category, Model, Tag, Sort)
  const categories = [...new Set(posts.map((p) => p.category).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'ja')
  );
  const models = [...new Set(posts.map((p) => p.model).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'ja')
  );
  const tagCounts = new Map();
  posts.forEach((p) => {
    (Array.isArray(p.tags) ? p.tags : []).forEach((t) => {
      tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
    });
  });
  const sortedTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ja'))
    .map(([tag]) => tag);

  const filtered = sortPosts(
    posts.filter((p) => {
      if (filters.category && p.category !== filters.category) return false;
      if (filters.model && p.model !== filters.model) return false;
      if (filters.tag && !(Array.isArray(p.tags) && p.tags.includes(filters.tag))) return false;
      return true;
    }),
    filters.sort
  );

  const filterPanel = document.createElement('section');
  filterPanel.className = 'filter-panel';
  filterPanel.setAttribute('aria-label', '一覧の絞り込み');

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
      id: 'filter-model',
      label: '対応モデル',
      value: filters.model,
      options: models,
      allLabel: 'すべてのモデル',
      onChange: (value) => onFilterChange({ ...filters, model: value }),
    }),
    createSortField({
      value: filters.sort,
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
    document.createTextNode(` / 全${posts.length}件（プロンプト本文は保持しないため、カテゴリ・モデル・タグで絞り込めます）`)
  );
  metaRow.appendChild(countSpan);

  if (hasActiveFilter) {
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'btn btn--ghost btn--sm';
    resetBtn.textContent = '絞り込みを解除';
    resetBtn.addEventListener('click', () => {
      onFilterChange({ category: '', model: '', tag: '', sort: filters.sort });
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
  listH2.textContent = hasActiveFilter ? '絞り込み結果' : '新着ギャラリー';
  listHeadingRow.appendChild(listH2);
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
      onFilterChange({ category: '', model: '', tag: '', sort: filters.sort });
    });

    noMatch.append(h, p, resetBtn);
    container.appendChild(noMatch);
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'gallery-grid';
  const fragment = document.createDocumentFragment();
  filtered.forEach((post) => {
    fragment.appendChild(createPromptCard(post));
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

  options.forEach((optVal) => {
    const opt = document.createElement('option');
    opt.value = optVal;
    opt.textContent = optVal;
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

  const opt1 = document.createElement('option');
  opt1.value = 'published';
  opt1.textContent = '新着順（掲載日）';

  const opt2 = document.createElement('option');
  opt2.value = 'original';
  opt2.textContent = '元ポスト投稿日順';

  select.append(opt1, opt2);
  select.value = value === 'original' ? 'original' : 'published';
  select.addEventListener('change', () => onChange(select.value));

  wrap.append(labelEl, select);
  return wrap;
}
