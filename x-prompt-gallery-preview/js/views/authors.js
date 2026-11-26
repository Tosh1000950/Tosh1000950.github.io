/**
 * Author Directory (#/authors) and Author Detail View (#/author/<handle>).
 * Groups curated works by author and prominently routes visitors to the author's X profile (SPEC §3.2 & §5.1).
 */

import { buildAuthorXUrl, normalizeHandle } from '../url-utils.js';
import { createPromptCard, sortPosts } from './list.js';

/**
 * Group enabled posts by lowercased normalized handle.
 * @param {Array<object>} posts
 * @returns {Array<{ handle: string, name: string, posts: Array<object> }>}
 */
function groupByAuthor(posts) {
  const map = new Map();
  sortPosts(posts, 'published').forEach((post) => {
    const handle = normalizeHandle(post.author?.handle);
    if (!handle) return;
    const key = handle.toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        handle,
        name: post.author?.name || `@${handle}`,
        posts: [],
      });
    }
    map.get(key).posts.push(post);
  });
  return [...map.values()].sort(
    (a, b) => b.posts.length - a.posts.length || a.handle.localeCompare(b.handle, 'en')
  );
}

/**
 * Render Authors Directory (#/authors).
 */
export function renderAuthorsDirectoryView({ container, posts }) {
  container.innerHTML = '';

  const header = document.createElement('header');
  header.className = 'page-header';
  const h1 = document.createElement('h1');
  h1.className = 'page-title';
  h1.textContent = '作者別ビュー';
  const lead = document.createElement('p');
  lead.className = 'page-lead';
  lead.textContent =
    '同一作者の掲載をまとめて閲覧できます。気に入った表現を見つけたら、ぜひ作者のXプロフィールをフォローして最新作も追いかけてみてください。';
  header.append(h1, lead);
  container.appendChild(header);

  const authors = groupByAuthor(posts);
  if (authors.length === 0) {
    const empty = document.createElement('section');
    empty.className = 'empty-state-card';
    const h2 = document.createElement('h2');
    h2.textContent = 'まだ公開された掲載がありません';
    const p = document.createElement('p');
    p.textContent = '初回掲載が公開されると、ここに作者ごとの一覧が自動でまとまります。';
    const back = document.createElement('a');
    back.href = '#/';
    back.className = 'btn btn--primary';
    back.textContent = 'トップページへ戻る';
    empty.append(h2, p, back);
    container.appendChild(empty);
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'authors-grid';

  authors.forEach((author) => {
    const card = document.createElement('article');
    card.className = 'author-directory-card';

    const head = document.createElement('div');
    head.className = 'author-directory-head';

    const titleWrap = document.createElement('div');
    const nameEl = document.createElement('h2');
    nameEl.className = 'author-directory-name';
    nameEl.textContent = author.name;
    const handleEl = document.createElement('p');
    handleEl.className = 'author-directory-handle';
    handleEl.textContent = `@${author.handle}`;
    titleWrap.append(nameEl, handleEl);

    const countPill = document.createElement('span');
    countPill.className = 'author-count-pill';
    countPill.textContent = `${author.posts.length}件`;

    head.append(titleWrap, countPill);

    const actions = document.createElement('div');
    actions.className = 'author-directory-actions';

    const viewBtn = document.createElement('a');
    viewBtn.href = `#/author/${encodeURIComponent(author.handle)}`;
    viewBtn.className = 'btn btn--outline btn--sm';
    viewBtn.textContent = '掲載一覧を見る';
    actions.appendChild(viewBtn);

    const xUrl = buildAuthorXUrl(author.handle);
    if (xUrl) {
      const xBtn = document.createElement('a');
      xBtn.href = xUrl;
      xBtn.target = '_blank';
      xBtn.rel = 'noopener noreferrer';
      xBtn.className = 'btn btn--primary btn--sm';
      xBtn.textContent = 'Xプロフィール ↗';
      actions.appendChild(xBtn);
    }

    card.append(head, actions);
    grid.appendChild(card);
  });

  container.appendChild(grid);
}

/**
 * Render single Author View (#/author/<handle>).
 */
export function renderAuthorDetailView({ container, posts, handleParam }) {
  container.innerHTML = '';

  const target = normalizeHandle(handleParam).toLowerCase();
  const matched = sortPosts(
    posts.filter((p) => normalizeHandle(p.author?.handle).toLowerCase() === target),
    'published'
  );

  if (matched.length === 0) {
    const empty = document.createElement('section');
    empty.className = 'empty-state-card';
    const h1 = document.createElement('h1');
    h1.textContent = `@${normalizeHandle(handleParam) || '不明'} の公開掲載は見つかりませんでした`;
    const p = document.createElement('p');
    p.textContent = '該当する作者の公開中エントリがありません。一覧または作者別ビューへお戻りください。';
    const actions = document.createElement('div');
    actions.className = 'empty-state-actions';
    const a1 = document.createElement('a');
    a1.href = '#/authors';
    a1.className = 'btn btn--outline';
    a1.textContent = '作者一覧へ';
    const a2 = document.createElement('a');
    a2.href = '#/';
    a2.className = 'btn btn--primary';
    a2.textContent = 'トップへ戻る';
    actions.append(a1, a2);
    empty.append(h1, p, actions);
    container.appendChild(empty);
    return;
  }

  const primaryHandle = normalizeHandle(matched[0].author?.handle);
  const authorName = matched[0].author?.name || `@${primaryHandle}`;
  const xUrl = buildAuthorXUrl(primaryHandle);

  const hero = document.createElement('section');
  hero.className = 'author-hero';

  const heroInfo = document.createElement('div');
  const h1 = document.createElement('h1');
  h1.className = 'page-title';
  h1.textContent = authorName;

  const handleP = document.createElement('p');
  handleP.className = 'author-hero-handle';
  handleP.textContent = `@${primaryHandle} ・ 掲載 ${matched.length}件`;

  heroInfo.append(h1, handleP);

  const heroActions = document.createElement('div');
  heroActions.className = 'manifesto-actions';

  if (xUrl) {
    const xBtn = document.createElement('a');
    xBtn.href = xUrl;
    xBtn.target = '_blank';
    xBtn.rel = 'noopener noreferrer';
    xBtn.className = 'btn btn--primary';
    xBtn.textContent = `Xで @${primaryHandle} を見る ↗`;
    heroActions.appendChild(xBtn);
  }

  const backBtn = document.createElement('a');
  backBtn.href = '#/authors';
  backBtn.className = 'btn btn--outline';
  backBtn.textContent = '← 作者一覧へ';
  heroActions.appendChild(backBtn);

  hero.append(heroInfo, heroActions);
  container.appendChild(hero);

  const grid = document.createElement('div');
  grid.className = 'gallery-grid';
  matched.forEach((post) => grid.appendChild(createPromptCard(post)));
  container.appendChild(grid);
}
