/**
 * Detail Modal View.
 *
 * Strictly enforces SPEC §4.1 & §4.2:
 * - Side-by-side layout: large direct-linked image (left/top) + unmodified official X embed(s) (right/bottom).
 * - Uses `name=large` for the main image and `name=small` for multi-image thumbnails.
 * - Lazily creates embeds via twttr.widgets.createTweet ONLY after the modal is visible in DOM.
 * - Thread-style support: when promptPostUrl differs from parentPostUrl, embeds BOTH parent post and prompt post.
 * - Displays clear Japanese prompt-location guidance and "Open on X" CTA button(s).
 * - ZERO prompt text stored/displayed, ZERO copy buttons, ZERO modifications or overlays on embeds.
 */

import { renderLazyTweetEmbed } from '../embed.js';
import {
  buildAuthorXUrl,
  buildPbsImageUrl,
  extractTweetId,
  formatDateJa,
  formatLikesExactJa,
  formatOriginalPostDateJa,
  getMediaTypeLabel,
  getPostMediaGallery,
  getPromptLanguageLabel,
  getPromptLocationLabel,
  getSafeXUrl,
  getStyleLabel,
  hasSeparatePromptPost,
  isValidLikesCount,
  isVideoPost,
  normalizeHandle,
} from '../url-utils.js';

let activeController = null;
let previouslyFocused = null;
let keydownHandler = null;
let currentEmbedRefreshFn = null;

/**
 * Open the accessible Detail Modal for a given post and lazily render its official X embed(s).
 */
