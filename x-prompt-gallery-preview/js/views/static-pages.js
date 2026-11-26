/**
 * Static informational views defined in SPEC v2.1 (§4.4, §5.1, §10) and A+ Phase 1 (UI_LANGUAGE_OPINION §5.1):
 * - About (#/about): Three-way-win declaration, Never-do list, Curation & video policy, Removal policy (JA + EN)
 * - Submit (#/submit): Self-nomination / listing request guide (JA + EN)
 * - Removal (#/removal): v2.1 Verification-code flow (3 steps, bio/DM alternatives, post-deletion auto-delist,
 *   no email-only/screenshot-only claims, minimal 3 required fields, 72h SLA) (JA + EN)
 *
 * Language toggle is strictly scoped to these 3 static pages only (NOT a general i18n framework).
 */

import { getSafeHttpsUrl } from '../url-utils.js';

function getSafeEmail(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : null;
}

/**
 * Helper: mount a static page with a simple, consistent in-page JA / EN toggle.
 */
function mountStaticPage({ container, initialLang = 'ja', renderJa, renderEn }) {
  let currentLang = initialLang === 'en' ? 'en' : 'ja';

  const render = () => {
    container.innerHTML = '';

    const shell = document.createElement('div');
    shell.className = 'prose-shell';
    if (currentLang === 'en') {
      shell.setAttribute('lang', 'en');
    }

    const langToggle = document.createElement('div');
    langToggle.className = 'page-lang-toggle';
    langToggle.setAttribute('role', 'group');
    langToggle.setAttribute('aria-label', 'ページ表示言語 / Page Language');

    const jaBtn = document.createElement('button');
    jaBtn.type = 'button';
    jaBtn.className = 'page-lang-btn';
    jaBtn.textContent = '日本語';
    jaBtn.setAttribute('aria-pressed', String(currentLang === 'ja'));
    jaBtn.addEventListener('click', () => {
      if (currentLang !== 'ja') {
        currentLang = 'ja';
        render();
      }
    });

    const enBtn = document.createElement('button');
    enBtn.type = 'button';
    enBtn.className = 'page-lang-btn';
    enBtn.setAttribute('lang', 'en');
    enBtn.textContent = 'English';
    enBtn.setAttribute('aria-pressed', String(currentLang === 'en'));
    enBtn.addEventListener('click', () => {
      if (currentLang !== 'en') {
        currentLang = 'en';
        render();
      }
    });

    langToggle.append(jaBtn, enBtn);

    if (currentLang === 'en') {
      renderEn(shell, langToggle);
    } else {
      renderJa(shell, langToggle);
    }

    container.appendChild(shell);
  };

  render();
}

function createPageHeader({ title, lead, langToggle }) {
  const header = document.createElement('header');
  header.className = 'page-header';

  const topRow = document.createElement('div');
  topRow.className = 'page-header-row';

  const h1 = document.createElement('h1');
  h1.className = 'page-title';
  h1.textContent = title;

  topRow.append(h1, langToggle);

  const leadEl = document.createElement('p');
  leadEl.className = 'page-lead';
  leadEl.textContent = lead;

  header.append(topRow, leadEl);
  return header;
}

function createInlineCode(text) {
  const code = document.createElement('code');
  code.className = 'inline-code';
  code.textContent = text;
  return code;
}

/* ==========================================================================
   #/about — Policy & Three-Way-Win Declaration (JA + EN)
   ========================================================================== */

