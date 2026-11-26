/**
 * Main application bootstrap, hash router, state management, and theme controller.
 * Pure static ES module app ready for GitHub Pages (zero backend, zero API, zero build step).
 */

import { getSafeHttpsUrl } from './url-utils.js';
import { renderAuthorDetailView, renderAuthorsDirectoryView } from './views/authors.js';
import { closeDetailModal, openDetailModal, refreshDetailEmbedTheme } from './views/detail.js';
import { renderListView } from './views/list.js';
import { renderAboutView, renderRemovalView, renderSubmitView } from './views/static-pages.js';
import { renderWeeklyView } from './views/weekly.js';

const DATA_URL = './data/posts.json';
const THEME_STORAGE_KEY = 'xpg-theme';

const state = {
  siteConfig: null,
  weeklyIssues: [],
  posts: [], // Strictly enabled === true records only
  filters: {
    category: '',
    style: '',
    model: '',
    language: '',
    tag: '',
    sort: 'original-desc',
  },
  lastNonPostHash: '#/',
  savedScrollY: 0,
  activePostId: null,
  theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
};

const dom = {
  main: document.getElementById('main-content'),
  overlayRoot: document.getElementById('detail-overlay-root'),
  brandTitle: document.getElementById('brand-title'),
  brandPlaceholderBadge: document.getElementById('brand-placeholder-badge'),
  footerBrandName: document.getElementById('footer-brand-name'),
  footerTagline: document.getElementById('footer-tagline'),
  footerHubLink: document.getElementById('footer-hub-link'),
  themeToggle: document.getElementById('theme-toggle'),
  themeToggleIcon: document.getElementById('theme-toggle-icon'),
  themeToggleLabel: document.getElementById('theme-toggle-label'),
  navLinks: [...document.querySelectorAll('.nav-link[data-route]')],
};

function initThemeController() {
  const syncThemeUI = () => {
    const isDark = state.theme === 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    dom.themeToggleIcon.textContent = isDark ? '☀' : '☾';
    dom.themeToggleLabel.textContent = isDark ? 'ライト' : 'ダーク';
    dom.themeToggle.setAttribute('aria-pressed', String(isDark));
  };

  syncThemeUI();

  dom.themeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(THEME_STORAGE_KEY, state.theme);
    } catch {
      // Ignore storage errors in restricted contexts
    }
    syncThemeUI();
    if (state.activePostId) {
      refreshDetailEmbedTheme(state.theme);
    }
  });
}

function applySiteConfig(config) {
  if (!config) return;
  const siteName = config.siteName || '【仮称】Xバズプロンプト図鑑';
  dom.brandTitle.textContent = siteName;
  dom.footerBrandName.textContent = siteName;

  if (dom.brandPlaceholderBadge) {
    dom.brandPlaceholderBadge.hidden = !config.isPlaceholderName;
  }

  if (config.tagline && dom.footerTagline) {
    dom.footerTagline.textContent = config.tagline;
  }

  const hubUrl = getSafeHttpsUrl(config.operatorHubUrl);
  if (hubUrl && dom.footerHubLink) {
    dom.footerHubLink.href = hubUrl;
    dom.footerHubLink.textContent = `${config.operatorName || 'Tosh1'} トップページ ↗`;
  }
}

function parseHashRoute(hashStr) {
  const cleaned = (hashStr || '#/').replace(/^#/, '');
  const [rawPath, rawQuery = ''] = cleaned.split('?');
  const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const segments = path.split('/').filter(Boolean).map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });
  const params = new URLSearchParams(rawQuery);
  return { segments, params, rawHash: hashStr || '#/' };
}