export function openDetailModal({ overlayRoot, post, theme, onClose, onSelectTag }) {
  // Clean up any previous open session first
  teardownActiveSession();

  previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  activeController = new AbortController();
  const { signal } = activeController;

  overlayRoot.innerHTML = '';

  const dialog = document.createElement('div');
  dialog.className = 'detail-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'detail-modal-title');

  const safeParentUrl = getSafeXUrl(post.parentPostUrl);
  const safePromptUrl = getSafeXUrl(post.promptPostUrl) || safeParentUrl;
  const isThread = hasSeparatePromptPost(post);
  const isVideo = isVideoPost(post);

  // Sticky Header
  const header = document.createElement('div');
  header.className = 'detail-header';

  const headerLeft = document.createElement('div');
  headerLeft.className = 'detail-header-left';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'detail-close-btn';
  closeBtn.textContent = '← 一覧へ戻る';
  closeBtn.setAttribute('aria-label', '詳細を閉じて一覧へ戻る');
  closeBtn.addEventListener('click', () => onClose());

  const headerTitle = document.createElement('p');
  headerTitle.className = 'detail-header-title';
  headerTitle.textContent = post.title;

  headerLeft.append(closeBtn, headerTitle);
  header.appendChild(headerLeft);

  if (safePromptUrl) {
    const quickOpen = document.createElement('a');
    quickOpen.href = safePromptUrl;
    quickOpen.target = '_blank';
    quickOpen.rel = 'noopener noreferrer';
    quickOpen.className = 'btn btn--primary btn--sm';
    quickOpen.textContent = isThread ? 'Xでプロンプトを見る ↗' : 'Xで開く ↗';
    header.appendChild(quickOpen);
  }

  // Body & 2-Column Side-by-Side Layout
  const body = document.createElement('div');
  body.className = 'detail-body';

  const layout = document.createElement('div');
  layout.className = 'detail-layout';

  // ---------------- LEFT COLUMN: Large Direct-Linked Image / Video Thumbnail + Editorial Meta ----------------
  const leftCol = document.createElement('div');
  leftCol.className = 'detail-left';

  const mediaGallery = getPostMediaGallery(post);

  leftCol.appendChild(buildImageViewer(mediaGallery, post.title, { isVideo }));
  leftCol.appendChild(buildEditorialBlock(post, onSelectTag, onClose));

  // ---------------- RIGHT COLUMN: Prompt Location Guidance + Official X Embed(s) ----------------
  const rightCol = document.createElement('div');
  rightCol.className = 'detail-right';

  // Prompt Location Guidance Box (SPEC §4.2 & Rule 7)
  const guideCard = document.createElement('section');
  guideCard.className = 'prompt-guide-card';
  guideCard.setAttribute('aria-label', 'プロンプトの場所案内');

  const guideHead = document.createElement('div');
  guideHead.className = 'prompt-guide-head';

  const guideTitle = document.createElement('h2');
  guideTitle.className = 'prompt-guide-title';
  guideTitle.textContent = 'プロンプトの場所案内';

  const locBadge = document.createElement('span');
  locBadge.className = 'prompt-location-badge';
  locBadge.textContent = getPromptLocationLabel(post.promptLocationType);

  guideHead.append(guideTitle, locBadge);

  const locNote = document.createElement('p');
  locNote.className = 'prompt-location-note';
  locNote.textContent = post.promptLocationNote;

  const policyNote = document.createElement('p');
  policyNote.className = 'prompt-policy-note';
  policyNote.textContent =
    '※ 本サイトはプロンプト本文を転記・保存していません。下のX公式埋め込み、または「Xで開く」から作者の元ポストへ移動してご確認ください。';

  const ctaGroup = document.createElement('div');
  ctaGroup.className = 'prompt-cta-group';

  if (isThread && safePromptUrl) {
    const promptCta = document.createElement('a');
    promptCta.href = safePromptUrl;
    promptCta.target = '_blank';
    promptCta.rel = 'noopener noreferrer';
    promptCta.className = 'btn btn--primary';
    promptCta.textContent = 'Xでプロンプト記載ポストを開く ↗';
    ctaGroup.appendChild(promptCta);

    if (safeParentUrl) {
      const parentCta = document.createElement('a');
      parentCta.href = safeParentUrl;
      parentCta.target = '_blank';
      parentCta.rel = 'noopener noreferrer';
      parentCta.className = 'btn btn--outline';
      parentCta.textContent = 'Xで親ポストを開く ↗';
      ctaGroup.appendChild(parentCta);
    }
  } else if (safeParentUrl) {
    const openCta = document.createElement('a');
    openCta.href = safeParentUrl;
    openCta.target = '_blank';
    openCta.rel = 'noopener noreferrer';
    openCta.className = 'btn btn--primary';
    openCta.textContent = 'Xで開く ↗';
    ctaGroup.appendChild(openCta);
  }

  guideCard.append(guideHead, locNote, policyNote, ctaGroup);
  rightCol.appendChild(guideCard);

  // Official X Embed Section (unmodified, zero clipping, zero overlays)
  const embedSection = document.createElement('section');
  embedSection.className = 'embed-section';
  embedSection.setAttribute('aria-label', 'X公式埋め込み');

  const parentTweetId = extractTweetId(post.parentPostUrl);
  const promptTweetId = extractTweetId(post.promptPostUrl);

  const embedSlots = [];

  if (isThread) {
    const parentBlock = createEmbedBlock({
      label: isVideo
        ? 'X公式埋め込み ①：親ポスト（動画作品・ここで再生）'
        : 'X公式埋め込み ①：親ポスト（作品）',
      postUrl: safeParentUrl,
      slotTestId: 'embed-slot-parent',
    });
    const promptBlock = createEmbedBlock({
      label: 'X公式埋め込み ②：プロンプト記載ポスト',
      postUrl: safePromptUrl,
      slotTestId: 'embed-slot-prompt',
    });
    embedSection.append(parentBlock.block, promptBlock.block);
    embedSlots.push(
      {
        tweetId: parentTweetId,
        postUrl: safeParentUrl,
        slotElement: parentBlock.slot,
        hideParentConversation: false,
      },
      {
        tweetId: promptTweetId,
        postUrl: safePromptUrl,
        slotElement: promptBlock.slot,
        hideParentConversation: true,
      }
    );
  } else {
    const singleBlock = createEmbedBlock({
      label: isVideo ? 'X公式埋め込み（元ポスト・ここで動画再生）' : 'X公式埋め込み（元ポスト）',
      postUrl: safeParentUrl,
      slotTestId: 'embed-slot-parent',
    });
    embedSection.appendChild(singleBlock.block);
    embedSlots.push({
      tweetId: parentTweetId,
      postUrl: safeParentUrl,
      slotElement: singleBlock.slot,
      hideParentConversation: false,
    });
  }

  rightCol.appendChild(embedSection);

  // Removal / correction link at the bottom of the detail dialog (with concise EN marker per A+ Phase 1)
  const detailFooter = document.createElement('div');
  detailFooter.className = 'detail-footer-bar';
  const rightsNote = document.createElement('span');
  rightsNote.textContent = '画像・動画・プロンプトの権利は元の作者に帰属します。';

  const footerLinks = document.createElement('div');
  footerLinks.className = 'detail-footer-links';

  const removalLink = document.createElement('a');
  removalLink.href = safeParentUrl
    ? `#/removal?post=${encodeURIComponent(safeParentUrl)}`
    : '#/removal';
  removalLink.textContent = 'この掲載の削除・修正を依頼する';

  const removalEnLink = document.createElement('a');
  removalEnLink.className = 'detail-footer-en-link';
  removalEnLink.setAttribute('lang', 'en');
  removalEnLink.href = safeParentUrl
    ? `#/removal?post=${encodeURIComponent(safeParentUrl)}&lang=en`
    : '#/removal?lang=en';
  removalEnLink.textContent = 'Removal (EN)';
  removalEnLink.setAttribute('aria-label', 'Request removal or correction in English');

  footerLinks.append(removalLink, removalEnLink);
  detailFooter.append(rightsNote, footerLinks);

  layout.append(leftCol, rightCol);
  body.append(layout, detailFooter);
  dialog.append(header, body);
  overlayRoot.appendChild(dialog);

  // Backdrop click closes modal
  overlayRoot.onclick = (event) => {
    if (event.target === overlayRoot) {
      onClose();
    }
  };

  // ESC closes modal
  keydownHandler = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };
  document.addEventListener('keydown', keydownHandler);

  // STEP 1: Make the modal VISIBLE in the DOM FIRST (never render embeds in display:none!)
  overlayRoot.hidden = false;
  overlayRoot.setAttribute('aria-hidden', 'false');
  overlayRoot.scrollTop = 0;
  document.body.classList.add('modal-open');
  closeBtn.focus();

  // STEP 2: Now that the container is visible, lazily invoke twttr.widgets.createTweet
  const mountAllEmbeds = (embedTheme, activeSignal) => {
    embedSlots.forEach((entry) => {
      renderLazyTweetEmbed({
        tweetId: entry.tweetId,
        postUrl: entry.postUrl,
        slotElement: entry.slotElement,
        theme: embedTheme,
        hideParentConversation: entry.hideParentConversation,
        signal: activeSignal,
      });
    });
  };

  currentEmbedRefreshFn = (nextTheme) => {
    if (!activeController || activeController.signal.aborted) return;
    activeController.abort();
    activeController = new AbortController();
    mountAllEmbeds(nextTheme, activeController.signal);
  };

  mountAllEmbeds(theme, signal);
}