export function renderAboutView({ container, siteConfig, initialLang = 'ja' }) {
  const hubUrl = getSafeHttpsUrl(siteConfig?.operatorHubUrl) || 'https://tosh1000950.github.io/';
  const operatorName = siteConfig?.operatorName || 'Tosh1';

  mountStaticPage({
    container,
    initialLang,
    renderJa: (shell, langToggle) => {
      shell.appendChild(
        createPageHeader({
          title: 'このサイトについて',
          lead:
            siteConfig?.tagline ||
            '画像もプロンプトも抜きません。一次ソースはXに置いたまま、作者のポストに返します。',
          langToggle,
        })
      );

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
          '大きな画像・動画サムネイルから直感的に選び、日本語タイトル・要約・作風・対応モデル・プロンプト言語・場所案内で迷わず元ポストにたどり着けます。',
        ],
        [
          'プロンプト作者のWin',
          'サイトは画像・動画もプロンプトも保持しません。プロンプト確認や動画再生の行動そのものが作者の元ポストへの訪問・反応・フォローにつながります。',
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
        [
          'プロンプト本文の転記・コピーボタン設置：',
          'プロンプト本文は言語を問わず1文字もサイトに保存しません。利用者はX上の元ポスト（またはツリーのリプライ）から直接参照します。',
        ],
        [
          '画像・動画の再ホストや動画の直接再生：',
          'リポジトリやサーバーに画像・動画ファイルを置きません。表示はすべてX画像CDN（pbs.twimg.com）への直リンクのみで行い、動画再生は詳細画面のX公式埋め込み内だけに委ねます。',
        ],
        [
          'X公式埋め込みの改変：',
          '埋め込みiframeを切り抜いて画像だけ見せたり、作者名や本文を隠したり、埋め込みの上にUIを重ねてクリックを奪うことは一切しません。',
        ],
        [
          'スクレイピングによる自動大量収集：',
          '収集はすべて手作業で一次ポストURLと画像・サムネイルURLを確認する方式を基本とします。',
        ],
        [
          '作者・出典の軽視：',
          '作者名と@ハンドルは一覧と詳細の両方で明示し、作者別ビューおよびXプロフィールへの導線を設けます。',
        ],
        [
          '自社ジェネレータへの誘導や低品質な大量掲載：',
          '件数競争はせず、バズ基準と価値の言語化を満たすポストだけを選定します。',
        ],
        [
          '削除依頼の先送り：',
          '確認コード方式で作者ご本人と照合でき次第、理由を問わず速やかに掲載を外します（一次対応は遅くとも72時間以内を目安）。',
        ],
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

      // 3. Curation, Video & Search Scope Transparency
      const curationCard = document.createElement('section');
      curationCard.className = 'content-card';
      const h2Cur = document.createElement('h2');
      h2Cur.textContent = '収集方法・表示のしくみと制約の開示';
      const curList = document.createElement('ul');
      curList.className = 'policy-list';

      const curItems = [
        '一覧画面は軽快に絵で選べるよう直リンク画像・動画サムネイルのカードで構成し、重いX公式埋め込み（widgets.js）は詳細を開いた瞬間にだけ遅延生成します。',
        '動画ポストは一覧ではサムネイル画像（pbs.twimg.com 直リンク）＋▶バッジで表示し、再生は詳細画面のX公式埋め込みの中だけで行います。',
        '日本語だけでなく英語・中国語・韓国語などの海外バズプロンプトも一次ポストを確認のうえ掲載対象とし、一覧の「プロンプト言語」で絞り込めます。',
        'ツリー（自己リプライ）にプロンプトが記載されている場合は、詳細画面で「親ポスト」と「プロンプト記載リプライ」の両方の公式埋め込みを並べて案内します。',
        'プロンプト本文を保持しない設計のため、プロンプト本文の全文検索は仕様上対象外です。代わりに運営者が書く日本語タイトル・固定カテゴリ・作風・対応モデル・プロンプト言語・タグ・1行要約での絞り込みや、元の投稿日・収集時点のいいね数・掲載日での並べ替えに対応しています。',
        '直リンク画像は元ポスト削除後もしばらく残る場合があるため、公式埋め込みが表示できなくなった掲載は定期チェックで検知し、一覧から自動的に下げる運用を徹底します。',
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
        '掲載の削除・表記修正をご希望の場合は、全ページ下部の「掲載削除・修正の依頼」よりご連絡ください。なりすまし防止のための確認コード方式により本人確認を行い、一致が確認でき次第速やかに取り下げます。';

      const actions = document.createElement('div');
      actions.className = 'manifesto-actions';

      const remLink = document.createElement('a');
      remLink.href = '#/removal';
      remLink.className = 'btn btn--outline';
      remLink.textContent = '掲載削除・修正の依頼ページへ';
      actions.appendChild(remLink);

      const hubLink = document.createElement('a');
      hubLink.href = hubUrl;
      hubLink.target = '_blank';
      hubLink.rel = 'noopener noreferrer';
      hubLink.className = 'btn btn--primary';
      hubLink.textContent = `${operatorName} トップページへ ↗`;
      actions.appendChild(hubLink);

      opCard.append(h2Op, pOp1, actions);
      shell.appendChild(opCard);
    },

    renderEn: (shell, langToggle) => {
      shell.appendChild(
        createPageHeader({
          title: 'About This Site (For Creators)',
          lead:
            'We never copy prompts and never re-host images or videos. The original X post stays the single source of truth, and every visitor is sent back to the creator.',
          langToggle,
        })
      );

      // 1. Three-Way-Win Summary
      const threeCard = document.createElement('section');
      threeCard.className = 'content-card';
      const h2Three = document.createElement('h2');
      h2Three.textContent = 'Our "Three-Way-Win" Principle';
      const pThree = document.createElement('p');
      pThree.textContent =
        'This is a curated Japanese-language index of trending AI image and video generation prompts on X. Unlike aggregator sites that scrape and re-host work, we are built specifically to send Japanese readers, impressions, and followers back to your original X post.';

      const grid = document.createElement('div');
      grid.className = 'three-way-grid';
      [
        [
          'For Creators',
          'Zero prompt copying and zero media re-hosting. Anyone who wants your prompt or wants to play your video goes directly to your official X embed and X post.',
        ],
        [
          'For Visitors',
          'Visual discovery with short Japanese editorial titles, summaries, visual styles, model names, prompt language tags, and clear notes on where the prompt lives in your thread.',
        ],
        [
          'For the Curator',
          'Lightweight static curation focused on freshness and creator trust rather than competing on bulk volume.',
        ],
      ].forEach(([title, body]) => {
        const item = document.createElement('div');
        item.className = 'three-way-item';
        const h3 = document.createElement('h3');
        h3.textContent = title;
        const p = document.createElement('p');
        p.textContent = body;
        item.append(h3, p);
        grid.appendChild(item);
      });

      threeCard.append(h2Three, pThree, grid);
      shell.appendChild(threeCard);

      // 2. What We Never Do
      const neverCard = document.createElement('section');
      neverCard.className = 'content-card';
      const h2Never = document.createElement('h2');
      h2Never.textContent = 'What We Never Do';
      const neverList = document.createElement('ul');
      neverList.className = 'policy-list';

      [
        [
          'No prompt text copying or copy buttons: ',
          'We store zero prompt text in any language. Visitors read and copy prompts directly from your original X post or reply.',
        ],
        [
          'No image or video re-hosting: ',
          'Zero media files are stored in our repository or servers. Gallery cards link directly to X CDN images/thumbnails (pbs.twimg.com), and video posts play exclusively inside X’s official embed.',
        ],
        [
          'No modified X embeds: ',
          'We never crop embeds, hide author names or post text, or place clickable overlays on top of X’s official iframe.',
        ],
        [
          'No automated bulk scraping: ',
          'Listings are manually curated from public primary X posts, with prominent credit to your name, @handle, and X profile.',
        ],
        [
          'No ignored takedowns: ',
          'Verified creator removal requests are honored promptly regardless of reason (initial response within 72 hours at most).',
        ],
      ].forEach(([bold, text]) => {
        const li = document.createElement('li');
        const strong = document.createElement('strong');
        strong.textContent = bold;
        li.append(strong, document.createTextNode(text));
        neverList.appendChild(li);
      });

      neverCard.append(h2Never, neverList);
      shell.appendChild(neverCard);

      // 3. Creator Links
      const actionCard = document.createElement('section');
      actionCard.className = 'content-card';
      const h2Act = document.createElement('h2');
      h2Act.textContent = 'Removal, Self-Nomination & Operator';
      const pAct = document.createElement('p');
      pAct.textContent =
        'All rights to images, videos, and prompts remain 100% with the original creators. Note that gallery UI and short editorial summaries are written in Japanese for our Japanese audience.';

      const actions = document.createElement('div');
      actions.className = 'manifesto-actions';

      const remBtn = document.createElement('a');
      remBtn.href = '#/removal?lang=en';
      remBtn.className = 'btn btn--outline';
      remBtn.textContent = 'Removal / Correction Request';

      const subBtn = document.createElement('a');
      subBtn.href = '#/submit?lang=en';
      subBtn.className = 'btn btn--accent';
      subBtn.textContent = 'Submit Your Own Post';

      const hubBtn = document.createElement('a');
      hubBtn.href = hubUrl;
      hubBtn.target = '_blank';
      hubBtn.rel = 'noopener noreferrer';
      hubBtn.className = 'btn btn--primary';
      hubBtn.textContent = `${operatorName} Hub ↗`;

      actions.append(remBtn, subBtn, hubBtn);
      actionCard.append(h2Act, pAct, actions);
      shell.appendChild(actionCard);
    },
  });
}

/* ==========================================================================
   #/submit — Self-Nomination / Listing Request Guide (JA + EN)
   ========================================================================== */

export function renderSubmitView({ container, siteConfig, initialLang = 'ja' }) {
  const subUrl = getSafeHttpsUrl(siteConfig?.contact?.submissionUrl);
  const subEmail =
    getSafeEmail(siteConfig?.contact?.submissionEmail) ||
    getSafeEmail(siteConfig?.contact?.removalEmail);

  mountStaticPage({
    container,
    initialLang,
    renderJa: (shell, langToggle) => {
      shell.appendChild(
        createPageHeader({
          title: '自薦・掲載依頼の案内',
          lead:
            'プロンプト作者ご本人からの自薦を歓迎しています。掲載されたエントリからは、作者名・@ハンドル・X公式埋め込み・プロフィール導線を通じて元ポストへ直接アクセスが返ります。',
          langToggle,
        })
      );

      const infoCard = document.createElement('section');
      infoCard.className = 'content-card';
      const h2 = document.createElement('h2');
      h2.textContent = 'お知らせいただきたい内容';
      const list = document.createElement('ul');
      list.className = 'policy-list';

      [
        '対象となるXの親ポストURL（画像または動画が掲載されているポスト）',
        'プロンプトが記載されている場所（本文内／リプライのURL／引用先／画像のALTなど）',
        '使用した生成モデル名（例：Midjourney v7、FLUX、GPT Image、Kling、Sora、Veo など）、作風（実写系／アニメ系／イラスト系／3D・CG系／ドット・ゲーム系／その他）、プロンプトの言語（日本語／英語／中国語／韓国語など）',
        'アピールしたいポイントや応用メモ（任意）',
      ].forEach((txt) => {
        const li = document.createElement('li');
        li.textContent = txt;
        list.appendChild(li);
      });

      const note = document.createElement('p');
      note.style.marginTop = '0.9rem';
      note.textContent =
        '※ 掲載基準（作品とプロンプトの対応が確認できること、一般公開・全年齢向けであること等）を確認のうえ順次掲載します。プロンプト本文の転記や画像・動画の再ホストは行いません。';

      infoCard.append(h2, list, note);
      shell.appendChild(infoCard);

      const contactCard = document.createElement('section');
      contactCard.className = 'content-card';
      const h2c = document.createElement('h2');
      h2c.textContent = '受付窓口（Webフォーム主窓口・メール補助）';

      const channelIntro = document.createElement('p');
      channelIntro.textContent =
        '自薦・掲載依頼は、必須項目を漏れなく受け取り週次便でスムーズに確認できる専用Webフォーム（Googleフォーム／項目ラベル日英併記）を主窓口としています。フォームが利用できない場合の補助連絡先としてメールも併記します。';

      const channelList = document.createElement('ul');
      channelList.className = 'policy-list';
      [
        [
          '主窓口：専用Webフォーム（Googleフォーム）：',
          '対象ポストURLやプロンプトの場所など必要事項を入力欄に沿って送信できます（項目ラベルに英語も併記）。',
        ],
        [
          '補助連絡先：メール：',
          'Webフォームを開けない場合などの補助窓口としてご利用いただけます。',
        ],
      ].forEach(([bold, text]) => {
        const li = document.createElement('li');
        const strong = document.createElement('strong');
        strong.textContent = bold;
        li.append(strong, document.createTextNode(text));
        channelList.appendChild(li);
      });

      contactCard.append(h2c, channelIntro, channelList);

      if (subUrl || subEmail) {
        const actions = document.createElement('div');
        actions.className = 'manifesto-actions';
        actions.style.marginTop = '1rem';

        if (subUrl) {
          const formLink = document.createElement('a');
          formLink.href = subUrl;
          formLink.target = '_blank';
          formLink.rel = 'noopener noreferrer';
          formLink.className = 'btn btn--accent';
          formLink.textContent = '専用Webフォーム（Googleフォーム）を開く ↗';
          actions.appendChild(formLink);
        }

        if (subEmail) {
          const subject = encodeURIComponent('【自薦・掲載依頼 / Prompt Submission】');
          const bodyText = encodeURIComponent(
            '1. 対象ポストURL / Parent Post URL：\n2. プロンプトの場所 / Prompt Location：\n3. 対応モデル・作風・言語 / Model, Style & Language：\n4. 補足メモ（任意）/ Optional Note：\n'
          );
          const mailLink = document.createElement('a');
          mailLink.href = `mailto:${subEmail}?subject=${subject}&body=${bodyText}`;
          mailLink.className = 'btn btn--outline';
          mailLink.textContent = `補助連絡先：メールで送る（${subEmail}）`;
          actions.appendChild(mailLink);
        }

        contactCard.appendChild(actions);
      }

      if (!subUrl) {
        const callout = document.createElement('div');
        callout.className = 'placeholder-callout';
        callout.style.marginTop = '1rem';
        const strong = document.createElement('strong');
        strong.textContent = subEmail
          ? 'GoogleフォームURL設定待ち（仮置き）：'
          : 'GoogleフォームURL・補助メール設定待ち（仮置き）：';
        callout.append(
          strong,
          document.createTextNode(
            siteConfig?.contact?.submissionNote ||
              '主窓口となるGoogleフォームは公開準備時に運営者のGoogleアカウントで作成し、data/posts.json の siteConfig.contact に設定する予定です（設定後、ここにフォームへの直接リンクが表示されます）。'
          )
        );
        contactCard.appendChild(callout);
      }

      shell.appendChild(contactCard);
    },

    renderEn: (shell, langToggle) => {
      shell.appendChild(
        createPageHeader({
          title: 'Submit Your Prompt Post',
          lead:
            'Self-nominations from creators worldwide are welcome (English, Japanese, Chinese, Korean, and other prompt languages). We never copy your prompt or re-host your media — visitors go directly to your X post and profile.',
          langToggle,
        })
      );

      const infoCard = document.createElement('section');
      infoCard.className = 'content-card';
      const h2 = document.createElement('h2');
      h2.textContent = 'What to Include';
      const list = document.createElement('ul');
      list.className = 'policy-list';

      [
        'Target X parent post URL (public image or video post)',
        'Where the prompt is posted (post body, self-reply URL, quote post, image ALT, etc.)',
        'Generation model used (e.g., Midjourney, FLUX, GPT Image, Kling, Sora, Veo), visual style (photorealistic / anime / illustration / 3D & CG / pixel & game / other), and prompt language',
        'Optional highlight or customization tip (we will write a short Japanese title & summary for Japanese readers)',
      ].forEach((txt) => {
        const li = document.createElement('li');
        li.textContent = txt;
        list.appendChild(li);
      });

      const note = document.createElement('p');
      note.style.marginTop = '0.9rem';
      note.textContent =
        'Note: Submissions are reviewed manually in our weekly batch to confirm that the prompt is publicly accessible on X, matches the media, and is suitable for a general all-ages audience.';

      infoCard.append(h2, list, note);
      shell.appendChild(infoCard);

      const contactCard = document.createElement('section');
      contactCard.className = 'content-card';
      const h2c = document.createElement('h2');
      h2c.textContent = 'Submission Channel (Web Form Primary, Email Secondary)';

      const channelIntro = document.createElement('p');
      channelIntro.textContent =
        'Our primary intake channel is a dedicated Web Form (Google Forms, with bilingual Japanese/English field labels) so all required details are captured cleanly for weekly curation. Email is provided as a secondary fallback contact.';

      const channelList = document.createElement('ul');
      channelList.className = 'policy-list';
      [
        [
          'Primary intake — Web Form (Google Forms): ',
          'Recommended for fast, structured submissions with short English labels alongside Japanese.',
        ],
        [
          'Secondary contact — Email: ',
          'Available as a fallback if you are unable to open or submit the web form.',
        ],
      ].forEach(([bold, text]) => {
        const li = document.createElement('li');
        const strong = document.createElement('strong');
        strong.textContent = bold;
        li.append(strong, document.createTextNode(text));
        channelList.appendChild(li);
      });

      contactCard.append(h2c, channelIntro, channelList);

      if (subUrl || subEmail) {
        const actions = document.createElement('div');
        actions.className = 'manifesto-actions';
        actions.style.marginTop = '1rem';

        if (subUrl) {
          const formLink = document.createElement('a');
          formLink.href = subUrl;
          formLink.target = '_blank';
          formLink.rel = 'noopener noreferrer';
          formLink.className = 'btn btn--accent';
          formLink.textContent = 'Open Submission Form (Google Forms) ↗';
          actions.appendChild(formLink);
        }

        if (subEmail) {
          const subject = encodeURIComponent('[Prompt Submission] X Prompt Gallery');
          const bodyText = encodeURIComponent(
            '1. Parent Post URL: \n2. Prompt Location: \n3. Model, Style & Prompt Language: \n4. Optional Note: \n'
          );
          const mailLink = document.createElement('a');
          mailLink.href = `mailto:${subEmail}?subject=${subject}&body=${bodyText}`;
          mailLink.className = 'btn btn--outline';
          mailLink.textContent = `Secondary Contact: Email (${subEmail})`;
          actions.appendChild(mailLink);
        }

        contactCard.appendChild(actions);
      }

      if (!subUrl) {
        const callout = document.createElement('div');
        callout.className = 'placeholder-callout';
        callout.style.marginTop = '1rem';
        const strong = document.createElement('strong');
        strong.textContent = subEmail
          ? 'Google Form URL pending setup (placeholder): '
          : 'Google Form URL & secondary email pending setup (placeholder): ';
        callout.append(
          strong,
          document.createTextNode(
            'The operator will create the bilingual Google Form during launch preparation and configure its URL (plus secondary email) in data/posts.json (siteConfig.contact). Direct links will appear here once configured.'
          )
        );
        contactCard.appendChild(callout);
      }

      shell.appendChild(contactCard);
    },
  });
}

/* ==========================================================================
   #/removal — v2.1 Verification-Code Removal Flow (SPEC §4.4, JA + EN)
   ========================================================================== */

export function renderRemovalView({ container, siteConfig, prefillPostUrl, initialLang = 'ja' }) {
  const operatorName = siteConfig?.operatorName || 'Tosh1';
  const removalUrl = getSafeHttpsUrl(siteConfig?.contact?.removalUrl);
  const removalEmail = getSafeEmail(siteConfig?.contact?.removalEmail);

  mountStaticPage({
    container,
    initialLang,
    renderJa: (shell, langToggle) => {
      shell.appendChild(
        createPageHeader({
          title: '掲載削除・修正の依頼',
          lead:
            '作者ご本人からの掲載削除依頼には理由を問わず速やかに対応します。Xログイン基盤は設けず、なりすまし防止のための「確認コード方式」で本人確認を行います。処理は定期便でまとめて行い、一次対応は遅くとも72時間以内を目安とし完了をご連絡します。',
          langToggle,
        })
      );

      // 1. 3-Step Verification-Code Flow (Primary)
      const flowCard = document.createElement('section');
      flowCard.className = 'content-card';
      const h2Flow = document.createElement('h2');
      h2Flow.textContent = '本人確認の手順（確認コード方式・3ステップ）';
      const pFlow = document.createElement('p');
      pFlow.textContent =
        '元ポストを投稿したXアカウントご本人であることを安全かつ確実に確認するため、以下の3ステップで進めます。';

      const stepsOl = document.createElement('ol');
      stepsOl.className = 'removal-items-list';

      // Step 1
      const step1 = document.createElement('li');
      const num1 = document.createElement('span');
      num1.className = 'removal-step-num';
      num1.textContent = '1';
      const body1 = document.createElement('div');
      const strong1 = document.createElement('strong');
      strong1.textContent = '対象ポストURLを送信し、確認コードを受け取る';
      body1.append(
        strong1,
        document.createElement('br'),
        document.createTextNode('下の専用Webフォーム（Googleフォーム）または補助連絡先メールから対象ポストURLをお送りいただくと、確認コード（例：'),
        createInlineCode('xpg-del-XXXX'),
        document.createTextNode('）を発行してお伝えします。')
      );
      step1.append(num1, body1);

      // Step 2
      const step2 = document.createElement('li');
      const num2 = document.createElement('span');
      num2.className = 'removal-step-num';
      num2.textContent = '2';
      const body2 = document.createElement('div');
      const strong2 = document.createElement('strong');
      strong2.textContent = '確認コードを自分の元ポストへのリプライに投稿する';
      body2.append(
        strong2,
        document.createElement('br'),
        document.createTextNode(
          '受け取ったコードを、ご自身の元ポストへのリプライとして投稿してください。そのアカウントでしか投稿できない行為が確実な本人証明になります（取り下げ完了後、リプライは削除して構いません）。'
        )
      );
      step2.append(num2, body2);

      // Step 3
      const step3 = document.createElement('li');
      const num3 = document.createElement('span');
      num3.className = 'removal-step-num';
      num3.textContent = '3';
      const body3 = document.createElement('div');
      const strong3 = document.createElement('strong');
      strong3.textContent = '運営が照合し、掲載を取り下げて完了をご連絡';
      body3.append(
        strong3,
        document.createElement('br'),
        document.createTextNode(
          '運営（エージェントAI）が確認コードの掲載と、投稿アカウントが掲載レコードの作者と一致することを照合し、一致したら速やかに掲載を取り下げ、完了を依頼者へお伝えします。'
        )
      );
      step3.append(num3, body3);

      stepsOl.append(step1, step2, step3);
      flowCard.append(h2Flow, pFlow, stepsOl);
      shell.appendChild(flowCard);

      // 2. Alternatives, Auto-delist via post deletion/lock, and Rejected Methods
      const altCard = document.createElement('section');
      altCard.className = 'content-card';
      const h2Alt = document.createElement('h2');
      h2Alt.textContent = '代替手段・自動取り下げ・受け付けない確認方法';

      const h3Alt = document.createElement('h3');
      h3Alt.className = 'subsection-heading';
      h3Alt.textContent = '元ポストにリプライを付けたくない場合の代替手段（推奨順）';

      const altList = document.createElement('ul');
      altList.className = 'policy-list';
      [
        [
          'プロフィール欄（自己紹介）への一時的なコード掲載：',
          '投稿を汚したくない方向けの方法です。確認完了後はすぐに削除して構いません。',
        ],
        [
          `${operatorName} 宛DMでのコード送信（最終手段）：`,
          '非公開のまま確認できますが、運営者のDM確認が必要になるため最終手段としてご用意しています。',
        ],
      ].forEach(([bold, text]) => {
        const li = document.createElement('li');
        const strong = document.createElement('strong');
        strong.textContent = bold;
        li.append(strong, document.createTextNode(text));
        altList.appendChild(li);
      });

      const autoBox = document.createElement('div');
      autoBox.className = 'policy-callout policy-callout--info';
      const autoStrong = document.createElement('strong');
      autoStrong.textContent = '本人確認不要の即効手段（元ポストの削除・鍵垢化）：';
      autoBox.append(
        autoStrong,
        document.createTextNode(
          'X上で元ポスト自体を削除、またはアカウントを非公開（鍵アカウント）にすると、詳細画面のX公式埋め込みは自動的に表示できなくなります。定期の生死チェックでこれを検知し、ご連絡・本人確認なしでも一覧から自動的に取り下げます。'
        )
      );

      const rejectBox = document.createElement('div');
      rejectBox.className = 'policy-callout policy-callout--danger';
      const rejectStrong = document.createElement('strong');
      rejectStrong.textContent = '採用していない確認方法：';
      rejectBox.append(
        rejectStrong,
        document.createTextNode(
          'メールアドレスの自称のみ、またはスクリーンショット提出のみによるご依頼は、第三者によるなりすましが成立するため受け付けていません。'
        )
      );

      altCard.append(h2Alt, h3Alt, altList, autoBox, rejectBox);
      shell.appendChild(altCard);

      // 3. Minimal Required Inputs (3 items only)
      const reqCard = document.createElement('section');
      reqCard.className = 'content-card';
      const h2Req = document.createElement('h2');
      h2Req.textContent = 'ご依頼時に必要な項目（最小限の3点のみ）';
      const pReq = document.createElement('p');
      pReq.textContent = 'お手間をかけないよう、必須項目は以下の3点だけに絞っています。';

      const reqOl = document.createElement('ol');
      reqOl.className = 'removal-items-list';
      [
        ['対象ポストURL', '削除または修正を希望されるXポストのURL'],
        ['希望する対応', '例：掲載の削除／作者名・モデル名・場所メモの修正'],
        [
          '確認コードの掲載先',
          '例：元ポストへのリプライ／プロフィール欄／DM（※初回のURL送信時はコード受領後にご共有ください）',
        ],
      ].forEach(([title, desc], idx) => {
        const li = document.createElement('li');
        const num = document.createElement('span');
        num.className = 'removal-step-num';
        num.textContent = String(idx + 1);
        const body = document.createElement('div');
        const strong = document.createElement('strong');
        strong.textContent = title;
        body.append(strong, document.createElement('br'), document.createTextNode(desc));
        li.append(num, body);
        reqOl.appendChild(li);
      });

      reqCard.append(h2Req, pReq, reqOl);

      if (prefillPostUrl) {
        const prefillBox = document.createElement('div');
        prefillBox.className = 'prefill-post-box';
        const label = document.createElement('strong');
        label.textContent = '指定された対象ポストURL：';
        prefillBox.append(label, document.createElement('br'), document.createTextNode(prefillPostUrl));
        reqCard.appendChild(prefillBox);
      }

      shell.appendChild(reqCard);

      // 4. Contact Destination (Primary: Google Forms, Secondary: Email)
      const contactCard = document.createElement('section');
      contactCard.className = 'content-card';
      const h2c = document.createElement('h2');
      h2c.textContent = '依頼の送信先（Webフォーム主窓口・メール補助）';

      const channelIntro = document.createElement('p');
      channelIntro.textContent =
        '必須3項目を漏れなく受け取り確認の往復を減らすため、専用Webフォーム（Googleフォーム／項目ラベル日英併記）を主窓口としています。フォームが利用できない場合の補助連絡先としてメールも併記します。';

      const channelList = document.createElement('ul');
      channelList.className = 'policy-list';
      [
        [
          '主窓口：専用Webフォーム（Googleフォーム）：',
          '対象ポストURL・希望する対応・確認コードの掲載先をフォームに沿って送信できます（項目ラベルに英語も併記）。',
        ],
        [
          '補助連絡先：メール：',
          'Webフォームが開けない場合などの補助窓口です（※メール自称のみでは本人確認とせず、確認コード方式の照合を行います）。',
        ],
      ].forEach(([bold, text]) => {
        const li = document.createElement('li');
        const strong = document.createElement('strong');
        strong.textContent = bold;
        li.append(strong, document.createTextNode(text));
        channelList.appendChild(li);
      });

      contactCard.append(h2c, channelIntro, channelList);

      if (removalUrl || removalEmail) {
        const actions = document.createElement('div');
        actions.className = 'manifesto-actions';
        actions.style.marginTop = '1rem';

        if (removalUrl) {
          const formLink = document.createElement('a');
          formLink.href = removalUrl;
          formLink.target = '_blank';
          formLink.rel = 'noopener noreferrer';
          formLink.className = 'btn btn--primary';
          formLink.textContent = '削除・修正依頼フォーム（Googleフォーム）を開く ↗';
          actions.appendChild(formLink);
        }

        if (removalEmail) {
          const subject = encodeURIComponent('【掲載削除・修正依頼 / Removal Request】');
          const bodyText = encodeURIComponent(
            `1. 対象ポストURL / Post URL：${prefillPostUrl || ''}\n2. 希望する対応 / Requested action：\n3. 確認コードの掲載先 / Where the code was posted：\n`
          );
          const mailLink = document.createElement('a');
          mailLink.href = `mailto:${removalEmail}?subject=${subject}&body=${bodyText}`;
          mailLink.className = 'btn btn--outline';
          mailLink.textContent = `補助連絡先：メールで依頼する（${removalEmail}）`;
          actions.appendChild(mailLink);
        }

        contactCard.appendChild(actions);
      }

      if (!removalUrl) {
        const callout = document.createElement('div');
        callout.className = 'placeholder-callout';
        callout.style.marginTop = '1rem';
        const strong = document.createElement('strong');
        strong.textContent = removalEmail
          ? 'GoogleフォームURL設定待ち（仮置き）：'
          : 'GoogleフォームURL・補助メール設定待ち（仮置き）：';
        callout.append(
          strong,
          document.createTextNode(
            siteConfig?.contact?.removalNote ||
              '主窓口となるGoogleフォームは公開準備時に運営者のGoogleアカウントで作成し、data/posts.json の siteConfig.contact に設定する予定です（設定後、ここにフォームへの直接リンクが表示されます）。'
          )
        );
        contactCard.appendChild(callout);
      }

      shell.appendChild(contactCard);
    },

    renderEn: (shell, langToggle) => {
      shell.appendChild(
        createPageHeader({
          title: 'Removal & Correction Request',
          lead:
            'We honor verified creator takedown requests promptly for any reason. To prevent impersonation without requiring an X login, we verify ownership using a simple verification-code flow. Requests are processed in our regular curation batch (initial response within 72 hours at most), and we notify you once completed.',
          langToggle,
        })
      );

      // 1. 3-Step Verification-Code Flow
      const flowCard = document.createElement('section');
      flowCard.className = 'content-card';
      const h2Flow = document.createElement('h2');
      h2Flow.textContent = '3-Step Verification-Code Flow';
      const pFlow = document.createElement('p');
      pFlow.textContent =
        'Confirming ownership takes three quick steps using your X account directly:';

      const stepsOl = document.createElement('ol');
      stepsOl.className = 'removal-items-list';

      const step1 = document.createElement('li');
      const num1 = document.createElement('span');
      num1.className = 'removal-step-num';
      num1.textContent = '1';
      const body1 = document.createElement('div');
      const strong1 = document.createElement('strong');
      strong1.textContent = 'Submit the post URL and receive a verification code';
      body1.append(
        strong1,
        document.createElement('br'),
        document.createTextNode('Send us the target X post URL via our dedicated Web Form (Google Forms) or secondary email contact below. We will issue a short verification code (e.g., '),
        createInlineCode('xpg-del-XXXX'),
        document.createTextNode(').')
      );
      step1.append(num1, body1);

      const step2 = document.createElement('li');
      const num2 = document.createElement('span');
      num2.className = 'removal-step-num';
      num2.textContent = '2';
      const body2 = document.createElement('div');
      const strong2 = document.createElement('strong');
      strong2.textContent = 'Post the code as a reply to your own original post';
      body2.append(
        strong2,
        document.createElement('br'),
        document.createTextNode(
          'Reply to your original X post with the code. Only the original account can post it, proving ownership (you may delete the reply after delisting).'
        )
      );
      step2.append(num2, body2);

      const step3 = document.createElement('li');
      const num3 = document.createElement('span');
      num3.className = 'removal-step-num';
      num3.textContent = '3';
      const body3 = document.createElement('div');
      const strong3 = document.createElement('strong');
      strong3.textContent = 'Operator verifies and delists';
      body3.append(
        strong3,
        document.createElement('br'),
        document.createTextNode(
          'Our operator (with AI assistance) verifies that the code is posted by the same X account credited on the listing, delists the entry promptly, and sends confirmation.'
        )
      );
      step3.append(num3, body3);

      stepsOl.append(step1, step2, step3);
      flowCard.append(h2Flow, pFlow, stepsOl);
      shell.appendChild(flowCard);

      // 2. Alternatives, Auto-delist, Rejected methods
      const altCard = document.createElement('section');
      altCard.className = 'content-card';
      const h2Alt = document.createElement('h2');
      h2Alt.textContent = 'Alternatives, Automatic Delisting & Policies';

      const h3Alt = document.createElement('h3');
      h3Alt.className = 'subsection-heading';
      h3Alt.textContent = 'Alternative Verification Options (in order of preference)';

      const altList = document.createElement('ul');
      altList.className = 'policy-list';
      [
        [
          'Temporary code in your X profile bio: ',
          'If you prefer not to reply to your post, place the code temporarily in your profile bio until verified.',
        ],
        [
          `DM to ${operatorName} (last resort): `,
          'Private option, though slower because it requires manual DM review by the operator.',
        ],
      ].forEach(([bold, text]) => {
        const li = document.createElement('li');
        const strong = document.createElement('strong');
        strong.textContent = bold;
        li.append(strong, document.createTextNode(text));
        altList.appendChild(li);
      });

      const autoBox = document.createElement('div');
      autoBox.className = 'policy-callout policy-callout--info';
      const autoStrong = document.createElement('strong');
      autoStrong.textContent = 'Automatic delisting (no verification required): ';
      autoBox.append(
        autoStrong,
        document.createTextNode(
          'Deleting your original post on X or locking/protecting your account immediately disables the official X embed. Our periodic liveness checks detect unavailable embeds and automatically remove the listing from this site.'
        )
      );

      const rejectBox = document.createElement('div');
      rejectBox.className = 'policy-callout policy-callout--danger';
      const rejectStrong = document.createElement('strong');
      rejectStrong.textContent = 'Not accepted: ';
      rejectBox.append(
        rejectStrong,
        document.createTextNode(
          'Claims by email address alone or screenshots alone are not accepted, because they cannot prevent third-party impersonation.'
        )
      );

      altCard.append(h2Alt, h3Alt, altList, autoBox, rejectBox);
      shell.appendChild(altCard);

      // 3. Minimal Required Inputs
      const reqCard = document.createElement('section');
      reqCard.className = 'content-card';
      const h2Req = document.createElement('h2');
      h2Req.textContent = 'Required Inputs (3 items only)';
      const pReq = document.createElement('p');
      pReq.textContent = 'We keep required fields to the absolute minimum:';

      const reqOl = document.createElement('ol');
      reqOl.className = 'removal-items-list';
      [
        ['Post URL', 'The X post URL you want removed or corrected'],
        ['Requested action', 'e.g., Remove listing / Correct metadata'],
        [
          'Where the code was posted',
          'e.g., Reply to original post / Profile bio / DM (share after receiving your verification code)',
        ],
      ].forEach(([title, desc], idx) => {
        const li = document.createElement('li');
        const num = document.createElement('span');
        num.className = 'removal-step-num';
        num.textContent = String(idx + 1);
        const body = document.createElement('div');
        const strong = document.createElement('strong');
        strong.textContent = title;
        body.append(strong, document.createElement('br'), document.createTextNode(desc));
        li.append(num, body);
        reqOl.appendChild(li);
      });

      reqCard.append(h2Req, pReq, reqOl);

      if (prefillPostUrl) {
        const prefillBox = document.createElement('div');
        prefillBox.className = 'prefill-post-box';
        const label = document.createElement('strong');
        label.textContent = 'Pre-filled Target Post URL:';
        prefillBox.append(label, document.createElement('br'), document.createTextNode(prefillPostUrl));
        reqCard.appendChild(prefillBox);
      }

      shell.appendChild(reqCard);

      // 4. Contact Destination (Primary: Google Forms, Secondary: Email)
      const contactCard = document.createElement('section');
      contactCard.className = 'content-card';
      const h2c = document.createElement('h2');
      h2c.textContent = 'Contact Channel (Web Form Primary, Email Secondary)';

      const channelIntro = document.createElement('p');
      channelIntro.textContent =
        'Our primary intake channel is a dedicated Web Form (Google Forms, with bilingual Japanese/English field labels) so the 3 required inputs are captured cleanly for batch processing. Email is provided as a secondary fallback contact.';

      const channelList = document.createElement('ul');
      channelList.className = 'policy-list';
      [
        [
          'Primary intake — Web Form (Google Forms): ',
          'Recommended for fast, structured requests with short English labels alongside Japanese.',
        ],
        [
          'Secondary contact — Email: ',
          'Available as a fallback if you cannot access the web form (note: email alone does not verify ownership; verification-code confirmation is still required).',
        ],
      ].forEach(([bold, text]) => {
        const li = document.createElement('li');
        const strong = document.createElement('strong');
        strong.textContent = bold;
        li.append(strong, document.createTextNode(text));
        channelList.appendChild(li);
      });

      contactCard.append(h2c, channelIntro, channelList);

      if (removalUrl || removalEmail) {
        const actions = document.createElement('div');
        actions.className = 'manifesto-actions';
        actions.style.marginTop = '1rem';

        if (removalUrl) {
          const formLink = document.createElement('a');
          formLink.href = removalUrl;
          formLink.target = '_blank';
          formLink.rel = 'noopener noreferrer';
          formLink.className = 'btn btn--primary';
          formLink.textContent = 'Open Removal Request Form (Google Forms) ↗';
          actions.appendChild(formLink);
        }

        if (removalEmail) {
          const subject = encodeURIComponent('[Removal Request] X Prompt Gallery');
          const bodyText = encodeURIComponent(
            `1. Post URL: ${prefillPostUrl || ''}\n2. Requested action: \n3. Where the code was posted: \n`
          );
          const mailLink = document.createElement('a');
          mailLink.href = `mailto:${removalEmail}?subject=${subject}&body=${bodyText}`;
          mailLink.className = 'btn btn--outline';
          mailLink.textContent = `Secondary Contact: Email (${removalEmail})`;
          actions.appendChild(mailLink);
        }

        contactCard.appendChild(actions);
      }

      if (!removalUrl) {
        const callout = document.createElement('div');
        callout.className = 'placeholder-callout';
        callout.style.marginTop = '1rem';
        const strong = document.createElement('strong');
        strong.textContent = removalEmail
          ? 'Google Form URL pending setup (placeholder): '
          : 'Google Form URL & secondary email pending setup (placeholder): ';
        callout.append(
          strong,
          document.createTextNode(
            'The operator will create the bilingual Google Form during launch preparation and configure its URL (plus secondary email) in data/posts.json (siteConfig.contact). Direct links will appear here once configured.'
          )
        );
        contactCard.appendChild(callout);
      }

      shell.appendChild(contactCard);
    },
  });
}
