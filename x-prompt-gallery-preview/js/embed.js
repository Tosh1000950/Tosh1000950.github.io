/**
 * Official X (Twitter) lazy embed manager.
 *
 * Strictly enforces SPEC §4.1 & §4.2:
 * - Never pre-renders blockquotes inside hidden (display:none) elements.
 * - Loads platform.twitter.com/widgets.js lazily only when a detail view opens.
 * - Uses twttr.widgets.createTweet() inside visible DOM containers.
 * - Never crops, hides author/text, or overlays UI on top of embeds.
 * - Provides graceful fallback when an embed is unavailable (deleted post or tracker blocker).
 */

const WIDGETS_SCRIPT_SRC = 'https://platform.twitter.com/widgets.js';
const DEFAULT_LOAD_TIMEOUT_MS = 10000;

let widgetsLoadPromise = null;

/**
 * Ensure the official window.twttr queue stub exists and load widgets.js lazily.
 * @param {number} [timeoutMs=10000]
 * @returns {Promise<any>}
 */
export function loadTwitterWidgets(timeoutMs = DEFAULT_LOAD_TIMEOUT_MS) {
  if (window.twttr?.widgets?.createTweet) {
    return Promise.resolve(window.twttr);
  }
  if (widgetsLoadPromise) {
    return widgetsLoadPromise;
  }

  widgetsLoadPromise = new Promise((resolve, reject) => {
    let settled = false;
    const finishResolve = (twttr) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(twttr);
    };
    const finishReject = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      widgetsLoadPromise = null; // Allow user-triggered retry
      reject(err);
    };

    const timer = setTimeout(() => {
      finishReject(new Error('widgets.js の読み込みがタイムアウトしました'));
    }, timeoutMs);

    // Standard official twttr queue stub
    const existing = window.twttr || {};
    if (!Array.isArray(existing._e)) {
      existing._e = [];
    }
    if (typeof existing.ready !== 'function') {
      existing.ready = function ready(callback) {
        existing._e.push(callback);
      };
    }
    window.twttr = existing;

    window.twttr.ready((twttr) => {
      if (twttr?.widgets?.createTweet) {
        finishResolve(twttr);
      } else {
        finishReject(new Error('twttr.widgets.createTweet が利用できません'));
      }
    });

    const existingScript = document.querySelector(`script[src="${WIDGETS_SCRIPT_SRC}"]`);
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = WIDGETS_SCRIPT_SRC;
      script.async = true;
      script.charset = 'utf-8';
      script.onerror = () => {
        script.remove();
        finishReject(new Error('X公式埋め込みスクリプトを読み込めませんでした'));
      };
      document.head.appendChild(script);
    }
  });

  return widgetsLoadPromise;
}

/**
 * Wait for one animation frame so freshly shown detail containers have committed layout.
 * @returns {Promise<void>}
 */
function nextAnimationFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/**
 * Create a single unmodified official X tweet embed lazily inside a visible container.
 *
 * @param {object} params
 * @param {string} params.tweetId - Numeric tweet/post ID
 * @param {string} params.postUrl - Direct https://x.com/... URL for fallback CTA
 * @param {HTMLElement} params.slotElement - Visible container element for this embed block
 * @param {'light' | 'dark'} [params.theme='light'] - Official createTweet theme option
 * @param {boolean} [params.hideParentConversation=false] - Uses official `conversation: 'none'` for the 2nd embed in thread view so the parent post is not duplicated
 * @param {AbortSignal} [params.signal] - Aborts stale renders when modal closes/changes
 * @returns {Promise<'loaded' | 'unavailable' | 'blocked' | 'aborted'>}
 */