/**
 * Re-render embeds with the updated official X theme when the user toggles Dark/Light mode
 * while the detail view is open.
 * @param {'light' | 'dark'} nextTheme
 */
export function refreshDetailEmbedTheme(nextTheme) {
  if (typeof currentEmbedRefreshFn === 'function') {
    currentEmbedRefreshFn(nextTheme);
  }
}

/**
 * Close the Detail Modal and cleanly destroy all embed mount nodes.
 */
export function closeDetailModal(overlayRoot) {
  teardownActiveSession();
  overlayRoot.hidden = true;
  overlayRoot.setAttribute('aria-hidden', 'true');
  overlayRoot.innerHTML = '';
  overlayRoot.onclick = null;
  document.body.classList.remove('modal-open');

  if (previouslyFocused && previouslyFocused.isConnected) {
    previouslyFocused.focus();
  }
  previouslyFocused = null;
}

function teardownActiveSession() {
  if (activeController) {
    activeController.abort();
    activeController = null;
  }
  if (keydownHandler) {
    document.removeEventListener('keydown', keydownHandler);
    keydownHandler = null;
  }
  currentEmbedRefreshFn = null;
}

function createEmbedBlock({ label, postUrl, slotTestId }) {
  const block = document.createElement('div');
  block.className = 'embed-block';

  const head = document.createElement('div');
  head.className = 'embed-block-header';

  const heading = document.createElement('h3');
  heading.className = 'embed-block-label';
  heading.textContent = label;
  head.appendChild(heading);

  if (postUrl) {
    const direct = document.createElement('a');
    direct.className = 'embed-block-direct-link';
    direct.href = postUrl;
    direct.target = '_blank';
    direct.rel = 'noopener noreferrer';
    direct.textContent = 'Xで直接開く ↗';
    head.appendChild(direct);
  }

  const slot = document.createElement('div');
  slot.className = 'embed-slot';
  slot.dataset.embedSlot = slotTestId;

  block.append(head, slot);
  return { block, slot };
}

