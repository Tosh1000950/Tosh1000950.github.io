/**
 * Static informational views defined in SPEC §4.4, §5.1, §10:
 * - About (#/about): Three-way-win declaration, Never-do list, Curation policy, Removal policy
 * - Submit (#/submit): Self-nomination / listing request guide
 * - Removal (#/removal): Removal / correction request guide (3 required fields only, 24h SLA)
 */

import { getSafeHttpsUrl } from '../url-utils.js';

/**
 * Render About View (#/about).
 */
export function renderAboutView({ container, siteConfig }) {
  container.innerHTML = '';

  const shell = document.createElement('div');
  shell.className = 'prose-shell';

  const header = document.createElement('header');
  header.className = 'page-header';
  const h1 = document.createElement('h1');
  h1.className = 'page-title';
  h1.textContent = 'このサイトについて';
  const lead = document.createElement('p');
  lead.className = 'page-lead';
  lead.textContent =
    siteConfig?.tagline ||
    '画像もプロンプトも抜きません。一次ソースはXに置いたまま、作者のポストに返します。';
  header.append(h1, lead);
  shell.appendChild(header);

  // 1. Three-Way-Win Declaration
  const threeWayCard = document.createElement('section');
  threeWayCard.className = 'content-card';
  const h2Three = document.createElement('h2');
  h2Three.textContent = '三方良しの宣言';
  const pThree = document.createElement('p');
  pThree.textContent =
    '本サイトは「利用者」「プロンプト作者」「運営者」の3者すべてに価値が返る設計だけを前提に運営します。どれか1つでも損なう機能は実装しません。';

  const grid = document.createElement('div');
  grid.className = 'three-way-grid';

  const pillars = [
    [
      '利用者のWin',
      '大きな画像から直感的に選び、日本語タイトル・要約・対応モデル・プロンプトの場所案内で迷わず元ポストにたどり着けます。',
    ],
    [
      'プロンプト作者のWin',
      'サイトは画像もプロンプトも保持しません。プロンプトを見に行く行動そのものが作者の元ポストへの訪問・反応・フォローにつながります。',
    ],
    [
      '運営者のWin',
      'プロンプト転記の保守や権利トラブルを構造的に発生させず、持続可能な運用と「作者に返すサイト」という信頼を積み上げます。',
    ],
  ];

  pillars.forEach(([title, body]) => {
    const item = document.createElement('div');
    item.className = 'three-way-item';
    const h3 = document.createElement('h3');
    h3.textContent = title;
    const p = document.createElement('p');
    p.textContent = body;
    item.append(h3, p);
    grid.appendChild(item);
  });

  threeWayCard.append(h2Three, pThree, grid);
  shell.appendChild(threeWayCard);

  // 2. What We Never Do (SPEC §10)
  const neverCard = document.createElement('section');
  neverCard.className = 'content-card';
  const h2Never = document.createElement('h2');
  h2Never.textContent = '絶対にやらないこと';
  const neverList = document.createElement('ul');
  neverList.className = 'policy-list';

  const neverItems = [
    ['プロンプト本文の転記・コピーボタン設置：', 'プロンプト本文は1文字もサイトに保存しません。利用者はX上の元ポスト（またはツリーのリプライ）から直接参照します。'],
    ['画像の再ホスト・自前サムネイル保存：', 'リポジトリやサーバーに画像ファイルを置きません。表示はすべてX画像CDN（pbs.twimg.com）への直リンクのみで行います。'],
    ['X公式埋め込みの改変：', '埋め込みiframeを切り抜いて画像だけ見せたり、作者名や本文を隠したり、埋め込みの上にUIを重ねてクリックを奪うことは一切しません。'],
    ['スクレイピングによる自動大量収集：', '収集はすべて手作業でポストURLと画像URLを確認する方式を基本とします。'],
    ['作者・出典の軽視：', '作者名と@ハンドルは一覧と詳細の両方で明示し、作者別ビューおよびXプロフィールへの導線を設けます。'],
    ['自社ジェネレータへの誘導や低品質な大量掲載：', '件数競争はせず、バズ基準と価値の言語化を満たすポストだけを選定します。'],
    ['削除依頼の先送り：', '作者からの削除・修正依頼には原則24時間以内に一次対応し、削除依頼には区分なく即座に掲載を外します。'],
  ];

  neverItems.forEach(([bold, text]) => {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = bold;
    li.append(strong, document.createTextNode(text));
    neverList.appendChild(li);
  });

  neverCard.append(h2Never, neverList);
  shell.appendChild(neverCard);

  // 3. Curation & Search Scope Transparency
  const curationCard = document.createElement('section');
  curationCard.className = 'content-card';
  const h2Cur = document.createElement('h2');
  h2Cur.textContent = '収集方法・表示のしくみと制約の開示';
  const curList = document.createElement('ul');
  curList.className = 'policy-list';

  const curItems = [
    '一覧画面は軽快に絵で選べるよう直リンク画像カードで構成し、重いX公式埋め込み（widgets.js）は詳細を開いた瞬間にだけ遅延生成します。',
    'ツリー（自己リプライ）にプロンプトが記載されている場合は、詳細画面で「親ポスト」と「プロンプト記載リプライ」の両方の公式埋め込みを並べて案内します。',
    'プロンプト本文を保持しない設計のため、プロンプト本文の全文検索は仕様上対象外です。代わりに運営者が書く日本語タイトル・カテゴリ・対応モデル・タグ・1行要約で探せるようにしています。',
    '直リンク画像は元ポスト削除後もしばらく残る場合があるため、公式埋め込みが表示できなくなった掲載は定期チェックで検知し、一覧から下げる運用を徹底します。',
  ];

  curItems.forEach((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    curList.appendChild(li);
  });

  curationCard.append(h2Cur, curList);
  shell.appendChild(curationCard);

  // 4. Removal Policy & Operator Link
  const opCard = document.createElement('section');
  opCard.className = 'content-card';
  const h2Op = document.createElement('h2');
  h2Op.textContent = '削除ポリシーと運営者情報';
  const pOp1 = document.createElement('p');
  pOp1.textContent =
    '掲載の削除・表記修正をご希望の場合は、全ページ下部の「掲載削除・修正の依頼」よりご連絡ください。作者ご本人からの削除依頼は理由を問わず即座に対応します。';

  const actions = document.createElement('div');
  actions.className = 'manifesto-actions';

  const remLink = document.createElement('a');
  remLink.href = '#/removal';
  remLink.className = 'btn btn--outline';
  remLink.textContent = '掲載削除・修正の依頼ページへ';
  actions.appendChild(remLink);

  const hubUrl = getSafeHttpsUrl(siteConfig?.operatorHubUrl) || 'https://tosh1000950.github.io/';
  const hubLink = document.createElement('a');
  hubLink.href = hubUrl;
  hubLink.target = '_blank';
  hubLink.rel = 'noopener noreferrer';
  hubLink.className = 'btn btn--primary';
  hubLink.textContent = `${siteConfig?.operatorName || 'Tosh1'} トップページへ ↗`;
  actions.appendChild(hubLink);

  opCard.append(h2Op, pOp1, actions);
  shell.appendChild(opCard);

  container.appendChild(shell);
}

