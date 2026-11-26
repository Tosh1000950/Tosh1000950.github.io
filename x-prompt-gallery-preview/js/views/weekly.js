/**
 * Weekly Digest View (#/weekly).
 * Groups enabled entries by weeklyIssue (or ISO week of publishedAt) per SPEC §5.1 & §6.3.
 */

import { formatDateJa, formatWeekKeyJa, getIsoWeekKey } from '../url-utils.js';
import { createPromptCard, sortPosts } from './list.js';

export function renderWeeklyView({ container, posts, weeklyIssues }) {
  container.innerHTML = '';

  const header = document.createElement('header');
  header.className = 'page-header';
  const h1 = document.createElement('h1');
  h1.className = 'page-title';
  h1.textContent = '週刊まとめ';
  const lead = document.createElement('p');
  lead.className = 'page-lead';
  lead.textContent =
    'その週に話題になった画像生成プロンプトを週単位で振り返れるまとめページです。過去の膨大な在庫ではなく「今週の鮮度」を大切にしています。';
  header.append(h1, lead);
  container.appendChild(header);

  if (posts.length === 0) {
    const empty = document.createElement('section');
    empty.className = 'empty-state-card';
    const h2 = document.createElement('h2');
    h2.textContent = '第1号の準備を進めています';
    const p = document.createElement('p');
    p.textContent =
      '初期掲載（20〜30件）の公開後、週10〜20件のペースでその週のまとめを更新していく予定です。';
    const back = document.createElement('a');
    back.href = '#/';
    back.className = 'btn btn--primary';
    back.textContent = '一覧へ戻る';
    empty.append(h2, p, back);
    container.appendChild(empty);
    return;
  }

  const issueMetaMap = new Map();
  (Array.isArray(weeklyIssues) ? weeklyIssues : []).forEach((issue) => {
    if (issue?.enabled === true && issue.issueId) {
      issueMetaMap.set(issue.issueId, issue);
    }
  });

  const grouped = new Map();
  sortPosts(posts, 'published').forEach((post) => {
    const key = post.weeklyIssue || getIsoWeekKey(post.publishedAt);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(post);
  });

  const sortedWeekKeys = [...grouped.keys()].sort((a, b) => b.localeCompare(a));

  sortedWeekKeys.forEach((weekKey) => {
    const weekPosts = grouped.get(weekKey);
    const meta = issueMetaMap.get(weekKey);

    const block = document.createElement('section');
    block.className = 'weekly-issue-block';

    const issueHeader = document.createElement('div');
    issueHeader.className = 'weekly-issue-header';

    const kicker = document.createElement('span');
    kicker.className = 'weekly-issue-kicker';
    kicker.textContent = meta?.publishedAt
      ? `${weekKey} ・ 公開 ${formatDateJa(meta.publishedAt)} ・ ${weekPosts.length}件`
      : `${weekKey} ・ ${weekPosts.length}件`;

    const title = document.createElement('h2');
    title.className = 'weekly-issue-title';
    title.textContent = meta?.title || `${formatWeekKeyJa(weekKey)}の掲載まとめ`;

    issueHeader.append(kicker, title);

    if (meta?.intro) {
      const intro = document.createElement('p');
      intro.className = 'weekly-issue-intro';
      intro.textContent = meta.intro;
      issueHeader.appendChild(intro);
    }

    const grid = document.createElement('div');
    grid.className = 'gallery-grid';
    weekPosts.forEach((post) => grid.appendChild(createPromptCard(post)));

    block.append(issueHeader, grid);
    container.appendChild(block);
  });
}