function buildImageViewer(images, fallbackTitle, { isVideo = false } = {}) {
  const frag = document.createDocumentFragment();
  let currentIndex = 0;

  const stage = document.createElement('div');
  stage.className = 'detail-image-stage';

  const counter = document.createElement('span');
  counter.className = 'detail-image-counter';

  const renderMainImage = (index) => {
    currentIndex = index;
    stage.innerHTML = '';

    const item = images[index];
    const largeUrl = item ? buildPbsImageUrl(item.url, 'large') : null;

    if (largeUrl) {
      const img = document.createElement('img');
      img.className = 'detail-main-img';
      img.src = largeUrl;
      img.alt = item.alt || fallbackTitle;
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => {
        img.remove();
        stage.appendChild(createDetailImageFallback(isVideo));
      });
      stage.appendChild(img);
    } else {
      stage.appendChild(createDetailImageFallback(isVideo));
    }

    if (isVideo) {
      const videoTag = document.createElement('span');
      videoTag.className = 'detail-video-badge';
      videoTag.textContent = '▶ 動画サムネイル';
      stage.appendChild(videoTag);
    }

    if (images.length > 1) {
      counter.textContent = `${index + 1} / ${images.length}`;
      stage.appendChild(counter);
    }
  };

  renderMainImage(0);
  frag.appendChild(stage);

  if (isVideo) {
    const videoNote = document.createElement('p');
    videoNote.className = 'detail-video-note';
    videoNote.textContent =
      '▶ 動画ポスト：動画の再生は右側（モバイルでは下）のX公式埋め込み内で行えます。本サイトは動画ファイルを保持・直接再生しません。';
    frag.appendChild(videoNote);
  }

  if (images.length > 1) {
    const thumbs = document.createElement('div');
    thumbs.className = 'detail-thumbs';
    thumbs.setAttribute('role', 'group');
    thumbs.setAttribute('aria-label', '画像の切り替え');

    const buttons = images.map((item, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'detail-thumb-btn';
      btn.setAttribute('aria-label', `画像 ${idx + 1} を表示`);
      btn.setAttribute('aria-pressed', String(idx === 0));

      const smallUrl = buildPbsImageUrl(item.url, 'small');
      if (smallUrl) {
        const thumbImg = document.createElement('img');
        thumbImg.src = smallUrl;
        thumbImg.alt = '';
        thumbImg.loading = 'lazy';
        thumbImg.referrerPolicy = 'no-referrer';
        btn.appendChild(thumbImg);
      }

      btn.addEventListener('click', () => {
        renderMainImage(idx);
        buttons.forEach((b, bIdx) => b.setAttribute('aria-pressed', String(bIdx === currentIndex)));
      });

      thumbs.appendChild(btn);
      return btn;
    });

    frag.appendChild(thumbs);
  }

  return frag;
}

function createDetailImageFallback(isVideo = false) {
  const wrap = document.createElement('div');
  wrap.className = 'card-img-fallback';
  wrap.style.position = 'static';
  wrap.style.minHeight = '240px';
  wrap.style.width = '100%';

  const title = document.createElement('span');
  title.className = 'card-img-fallback-title';
  title.textContent = isVideo
    ? '動画サムネイルを読み込めませんでした'
    : '直リンク画像を読み込めませんでした';

  const sub = document.createElement('span');
  sub.textContent = isVideo
    ? '右側のX公式埋め込みから動画を再生・確認するか、「Xで開く」をご利用ください。'
    : '元ポストの削除や通信状況により表示できない場合があります。右側の公式埋め込みまたは「Xで開く」をご確認ください。';

  wrap.append(title, sub);
  return wrap;
}