/**
 * Render Self-Nomination / Listing Request View (#/submit).
 */
export function renderSubmitView({ container, siteConfig }) {
  container.innerHTML = '';

  const shell = document.createElement('div');
  shell.className = 'prose-shell';

  const header = document.createElement('header');
  header.className = 'page-header';
  const h1 = document.createElement('h1');
  h1.className = 'page-title';
  h1.textContent = '自薦・掲載依頼の案内';
  const lead = document.createElement('p');
  lead.className = 'page-lead';
  lead.textContent =
    'プロンプト作者ご本人からの自薦を歓迎しています。掲載されたエントリからは、作者名・@ハンドル・X公式埋め込み・プロフィール導線を通じて元ポストへ直接アクセスが返ります。';
  header.append(h1, lead);
  shell.appendChild(header);

  const infoCard = document.createElement('section');
  infoCard.className = 'content-card';
  const h2 = document.createElement('h2');
  h2.textContent = 'お知らせいただきたい内容';
  const list = document.createElement('ul');
  list.className = 'policy-list';

  [
    '対象となるXの親ポストURL（画像が掲載されているポスト）',
    'プロンプトが記載されている場所（本文内／リプライのURL／引用先／ALTなど）',
    '使用した画像生成モデル名（例：Midjourney v7、FLUX、GPT Image など）',
    'アピールしたいポイントや応用メモ（任意）',
  ].forEach((txt) => {
    const li = document.createElement('li');
    li.textContent = txt;
    list.appendChild(li);
  });

  const note = document.createElement('p');
  note.style.marginTop = '0.9rem';
  note.textContent =
    '※ 掲載基準（画像とプロンプトの対応が確認できること、一般公開・全年齢向けであること等）を確認のうえ順次掲載します。';

  infoCard.append(h2, list, note);
  shell.appendChild(infoCard);

  // Contact channel (configurable in data/posts.json; clearly marked placeholder until decided)
  const contactCard = document.createElement('section');
  contactCard.className = 'content-card';
  const h2c = document.createElement('h2');
  h2c.textContent = '受付窓口';

  const subUrl = getSafeHttpsUrl(siteConfig?.contact?.submissionUrl);
  if (subUrl) {
    const p = document.createElement('p');
    p.textContent = '以下の受付窓口より自薦・掲載依頼をお送りいただけます。';
    const link = document.createElement('a');
    link.href = subUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'btn btn--accent';
    link.textContent = '自薦・掲載依頼を送る ↗';
    contactCard.append(h2c, p, link);
  } else {
    const callout = document.createElement('div');
    callout.className = 'placeholder-callout';
    const strong = document.createElement('strong');
    strong.textContent = '窓口設定待ち（仮置き）：';
    callout.append(
      strong,
      document.createTextNode(
        siteConfig?.contact?.submissionNote ||
          '自薦の受付方法（Xリプライ／専用フォーム／GitHub等）は運営者が最終決定のうえ、ここに設定します。'
      )
    );
    contactCard.append(h2c, callout);
  }

  shell.appendChild(contactCard);
  container.appendChild(shell);
}