export async function renderLazyTweetEmbed({
  tweetId,
  postUrl,
  slotElement,
  theme = 'light',
  hideParentConversation = false,
  signal,
}) {
  if (!slotElement || signal?.aborted) return 'aborted';

  slotElement.innerHTML = '';

  const loadingBox = document.createElement('div');
  loadingBox.className = 'embed-status embed-status--loading';
  loadingBox.setAttribute('role', 'status');
  loadingBox.innerHTML = `
    <span class="embed-spinner" aria-hidden="true"></span>
    <span>X公式埋め込みを読み込んでいます…</span>
  `;

  const mountTarget = document.createElement('div');
  mountTarget.className = 'embed-mount';

  slotElement.append(loadingBox, mountTarget);

  if (!tweetId) {
    loadingBox.remove();
    renderFallback(slotElement, {
      reason: 'invalid',
      postUrl,
    });
    return 'unavailable';
  }

  // Wait one frame to guarantee the modal/detail view is visible before widgets.js measures width
  await nextAnimationFrame();
  if (signal?.aborted || !slotElement.isConnected) return 'aborted';

  let twttr;
  try {
    twttr = await loadTwitterWidgets();
  } catch {
    if (signal?.aborted || !slotElement.isConnected) return 'aborted';
    loadingBox.remove();
    renderFallback(slotElement, {
      reason: 'blocked',
      postUrl,
      onRetry: () =>
        renderLazyTweetEmbed({
          tweetId,
          postUrl,
          slotElement,
          theme,
          hideParentConversation,
          signal,
        }),
    });
    return 'blocked';
  }

  if (signal?.aborted || !slotElement.isConnected) return 'aborted';

  const options = {
    theme: theme === 'dark' ? 'dark' : 'light',
    lang: 'ja',
    dnt: true,
  };
  if (hideParentConversation) {
    options.conversation = 'none';
  }

  try {
    const embedEl = await twttr.widgets.createTweet(tweetId, mountTarget, options);

    if (signal?.aborted || !slotElement.isConnected) {
      mountTarget.innerHTML = '';
      return 'aborted';
    }

    loadingBox.remove();

    if (!embedEl) {
      // createTweet resolves to undefined when a post is deleted, suspended, or protected
      mountTarget.remove();
      renderFallback(slotElement, {
        reason: 'unavailable',
        postUrl,
      });
      return 'unavailable';
    }

    return 'loaded';
  } catch {
    if (signal?.aborted || !slotElement.isConnected) return 'aborted';
    loadingBox.remove();
    mountTarget.remove();
    renderFallback(slotElement, {
      reason: 'blocked',
      postUrl,
      onRetry: () =>
        renderLazyTweetEmbed({
          tweetId,
          postUrl,
          slotElement,
          theme,
          hideParentConversation,
          signal,
        }),
    });
    return 'blocked';
  }
}

/**
 * Render an accessible fallback box when an official embed cannot be displayed.
 * Ensures the detail view remains completely meaningful per SPEC §4.3 & §7.
 */
function renderFallback(slotElement, { reason, postUrl, onRetry }) {
  const box = document.createElement('div');
  box.className = 'embed-status embed-status--fallback';

  const heading = document.createElement('p');
  heading.className = 'embed-fallback-title';

  const desc = document.createElement('p');
  desc.className = 'embed-fallback-desc';

  if (reason === 'unavailable') {
    heading.textContent = 'このポストの公式埋め込みを表示できませんでした';
    desc.textContent =
      '元ポストが削除・非公開になった可能性があります。下のボタンからX上で確認できます（元ポスト削除が確認された掲載は順次一覧から下げます）。';
  } else if (reason === 'invalid') {
    heading.textContent = 'ポストURLの形式を確認できませんでした';
    desc.textContent = '下のボタンからX上で直接ご確認ください。';
  } else {
    heading.textContent = 'X公式埋め込みを読み込めませんでした';
    desc.textContent =
      'ブラウザのトラッキング防止機能や広告ブロッカー、または通信環境の影響で埋め込みが制限されている可能性があります。下のボタンからXで直接開けます。';
  }

  const actions = document.createElement('div');
  actions.className = 'embed-fallback-actions';

  if (postUrl) {
    const openLink = document.createElement('a');
    openLink.href = postUrl;
    openLink.target = '_blank';
    openLink.rel = 'noopener noreferrer';
    openLink.className = 'btn btn--primary btn--sm';
    openLink.textContent = 'Xでポストを開く ↗';
    actions.appendChild(openLink);
  }

  if (typeof onRetry === 'function') {
    const retryBtn = document.createElement('button');
    retryBtn.type = 'button';
    retryBtn.className = 'btn btn--ghost btn--sm';
    retryBtn.textContent = '埋め込みを再試行';
    retryBtn.addEventListener('click', onRetry);
    actions.appendChild(retryBtn);
  }

  box.append(heading, desc, actions);
  slotElement.appendChild(box);
}