function buildEditorialBlock(post, onSelectTag, onClose) {
  const wrap = document.createElement('div');
  wrap.className = 'detail-editorial';

  const titleEl = document.createElement('h1');
  titleEl.id = 'detail-modal-title';
  titleEl.className = 'detail-title';
  titleEl.textContent = post.title;

  const summaryEl = document.createElement('p');
  summaryEl.className = 'detail-summary';
  summaryEl.textContent = post.summary;

  wrap.append(titleEl, summaryEl);

  // Optional Operator Guidance (SPEC §5.2 item 10)
  if (typeof post.guidance === 'string' && post.guidance.trim()) {
    const guidanceBox = document.createElement('div');
    guidanceBox.className = 'detail-guidance-box';

    const gLabel = document.createElement('p');
    gLabel.className = 'detail-guidance-label';
    gLabel.textContent = '運営者の応用メモ';

    const gText = document.createElement('p');
    gText.className = 'detail-guidance-text';
    gText.textContent = post.guidance.trim();

    guidanceBox.append(gLabel, gText);
    wrap.appendChild(guidanceBox);
  }

  // Author attribution card (SPEC §3.2)
  const handle = normalizeHandle(post.author?.handle);
  const authorXUrl = buildAuthorXUrl(handle);

  const authorCard = document.createElement('div');
  authorCard.className = 'detail-author-card';

  const authorInfo = document.createElement('div');
  authorInfo.className = 'detail-author-info';

  const kicker = document.createElement('span');
  kicker.className = 'detail-author-kicker';
  kicker.textContent = 'プロンプト作者';

  const authorName = document.createElement('span');
  authorName.className = 'detail-author-name';
  authorName.textContent = post.author?.name || (handle ? `@${handle}` : '作者情報');

  const authorHandle = document.createElement('span');
  authorHandle.className = 'detail-author-handle';
  authorHandle.textContent = handle ? `@${handle}` : '';

  authorInfo.append(kicker, authorName, authorHandle);

  const authorActions = document.createElement('div');
  authorActions.className = 'detail-author-actions';

  if (handle) {
    const siteAuthorLink = document.createElement('a');
    siteAuthorLink.href = `#/author/${encodeURIComponent(handle)}`;
    siteAuthorLink.className = 'btn btn--outline btn--sm';
    siteAuthorLink.textContent = 'この作者の掲載一覧';
    authorActions.appendChild(siteAuthorLink);
  }

  if (authorXUrl) {
    const xProfileLink = document.createElement('a');
    xProfileLink.href = authorXUrl;
    xProfileLink.target = '_blank';
    xProfileLink.rel = 'noopener noreferrer';
    xProfileLink.className = 'btn btn--primary btn--sm';
    xProfileLink.textContent = 'Xプロフィール ↗';
    authorActions.appendChild(xProfileLink);
  }

  authorCard.append(authorInfo, authorActions);
  wrap.appendChild(authorCard);

  // Meta info grid (SPEC §5.2 items 8, 9, 10, 11, 12 & 13)
  const dl = document.createElement('dl');
  dl.className = 'detail-meta-grid';

  const metaEntries = [
    ['対応モデル', post.model],
    ['カテゴリ', post.category],
    ['作風', getStyleLabel(post.style)],
    ['媒体', getMediaTypeLabel(post.mediaType)],
    ['プロンプト言語', getPromptLanguageLabel(post.promptLanguage)],
  ];
  if (isValidLikesCount(post.likesAtCuration)) {
    metaEntries.push(['収集時点のいいね数', `♥ ${formatLikesExactJa(post.likesAtCuration)}`]);
  }
  metaEntries.push(
    ['元の投稿日', formatOriginalPostDateJa(post.originalPostedAt, post.parentPostUrl)],
    ['掲載日', formatDateJa(post.publishedAt)]
  );
  if (typeof post.reactionNote === 'string' && post.reactionNote.trim()) {
    metaEntries.push(['収集時点の反応メモ', post.reactionNote.trim()]);
  }

  metaEntries.forEach(([dtText, ddText]) => {
    const item = document.createElement('div');
    item.className = 'detail-meta-item';
    const dt = document.createElement('dt');
    dt.textContent = dtText;
    const dd = document.createElement('dd');
    dd.textContent = ddText || '—';
    item.append(dt, dd);
    dl.appendChild(item);
  });

  wrap.appendChild(dl);

  // Clickable tags -> filters list view
  if (Array.isArray(post.tags) && post.tags.length > 0) {
    const tagsList = document.createElement('div');
    tagsList.className = 'detail-tags-list';

    post.tags.forEach((tag) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tag-chip';
      btn.textContent = `#${tag}`;
      btn.addEventListener('click', () => {
        onSelectTag(tag);
      });
      tagsList.appendChild(btn);
    });

    wrap.appendChild(tagsList);
  }

  return wrap;
}