/**
 * Render Removal / Correction Request View (#/removal).
 * Enforces SPEC §4.4: only 3 required items, 24h initial response SLA, immediate takedown for authors.
 */
export function renderRemovalView({ container, siteConfig, prefillPostUrl }) {
  container.innerHTML = '';

  const shell = document.createElement('div');
  shell.className = 'prose-shell';

  const header = document.createElement('header');
  header.className = 'page-header';
  const h1 = document.createElement('h1');
  h1.className = 'page-title';
  h1.textContent = '掲載削除・修正の依頼';
  const lead = document.createElement('p');
  lead.className = 'page-lead';
  lead.textContent =
    '作者ご本人からの掲載削除依頼には、理由や区分を問わず即座に掲載を外します。受付後は原則24時間以内に一次対応し、完了をご連絡します。';
  header.append(h1, lead);
  shell.appendChild(header);

  const reqCard = document.createElement('section');
  reqCard.className = 'content-card';
  const h2 = document.createElement('h2');
  h2.textContent = 'ご依頼時に必要な項目（3点のみ）';
  const p = document.createElement('p');
  p.textContent = 'お手間をかけないよう、必須項目は以下の3点だけに絞っています。';

  const ol = document.createElement('ol');
  ol.className = 'removal-items-list';

  const requiredItems = [
    ['対象ポストURL', '削除または修正を希望されるXポストのURL（または本サイトの該当URL）'],
    ['依頼者と作者の関係', '例：作者ご本人／代理人／一般利用者（リンク切れ報告等）'],
    ['希望する対応', '例：掲載の削除／作者名・モデル名・場所メモの修正'],
  ];

  requiredItems.forEach(([title, desc], idx) => {
    const li = document.createElement('li');
    const num = document.createElement('span');
    num.className = 'removal-step-num';
    num.textContent = String(idx + 1);
    const body = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = title;
    const br = document.createElement('br');
    body.append(strong, br, document.createTextNode(desc));
    li.append(num, body);
    ol.appendChild(li);
  });

  reqCard.append(h2, p, ol);

  if (prefillPostUrl) {
    const prefillBox = document.createElement('div');
    prefillBox.className = 'prefill-post-box';
    const label = document.createElement('strong');
    label.textContent = '指定された対象ポストURL：';
    prefillBox.append(label, document.createElement('br'), document.createTextNode(prefillPostUrl));
    reqCard.appendChild(prefillBox);
  }

  shell.appendChild(reqCard);

  // Contact destination (placeholder clearly marked until operator decides)
  const contactCard = document.createElement('section');
  contactCard.className = 'content-card';
  const h2c = document.createElement('h2');
  h2c.textContent = '依頼の送信先';

  const removalUrl = getSafeHttpsUrl(siteConfig?.contact?.removalUrl);
  const removalEmail =
    typeof siteConfig?.contact?.removalEmail === 'string' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(siteConfig.contact.removalEmail.trim())
      ? siteConfig.contact.removalEmail.trim()
      : null;

  if (removalUrl || removalEmail) {
    const actions = document.createElement('div');
    actions.className = 'manifesto-actions';

    if (removalUrl) {
      const formLink = document.createElement('a');
      formLink.href = removalUrl;
      formLink.target = '_blank';
      formLink.rel = 'noopener noreferrer';
      formLink.className = 'btn btn--primary';
      formLink.textContent = '削除・修正依頼フォームを開く ↗';
      actions.appendChild(formLink);
    }

    if (removalEmail) {
      const subject = encodeURIComponent('【掲載削除・修正依頼】');
      const bodyText = encodeURIComponent(
        `1. 対象ポストURL：${prefillPostUrl || ''}\n2. 依頼者と作者の関係：\n3. 希望する対応：\n`
      );
      const mailLink = document.createElement('a');
      mailLink.href = `mailto:${removalEmail}?subject=${subject}&body=${bodyText}`;
      mailLink.className = 'btn btn--outline';
      mailLink.textContent = `メールで依頼する（${removalEmail}）`;
      actions.appendChild(mailLink);
    }

    contactCard.append(h2c, actions);
  } else {
    const callout = document.createElement('div');
    callout.className = 'placeholder-callout';
    const strong = document.createElement('strong');
    strong.textContent = '連絡先設定待ち（仮置き）：';
    callout.append(
      strong,
      document.createTextNode(
        siteConfig?.contact?.removalNote ||
          '削除・修正依頼の受付先（専用フォームURL／メールアドレス／Xアカウント等）は運営者が決定後、data/posts.json に設定します。'
      )
    );
    contactCard.append(h2c, callout);
  }

  const autoNote = document.createElement('p');
  autoNote.style.marginTop = '1rem';
  autoNote.textContent =
    'なお、X上で元ポスト自体を削除された場合、詳細画面の公式埋め込みは自動で表示されなくなります。直リンク画像がキャッシュとして残るケースも定期チェックで検知し、一覧から速やかに除外します。';
  contactCard.appendChild(autoNote);

  shell.appendChild(contactCard);
  container.appendChild(shell);
}