function updateNavCurrent(routeKey) {
  dom.navLinks.forEach((link) => {
    if (link.dataset.route === routeKey) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

function setDocumentTitle(pagePrefix) {
  const base = state.siteConfig?.siteName || '【仮称】Xバズプロンプト図鑑';
  document.title = pagePrefix ? `${pagePrefix} | ${base}` : base;
}

function renderBaseView(route) {
  const [first, second] = route.segments;

  if (!first) {
    updateNavCurrent('list');
    setDocumentTitle('');
    renderListView({
      container: dom.main,
      posts: state.posts,
      siteConfig: state.siteConfig,
      filters: state.filters,
      onFilterChange: (nextFilters) => {
        state.filters = nextFilters;
        renderBaseView({ segments: [], params: new URLSearchParams() });
      },
    });
    return;
  }

  if (first === 'weekly') {
    updateNavCurrent('weekly');
    setDocumentTitle('週刊まとめ');
    renderWeeklyView({
      container: dom.main,
      posts: state.posts,
      weeklyIssues: state.weeklyIssues,
    });
    return;
  }

  if (first === 'authors') {
    updateNavCurrent('authors');
    setDocumentTitle('作者別ビュー');
    renderAuthorsDirectoryView({
      container: dom.main,
      posts: state.posts,
    });
    return;
  }

  if (first === 'author' && second) {
    updateNavCurrent('authors');
    setDocumentTitle(`@${second}`);
    renderAuthorDetailView({
      container: dom.main,
      posts: state.posts,
      handleParam: second,
    });
    return;
  }

  if (first === 'about') {
    updateNavCurrent('about');
    setDocumentTitle('このサイトについて');
    renderAboutView({
      container: dom.main,
      siteConfig: state.siteConfig,
      initialLang: route.params.get('lang') === 'en' ? 'en' : 'ja',
    });
    return;
  }

  if (first === 'submit') {
    updateNavCurrent('submit');
    setDocumentTitle('自薦・掲載依頼');
    renderSubmitView({
      container: dom.main,
      siteConfig: state.siteConfig,
      initialLang: route.params.get('lang') === 'en' ? 'en' : 'ja',
    });
    return;
  }

  if (first === 'removal') {
    updateNavCurrent('');
    setDocumentTitle('掲載削除・修正の依頼');
    renderRemovalView({
      container: dom.main,
      siteConfig: state.siteConfig,
      prefillPostUrl: route.params.get('post') || '',
      initialLang: route.params.get('lang') === 'en' ? 'en' : 'ja',
    });
    return;
  }

  // Fallback for unknown hash path
  updateNavCurrent('');
  setDocumentTitle('ページが見つかりません');
  dom.main.innerHTML = '';
  const card = document.createElement('section');
  card.className = 'empty-state-card';
  const h1 = document.createElement('h1');
  h1.textContent = 'ページが見つかりませんでした';
  const p = document.createElement('p');
  p.textContent = 'URLをご確認のうえ、一覧ページへお戻りください。';
  const a = document.createElement('a');
  a.href = '#/';
  a.className = 'btn btn--primary';
  a.textContent = '一覧へ戻る';
  card.append(h1, p, a);
  dom.main.appendChild(card);
}

function handleRouteChange() {
  const route = parseHashRoute(window.location.hash);
  const [first, second] = route.segments;

  if (first === 'post' && second) {
    const post = state.posts.find((p) => p.id === second);

    // Ensure background view is rendered if user landed directly on #/post/<id>
    if (!dom.main.children.length || dom.main.querySelector('.loading-shell')) {
      renderBaseView(parseHashRoute(state.lastNonPostHash));
    }

    if (!post) {
      closeDetailModal(dom.overlayRoot);
      state.activePostId = null;
      updateNavCurrent('');
      setDocumentTitle('掲載が見つかりません');
      dom.main.innerHTML = '';
      const card = document.createElement('section');
      card.className = 'empty-state-card';
      const h1 = document.createElement('h1');
      h1.textContent = '該当する掲載が見つかりませんでした';
      const p = document.createElement('p');
      p.textContent =
        'この掲載は削除されたか、現在非公開になっています。一覧ページから他のプロンプトをご覧ください。';
      const a = document.createElement('a');
      a.href = '#/';
      a.className = 'btn btn--primary';
      a.textContent = '一覧へ戻る';
      card.append(h1, p, a);
      dom.main.appendChild(card);
      return;
    }

    if (!state.activePostId) {
      state.savedScrollY = window.scrollY;
    }
    state.activePostId = post.id;
    setDocumentTitle(post.title);
    openDetailModal({
      overlayRoot: dom.overlayRoot,
      post,
      theme: state.theme,
      onClose: () => {
        window.location.hash = state.lastNonPostHash || '#/';
      },
      onSelectTag: (tag) => {
        state.filters = { ...state.filters, tag };
        state.lastNonPostHash = '#/';
        state.savedScrollY = 0;
        if (window.location.hash === '#/') {
          closeDetailModal(dom.overlayRoot);
          state.activePostId = null;
          renderBaseView(parseHashRoute('#/'));
        } else {
          window.location.hash = '#/';
        }
      },
    });
    return;
  }

  // Non-post route: close detail modal if open
  const wasPostModal = Boolean(state.activePostId || !dom.overlayRoot.hidden);
  const returningToSameRoute = wasPostModal && (route.rawHash || '#/') === state.lastNonPostHash;
  if (wasPostModal) {
    closeDetailModal(dom.overlayRoot);
    state.activePostId = null;
  }

  state.lastNonPostHash = route.rawHash || '#/';
  renderBaseView(route);
  window.scrollTo({ top: returningToSameRoute ? state.savedScrollY : 0, behavior: 'auto' });
}

function renderFatalError(err) {
  dom.main.innerHTML = '';
  const card = document.createElement('section');
  card.className = 'empty-state-card';

  const h1 = document.createElement('h1');
  h1.textContent = 'データの読み込みに失敗しました';

  const p = document.createElement('p');
  const isFileProtocol = window.location.protocol === 'file:';
  p.textContent = isFileProtocol
    ? 'ローカルファイルを直接開いているためブラウザの制約で data/posts.json を読み込めませんでした。簡易HTTPサーバー（例: python -m http.server 8000）経由で開いてください。'
    : `data/posts.json の取得中にエラーが発生しました（${err?.message || '不明なエラー'}）。しばらく経ってから再読み込みしてください。`;

  card.append(h1, p);
  dom.main.appendChild(card);
}

async function bootstrap() {
  initThemeController();

  try {
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    state.siteConfig = data.siteConfig || {};
    state.weeklyIssues = Array.isArray(data.weeklyIssues) ? data.weeklyIssues : [];
    // Strictly include ONLY enabled === true records (never display template/test/disabled items)
    state.posts = (Array.isArray(data.posts) ? data.posts : []).filter(
      (post) => post && post.enabled === true
    );

    applySiteConfig(state.siteConfig);
    window.addEventListener('hashchange', handleRouteChange);
    handleRouteChange();
  } catch (err) {
    renderFatalError(err);
  }
}

bootstrap();
