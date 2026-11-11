'use strict';

const main = document.querySelector('#main');
const menu = document.querySelector('#site-nav');
const menuToggle = document.querySelector('#menu-toggle');
const backTop = document.querySelector('.back-top');
const description = document.querySelector('meta[name="description"]');
const SOURCE = 'http://spineexpert.blogspot.com/?m=1';
const PAGE_SIZE = 9;
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons = {
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  book: '<path d="M12 5v15M3 4c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 2-2-2-5-3-9-2Z"/>',
  spine: '<path d="M12 2c-5 6 5 14-1 20m-4-17 9 1m-8 5 9 1m-9 5 9 1"/>',
  bone: '<path d="M8 4c-2-3-6 0-4 3-3 2 0 6 3 4l6 6c-2 3 2 6 4 3 3 2 6-2 3-4 2-3-2-6-4-3L10 7c1-2 0-4-2-3Z"/>',
  layers: '<rect x="4" y="3" width="16" height="5" rx="2"/><rect x="4" y="10" width="16" height="5" rx="2"/><path d="M5 19h14"/>',
  circle: '<circle cx="12" cy="12" r="8"/><path d="M12 6v12M8 9h8m-8 6h8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.book}</svg>`;
const topicInfo = {
  endoscopy: {short:'微創脊椎內視鏡', label:'微創手術', icon:'spine', line:'認識內視鏡手術的臨床分享'},
  osteoporosis: {short:'骨質疏鬆與高齡脊椎', label:'骨質與高齡', icon:'bone', line:'閱讀骨質疏鬆與高齡手術文章'},
  deformity: {short:'脊椎側彎與畸形', label:'側彎與畸形', icon:'spine', line:'從脊椎排列理解治療討論'},
  cervical: {short:'頸椎疾病', label:'頸椎疾病', icon:'layers', line:'認識頸椎疾病與治療選擇'},
  revision: {short:'脊椎翻修手術', label:'翻修手術', icon:'circle', line:'閱讀再次手術的相關經驗'}
};
const credentials = ['高雄長庚醫院脊椎科主治醫師', '高雄長庚醫院骨科主治醫師', '美國聖路易斯華盛頓大學脊椎外科訪問學者及臨床研究員', '林口長庚醫院頸椎手術進修', '台灣脊椎微創內視鏡醫學會教育委員', '台灣脊椎微創內視鏡醫學會監事', '高壓氧專科醫師', '2024 台灣脊椎外科醫學會訪日交流學者'];
let data;
let lastRoute = '';
let libraryReturn = '#/articles';
let largeType = false;
let queryTimer;
let pendingFocus = '';

function state() {
  const [route, query = ''] = (location.hash.slice(1) || '/').split('?');
  const params = new URLSearchParams(query);
  const category = params.get('topic') || 'all';
  const year = params.get('year') || 'all';
  const page = Number(params.get('page'));
  return {route, q: (params.get('q') || '').slice(0, 200), topic: data?.categories.some(c => c.id === category) ? category : 'all', year: /^\d{4}$/.test(year) ? year : 'all', tag: params.get('tag') || 'all', sort: params.get('sort') === 'oldest' ? 'oldest' : 'newest', page: Number.isSafeInteger(page) && page > 0 ? page : 1};
}
function libraryURL(s = {}) {
  const params = new URLSearchParams();
  if (s.q) params.set('q', s.q);
  if (s.topic && s.topic !== 'all') params.set('topic', s.topic);
  if (s.year && s.year !== 'all') params.set('year', s.year);
  if (s.tag && s.tag !== 'all') params.set('tag', s.tag);
  if (s.sort === 'oldest') params.set('sort', s.sort);
  if (s.page > 1) params.set('page', String(s.page));
  return '#/articles' + (params.size ? '?' + params : '');
}
const date = value => value.replaceAll('-', '.');
const category = p => topicInfo[p.categories[0]]?.label || '脊椎衛教';
const external = (url, label, cls = '') => `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label}<span class="sr-only">（另開分頁）</span></a>`;
const breadcrumb = label => `<nav class="breadcrumb" aria-label="麵包屑"><a href="#/">首頁</a><span aria-hidden="true">/</span><span>${label}</span></nav>`;
function sectionHead(kicker, title, link = '') { return `<div class="section-heading"><div><p class="eyebrow">${kicker}</p><h2>${title}</h2></div>${link}</div>`; }
function articleCard(p, index, featured = false) {
  const excerpt = p.paragraphs[0] || '';
  return `<article class="article-card ${featured ? 'featured-card' : ''}"><div class="card-meta"><span class="topic-label">${esc(category(p))}</span><span class="card-number">${String(index + 1).padStart(2, '0')}</span></div><h3><a href="#/post/${p.id}">${esc(p.title.trim())}</a></h3>${featured ? `<p class="excerpt">${esc(excerpt.slice(0, 90))}${excerpt.length > 90 ? '…' : ''}</p><span class="excerpt-note">原文節錄</span>` : ''}<div class="card-bottom"><time datetime="${p.date}">${date(p.date)}</time><span class="card-read" aria-hidden="true">閱讀文章</span></div></article>`;
}
function topicLink(c, i) {
  const info = topicInfo[c.id];
  const count = data.posts.filter(p => p.categories.includes(c.id)).length;
  return `<a class="topic-card" href="${libraryURL({topic:c.id})}"><div class="topic-card-top"><span class="topic-icon">${icon(info.icon)}</span><span class="topic-number">0${i + 1}</span></div><h3>${esc(info.short)}</h3><p>${info.line}</p><span class="topic-count">${count} 篇文章</span></a>`;
}
function home() {
  document.title = '脊椎知識室｜鄞宗誠醫師';
  main.innerHTML = `<div class="shell"><section class="hero" aria-labelledby="hero-title"><div class="hero-copy"><p class="eyebrow"><span class="small-line"></span> KNOWLEDGE FOR EVERYDAY LIFE</p><h1 id="hero-title">理解脊椎，<br><span>從好好閱讀開始。</span></h1><p class="hero-description">把複雜的脊椎知識，放進日常的理解裡。<br class="desktop-break">鄞宗誠醫師的臨床分享與衛教文章，陪你多了解一點。</p><form class="hero-search" id="home-search" role="search"><label for="home-query">你想了解什麼？</label><div class="search-field">${icon('search')}<input id="home-query" name="q" type="search" placeholder="試試「椎間盤」或「頸椎」" maxlength="200"><button type="submit">搜尋文章</button></div></form><div class="hero-topics"><span>從主題開始</span><a href="${libraryURL({topic:'endoscopy'})}">微創手術</a><a href="${libraryURL({topic:'cervical'})}">頸椎疾病</a><a href="${libraryURL({topic:'osteoporosis'})}">骨質疏鬆</a></div><div class="hero-bottom"><span class="hero-count">${data.posts.length}<small>篇原站文章</small></span><span>有來源的資訊<br>更安心的閱讀</span></div></div><div class="hero-portrait"><div class="portrait-label">MEET YOUR AUTHOR</div><img src="assets/doctor.jpg" alt="鄞宗誠醫師" width="720" height="960" fetchpriority="high"><div class="doctor-overlay"><div><h2>鄞宗誠 <span>醫師</span></h2><p>Tsung-Cheng Yin, M.D.</p></div><a href="#/about" aria-label="認識鄞宗誠醫師">認識醫師</a></div></div></section><div class="trust-band"><p>${icon('book')}<span>文章來自醫師原始部落格</span></p><p>${icon('check')}<span>保留醫療原文，不生成診斷</span></p><p>${icon('plus')}<span>閱讀是理解，診察需由醫師評估</span></p></div><section class="section topics-section" aria-labelledby="topics-title">${sectionHead('01 / EXPLORE BY TOPIC', '<span id="topics-title">先找到你關心的主題</span>', '<a class="text-link" href="#/articles">瀏覽全部文章</a>')}<div class="topic-grid">${data.categories.map(topicLink).join('')}</div></section><section class="section latest-section" aria-labelledby="latest-title">${sectionHead('02 / THE LATEST READS', '<span id="latest-title">最近的臨床分享</span>', '<span class="section-caption">從原站文章，認識不同的治療討論</span>')}<div class="latest-grid">${data.posts.slice(0, 3).map((p, i) => articleCard(p, i, i === 0)).join('')}</div><div class="section-end"><a class="button button-outline" href="#/articles">探索 ${data.posts.length} 篇衛教文章</a></div></section><section class="care-banner"><div class="care-symbol" aria-hidden="true">${icon('book')}</div><div><p class="eyebrow">READ. UNDERSTAND. DISCUSS.</p><h2>多一分理解，<br class="mobile-break">讓討論更有方向。</h2><p>衛教文章提供資訊，無法代替個別診察。<br>看診與門診安排，請以醫院最新公告為準。</p></div><a class="button button-light" href="#/clinic">查看看診資訊</a></section></div>`;
}
function matches(s) {
  const q = s.q.trim().toLocaleLowerCase();
  const list = data.posts.filter(p => (s.topic === 'all' || p.categories.includes(s.topic)) && (s.year === 'all' || p.date.startsWith(s.year)) && (s.tag === 'all' || p.labels.includes(s.tag)) && (!q || p.searchText.includes(q)));
  return s.sort === 'oldest' ? [...list].reverse() : list;
}
function results(s) {
  const posts = matches(s);
  const pages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  const current = Math.min(s.page, pages);
  const active = s.q || s.topic !== 'all' || s.year !== 'all' || s.tag !== 'all';
  return `<div class="results-heading"><p id="result-count" role="status" aria-live="polite" aria-atomic="true"><strong>${posts.length}</strong> 篇${active ? '符合條件的' : '衛教'}文章</p>${active ? '<button type="button" class="text-button" data-reset>清除全部篩選</button>' : '<span>依原始發布日期排序</span>'}</div>${posts.length ? `<div class="article-grid">${posts.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE).map((p, i) => articleCard(p, (current - 1) * PAGE_SIZE + i)).join('')}</div>` : `<div class="empty-state">${icon('search')}<h2>暫時沒有符合的文章</h2><p>換個關鍵字，或清除篩選再試試。</p><button class="button" type="button" data-reset>顯示所有文章</button></div>`}<nav class="pagination" aria-label="文章分頁"><button type="button" data-page="${current - 1}" ${current === 1 ? 'disabled' : ''}>上一頁</button><span>第 <strong>${current}</strong> / ${pages} 頁</span><button type="button" data-page="${current + 1}" ${current === pages ? 'disabled' : ''}>下一頁</button></nav>`;
}
function library(s) {
  document.title = '衛教文章｜脊椎知識室';
  libraryReturn = libraryURL(s);
  const years = [...new Set(data.posts.map(p => p.date.slice(0, 4)))].sort().reverse();
  const tags = [...new Set(data.posts.flatMap(p => p.labels))].sort((a,b) => a.localeCompare(b, 'zh-Hant'));
  main.innerHTML = `<div class="shell">${breadcrumb('衛教文章')}<div class="page-heading"><div><p class="eyebrow">THE KNOWLEDGE LIBRARY</p><h1>讓好資訊，<span>更容易找到。</span></h1></div><p>搜尋關心的問題，或從主題開始閱讀。<br>每篇文章都保留原站來源。</p></div><section class="library-search" aria-label="文章搜尋"><label for="article-search">搜尋衛教文章</label><div class="search-field">${icon('search')}<input id="article-search" type="search" maxlength="200" placeholder="輸入標題、關鍵字或內文" autocomplete="off" value="${esc(s.q)}"><button class="clear-search" type="button" ${s.q ? '' : 'hidden'}>清除</button></div></section><div class="library-layout"><aside class="library-sidebar" aria-label="文章篩選"><h2>主題分類</h2><div class="topic-filters">${[{id:'all', name:'所有主題'}, ...data.categories].map(c => `<button type="button" id="topic-${c.id}" data-topic="${c.id}" aria-pressed="${s.topic === c.id}"><span>${c.id === 'all' ? '所有主題' : topicInfo[c.id].short}</span><span class="filter-count">${c.id === 'all' ? data.posts.length : data.posts.filter(p => p.categories.includes(c.id)).length}</span></button>`).join('')}</div><div class="select-group"><label for="year-filter">發布年份</label><select id="year-filter" data-state="year"><option value="all">所有年份</option>${years.map(y => `<option ${s.year === y ? 'selected' : ''}>${y}</option>`).join('')}</select><label for="tag-filter">原站標籤</label><select id="tag-filter" data-state="tag"><option value="all">所有標籤</option>${tags.map(t => `<option value="${esc(t)}" ${s.tag === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select><label for="sort-order">文章排序</label><select id="sort-order" data-state="sort"><option value="newest" ${s.sort === 'newest' ? 'selected' : ''}>最新發布在前</option><option value="oldest" ${s.sort === 'oldest' ? 'selected' : ''}>最早發布在前</option></select></div><p class="sidebar-note">分類沿用原站的主題頁。<br>文章可能屬於多個主題。</p></aside><section id="article-results" aria-label="文章搜尋結果">${results(s)}</section></div><p class="source-note">收錄日期：2026 年 11 月 11 日。內容與標籤取自${external(SOURCE, '原始部落格')}，不代表即時更新。</p></div>`;
}
function about() {
  document.title = '認識鄞宗誠醫師｜脊椎知識室';
  main.innerHTML = `<div class="shell">${breadcrumb('認識醫師')}<section class="about-layout"><div class="about-photo"><img src="assets/doctor.jpg" alt="鄞宗誠醫師肖像" width="720" height="960"><div class="photo-foot"><span>THE DOCTOR BEHIND THE WORDS</span><span>SPINE EXPERT</span></div></div><div class="about-copy"><p class="eyebrow">ABOUT THE AUTHOR</p><h1>鄞宗誠<span>醫師</span></h1><p class="english-name">Tsung-Cheng Yin, M.D.</p><p class="profile-intro">高雄長庚醫院<br>脊椎科・骨科主治醫師</p><p class="profile-note">從臨床經驗出發，分享脊椎疾病與手術相關知識。此頁簡介依原部落格公開資料整理。</p><h2>專業經歷</h2><ul class="credential-list">${credentials.map(c => `<li>${esc(c)}</li>`).join('')}</ul><div class="profile-actions"><a class="button" href="#/articles">閱讀醫師文章</a>${external('https://www.blogger.com/profile/00538994561338350909', '查看原站簡介', 'text-link')}</div></div></section><p class="source-note">經歷依原部落格收錄內容呈現，未另行查證現職異動。照片來源：原站醫師簡介。</p></div>`;
}
function clinic() {
  document.title = '看診資訊｜脊椎知識室';
  main.innerHTML = `<div class="shell">${breadcrumb('看診資訊')}<div class="page-heading"><div><p class="eyebrow">BEFORE YOUR VISIT</p><h1>把閱讀，帶進討論。</h1></div><p>實際看診資訊請以醫院最新公告為準。<br>這裡是網站設計示範，不提供線上診斷。</p></div><div class="clinic-layout"><section class="clinic-primary"><span class="outline-icon">${icon('plus')}</span><h2>門診資訊尚待確認</h2><p>示範版不提供未經確認的門診時間、院區地址或掛號連結，以免造成誤導。</p><div class="clinic-rows"><div><span>原站列示服務院所</span><strong>高雄長庚醫院</strong></div><div><span>科別</span><strong>脊椎科・骨科</strong></div><div><span>門診時間與地點</span><strong>待醫院公告確認</strong></div></div>${external(SOURCE, '查看醫師原始部落格', 'button')}</section><aside class="clinic-aside"><p class="eyebrow">A NOTE BEFORE YOU CONTACT</p><h2>先了解，再詢問。</h2><details open><summary>這個網站可以掛號嗎？</summary><p>不可以。這是獨立示範版，未連結正式掛號系統，也不會代為安排門診。</p></details><details><summary>可以傳送個人病情嗎？</summary><p>此示範網站不蒐集、儲存或傳送個人病情。診斷與治療建議需要醫師實際評估。</p></details><details><summary>文章內容適用於每個人嗎？</summary><p>文章為衛教與個別臨床經驗分享。每人的病況與治療選擇不同，不能直接套用個案結果。</p></details><div class="contact-note"><span>原站公開電子郵件</span><a href="mailto:tsongchenyin@gmail.com">tsongchenyin@gmail.com</a><p>電子郵件無法取代實際診察。</p></div></aside></div></div>`;
}
function paragraph(text) {
  if (text.includes('→')) return `<ol class="article-flow" aria-label="原文依序步驟">${text.split(/\s*→\s*/).map(step => `<li>${esc(step)}</li>`).join('')}</ol>`;
  return `<p>${esc(text.replace(/^▲\s*/, ''))}</p>`;
}
function post(id) {
  const p = data.posts.find(post => post.id === id);
  if (!p) return notFound();
  document.title = `${p.title}｜脊椎知識室`;
  description.content = `${p.title}。來自鄞宗誠醫師原始部落格的衛教文章，不能取代實際診察。`;
  const related = data.posts.filter(item => item.id !== id && item.categories.some(c => p.categories.includes(c))).slice(0, 3);
  main.innerHTML = `<div class="reading-progress" aria-hidden="true"><span></span></div><div class="shell"><nav class="breadcrumb" aria-label="麵包屑"><a href="#/">首頁</a><span aria-hidden="true">/</span><a href="${esc(libraryReturn)}">衛教文章</a><span aria-hidden="true">/</span><span>${esc(category(p))}</span></nav><div class="reader-layout"><aside class="reader-sidebar"><a class="text-link" href="${esc(libraryReturn)}">返回文章列表</a><div class="reader-tools"><p>閱讀設定</p><fieldset><legend>文章字級</legend><div class="font-controls"><button type="button" data-font="normal" aria-pressed="${!largeType}">標準</button><button type="button" data-font="large" aria-pressed="${largeType}">放大</button></div></fieldset></div><div class="reader-source"><p>完整內容與圖片</p>${external(p.url, '閱讀部落格原文', 'text-link')}<span>原文另開分頁</span></div><p class="reader-reminder">衛教文章不能取代實際診察。治療方式仍需由醫師依個別情況評估。</p></aside><article class="article-detail"><header class="article-heading"><p class="eyebrow">${esc(category(p))} / CLINICAL NOTES</p><h1>${esc(p.title.trim())}</h1><div class="byline"><img src="assets/doctor.jpg" alt="" width="44" height="44"><span>鄞宗誠醫師<small>發布於 <time datetime="${p.date}">${date(p.date)}</time></small></span></div></header><div class="article-notice">此示範版呈現原站文字。文章圖片、影像與完整排版請見部落格原文。</div><div class="article-body ${largeType ? 'large-type' : ''}">${p.paragraphs.map(paragraph).join('')}</div><div class="article-end"><span>本文完</span>${external(p.url, '核對完整原文', 'text-link')}</div>${p.labels.length ? `<section class="article-tags" aria-label="原站標籤"><h2>原站標籤</h2><div>${p.labels.map(t => `<a href="${esc(libraryURL({tag:t}))}">${esc(t)}</a>`).join('')}</div></section>` : ''}<div class="reader-bottom"><a class="button button-outline" href="${esc(libraryReturn)}">返回文章列表</a></div></article></div>${related.length ? `<section class="section related-section">${sectionHead('KEEP EXPLORING', '繼續了解這個主題')}<div class="article-grid">${related.map((r, i) => articleCard(r, i)).join('')}</div></section>` : ''}</div>`;
}
function notFound() {
  document.title = '找不到頁面｜脊椎知識室';
  main.innerHTML = '<div class="shell error-state"><p class="eyebrow">PAGE NOT FOUND</p><h1>這一頁暫時找不到。</h1><p>回到文章列表，繼續探索脊椎知識。</p><a class="button" href="#/articles">瀏覽衛教文章</a></div>';
}
function closeMenu(restoreFocus = false) {
  menu.classList.remove('is-open');
  menuToggle.setAttribute('aria-expanded', 'false');
  if (restoreFocus) menuToggle.focus();
}
function render() {
  if (!data) return;
  clearTimeout(queryTimer);
  const s = state();
  const focusId = pendingFocus || document.activeElement?.id;
  pendingFocus = '';
  const isFilterUpdate = lastRoute === '/articles' && s.route === '/articles';
  const scroll = window.scrollY;
  closeMenu();
  description.content = '鄞宗誠醫師的脊椎衛教文章。獨立設計示範版，衛教內容無法取代實際診察。';
  if (s.route === '/') home();
  else if (s.route === '/articles') library(s);
  else if (s.route === '/about') about();
  else if (s.route === '/clinic' || s.route === '/contact') clinic();
  else if (s.route.startsWith('/post/')) post(s.route.slice(6));
  else notFound();
  document.querySelectorAll('[data-nav]').forEach(a => {
    const current = s.route === '/' + a.dataset.nav || a.dataset.nav === 'articles' && s.route.startsWith('/post/');
    if (current) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  if (isFilterUpdate) {
    window.scrollTo({top:scroll, behavior:'instant'});
    if (focusId && document.getElementById(focusId)) document.getElementById(focusId).focus({preventScroll:true});
  } else {
    window.scrollTo({top:0, behavior:'instant'});
    if (lastRoute) main.focus({preventScroll:true});
  }
  lastRoute = s.route;
  updateProgress();
}
function updateProgress() {
  backTop.hidden = window.scrollY < 700;
  const body = document.querySelector('.article-body');
  const bar = document.querySelector('.reading-progress span');
  if (body && bar) {
    bar.parentElement.style.top = `${document.querySelector('.site-header').getBoundingClientRect().bottom}px`;
    const rect = body.getBoundingClientRect();
    const progress = (window.innerHeight - rect.top) / Math.max(rect.height + window.innerHeight * 0.3, 1);
    bar.style.transform = `scaleX(${Math.max(0, Math.min(1, progress))})`;
  }
}
function updateQuery(input) {
  const s = state();
  s.q = input.value;
  s.page = 1;
  history.replaceState(null, '', libraryURL(s));
  libraryReturn = libraryURL(s);
  document.querySelector('.clear-search').hidden = !s.q;
  document.querySelector('#article-results').innerHTML = results(s);
}
menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(open));
  menu.classList.toggle('is-open', open);
});
menu.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('is-open')) closeMenu(true); });
document.addEventListener('click', e => { if (!menu.contains(e.target) && !menuToggle.contains(e.target)) closeMenu(); });
document.addEventListener('focusin', e => { if (!menu.contains(e.target) && !menuToggle.contains(e.target)) closeMenu(); });
matchMedia('(min-width: 761px)').addEventListener('change', () => closeMenu());
document.querySelector('.skip-link').addEventListener('click', e => { e.preventDefault(); main.focus(); main.scrollIntoView({behavior:'instant'}); });
backTop.addEventListener('click', () => { window.scrollTo({top:0, behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'}); main.focus({preventScroll:true}); });
window.addEventListener('hashchange', render);
window.addEventListener('scroll', updateProgress, {passive:true});
main.addEventListener('submit', e => {
  if (e.target.id !== 'home-search') return;
  e.preventDefault();
  location.hash = libraryURL({q:document.querySelector('#home-query').value.trim()});
});
main.addEventListener('input', e => {
  if (e.target.id !== 'article-search' || e.isComposing) return;
  clearTimeout(queryTimer);
  queryTimer = setTimeout(() => updateQuery(e.target), 120);
});
main.addEventListener('compositionend', e => { if (e.target.id === 'article-search') updateQuery(e.target); });
main.addEventListener('change', e => {
  if (!e.target.dataset.state) return;
  const s = state();
  s.q = document.querySelector('#article-search')?.value ?? s.q;
  clearTimeout(queryTimer);
  s[e.target.dataset.state] = e.target.value;
  s.page = 1;
  location.hash = libraryURL(s);
});
main.addEventListener('click', e => {
  const button = e.target.closest('button');
  if (!button) return;
  if (button.dataset.font) {
    largeType = button.dataset.font === 'large';
    document.querySelector('.article-body').classList.toggle('large-type', largeType);
    document.querySelectorAll('[data-font]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.font === 'large') === largeType)));
    updateProgress();
    return;
  }
  if (button.classList.contains('clear-search')) {
    clearTimeout(queryTimer);
    const input = document.querySelector('#article-search');
    input.value = '';
    updateQuery(input);
    input.focus();
    return;
  }
  const s = state();
  s.q = document.querySelector('#article-search')?.value ?? s.q;
  clearTimeout(queryTimer);
  if (button.dataset.topic) { s.topic = button.dataset.topic; s.page = 1; }
  else if (button.dataset.page) {
    s.page = Number(button.dataset.page);
    location.hash = libraryURL(s);
    requestAnimationFrame(() => { document.querySelector('#article-results')?.scrollIntoView({behavior:'instant'}); main.focus({preventScroll:true}); });
    return;
  } else if (button.hasAttribute('data-reset')) {
    pendingFocus = 'article-search';
    if (location.hash === '#/articles') render();
    else location.hash = '#/articles';
    return;
  } else return;
  location.hash = libraryURL(s);
});
fetch('data.json').then(response => {
  if (!response.ok) throw new Error('Content not available');
  return response.json();
}).then(content => {
  data = content;
  data.posts.sort((a,b) => b.date.localeCompare(a.date));
  data.posts.forEach(p => { p.searchText = [p.title, ...p.labels, ...p.paragraphs].join(' ').toLocaleLowerCase(); });
  render();
}).catch(() => {
  main.innerHTML = `<div class="shell error-state"><p class="eyebrow">CONTENT UNAVAILABLE</p><h1>文章暫時無法載入。</h1><p>請重新整理，或到原始部落格繼續閱讀。</p>${external(SOURCE, '閱讀原始部落格', 'button')}</div>`;
});
