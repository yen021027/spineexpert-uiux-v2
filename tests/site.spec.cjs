const {chromium, expect} = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4174/';
const output = path.resolve(__dirname, '../test-results');
const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../public/data.json'), 'utf8'));
fs.mkdirSync(output, {recursive:true});

(async () => {
  const browser = await chromium.launch({headless:true});
  const context = await browser.newContext({viewport:{width:1440,height:1000}});
  const page = await context.newPage();
  const errors = [], broken = [], writes = [];
  const report = {base:BASE,articles:data.posts.length,responsive:[],flows:[],accessibility:[],content:[],errors,broken,writes};
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.url().startsWith(BASE) && r.status() >= 400) broken.push(`${r.status()} ${r.url()}`); });
  page.on('request', r => { if (!['GET','HEAD'].includes(r.method())) writes.push(r.url()); });
  const arrowPattern = /[\u2190-\u21ff\u2303-\u2304\u23e9-\u23ec\u23f4-\u23f7\u25b2-\u25b9\u25bc-\u25c3\u2794\u2798-\u27af\u2934-\u2935\u2b00-\u2b11\u{1f446}-\u{1f449}\u{1f500}-\u{1f503}\u{1f519}-\u{1f51d}\u{1f53a}-\u{1f53d}\u{1f800}-\u{1f8ff}]/u;
  async function layout(label) {
    const size = await page.evaluate(() => ({vw:innerWidth,sw:document.documentElement.scrollWidth}));
    assert(size.sw <= size.vw + 1, `${label} horizontal overflow ${JSON.stringify(size)}`);
    assert.equal(await page.locator('main h1').count(),1,label + ' h1');
    const text = await page.locator('body').innerText();
    assert(!arrowPattern.test(text),label + ' contains an arrow');
  }
  async function goto(route) {
    await page.goto(BASE + route);
    await page.locator('main h1').waitFor();
    await page.evaluate(() => document.fonts.ready);
  }
  const routes = ['#/','#/articles','#/about','#/clinic',`#/post/${data.posts[0].id}`,'#/post/2076909844542131328','#/missing','#/post/missing'];
  for (const width of [320,360,390,540,600,760,768,1024,1280,1440]) {
    await page.setViewportSize({width,height:900});
    for (const route of routes) {
      await goto(route);
      await layout(`${width} ${route}`);
      report.responsive.push({width,route,overflow:false});
      if ([390,1440].includes(width) && !route.includes('missing')) {
        await page.screenshot({path:path.join(output,`${width}-${route.split('/')[1] || 'home'}.png`),fullPage:!route.includes('post')});
      }
    }
  }
  console.log('Responsive routes passed:',report.responsive.length);
  await page.setViewportSize({width:390,height:844});
  await goto('#/');
  await page.locator('.skip-link').focus();
  await page.keyboard.press('Enter');
  assert(await page.locator('main').evaluate(e => e === document.activeElement));
  assert(page.url().endsWith('#/'));
  await page.locator('#menu-toggle').click();
  await expect(page.locator('#menu-toggle')).toHaveAttribute('aria-expanded','true');
  await page.keyboard.press('Escape');
  await expect(page.locator('#menu-toggle')).toHaveAttribute('aria-expanded','false');
  await expect(page.locator('#menu-toggle')).toBeFocused();
  await page.locator('#menu-toggle').click();
  await page.locator('#site-nav a').first().click();
  await expect(page.locator('#article-search')).toBeVisible();
  await expect(page.locator('#menu-toggle')).toHaveAttribute('aria-expanded','false');
  await page.goBack();
  await expect(page.locator('#hero-title')).toBeVisible();
  await page.locator('#menu-toggle').click();
  await page.locator('#home-query').click();
  await expect(page.locator('#menu-toggle')).toHaveAttribute('aria-expanded','false');
  report.flows.push('Skip link, mobile navigation, Escape focus return, outside click and browser Back');

  await page.locator('#home-query').fill('椎間盤');
  await page.locator('#home-search button').click();
  await expect(page.locator('#article-search')).toHaveValue('椎間盤');
  await expect.poll(() => page.locator('.article-card').count()).toBeGreaterThan(0);
  await page.locator('#article-search').fill('zzzz-no-results');
  await expect(page.locator('.empty-state')).toBeVisible();
  await page.getByRole('button',{name:'顯示所有文章',exact:true}).click();
  await expect(page.locator('#result-count')).toContainText('115');
  await expect(page.locator('#article-search')).toBeFocused();
  await page.locator('#topic-cervical').click();
  await expect(page.locator('#result-count')).toContainText('12');
  await expect(page.locator('#topic-cervical')).toBeFocused();
  await page.locator('#year-filter').focus();
  await page.locator('#year-filter').selectOption('2026');
  const cervical2026 = data.posts.filter(p => p.categories.includes('cervical') && p.date.startsWith('2026')).length;
  await expect(page.locator('#result-count')).toContainText(String(cervical2026));
  await expect(page.locator('#year-filter')).toBeFocused();
  await page.getByRole('button',{name:'清除全部篩選',exact:true}).click();
  await expect(page.locator('#result-count')).toContainText('115');
  await expect(page.locator('#article-search')).toBeFocused();
  await page.locator('#sort-order').selectOption('oldest');
  await expect(page.locator('.article-card time').first()).toHaveAttribute('datetime',[...data.posts].sort((a,b)=>a.date.localeCompare(b.date))[0].date);
  await page.locator('#tag-filter').selectOption('骨質疏鬆');
  const matchingTag = data.posts.filter(p=>p.labels.includes('骨質疏鬆')).length;
  await expect(page.locator('#result-count')).toContainText(String(matchingTag));
  report.flows.push('Home search, full-text search, zero results, reset, combined topic/year filter, original tags and chronological sort');

  await goto('#/articles');
  await page.evaluate(() => {
    const input = document.querySelector('#article-search');
    input.value = '椎間盤';
    input.dispatchEvent(new Event('input',{bubbles:true}));
    document.querySelector('#topic-cervical').click();
  });
  await expect(page.locator('#article-search')).toHaveValue('椎間盤');
  assert(new URLSearchParams(page.url().split('?')[1]).get('q') === '椎間盤');
  await page.getByRole('button',{name:'清除全部篩選',exact:true}).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#article-search')).toBeFocused();
  await expect(page.locator('#result-count')).toContainText('115');
  report.flows.push('Interrupted search retains query when immediately filtering; keyboard reset restores search focus');

  await goto('#/articles?topic=cervical');
  await page.locator('.article-card h3 a').first().click();
  await expect(page.locator('.article-body')).toBeVisible();
  await page.getByRole('button',{name:'放大',exact:true}).click();
  assert.equal(await page.locator('.article-body').evaluate(e=>getComputedStyle(e).fontSize),'21px');
  await expect(page.getByRole('button',{name:'放大',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'標準',exact:true}).click();
  await page.locator('.reader-bottom a').click();
  await expect(page.locator('#topic-cervical')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#result-count')).toContainText('12');
  await goto('#/articles');
  await expect(page.getByRole('button',{name:'上一頁',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'下一頁',exact:true}).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.pagination')).toContainText('第 2 /');
  await page.goBack();
  await expect(page.locator('.pagination')).toContainText('第 1 /');
  await goto('#/articles?page=9999999');
  await expect(page.getByRole('button',{name:'下一頁',exact:true})).toBeDisabled();
  await expect(page.locator('.pagination')).toContainText('第 13 / 13');
  await goto('#/articles?page=NaN&topic=unknown&sort=evil');
  await expect(page.locator('#result-count')).toContainText('115');
  await expect(page.locator('.pagination')).toContainText('第 1 /');
  report.flows.push('Font sizing, filtered-list return, pagination keyboard, first/last page boundaries, browser history and invalid URL state');

  await goto('#/clinic');
  const question = page.getByText('可以傳送個人病情嗎？',{exact:true});
  await question.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('此示範網站不蒐集、儲存或傳送個人病情。診斷與治療建議需要醫師實際評估。')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.getByText('此示範網站不蒐集、儲存或傳送個人病情。診斷與治療建議需要醫師實際評估。')).toBeHidden();
  assert.equal(await page.locator('input,textarea').count(),0);
  await goto('#/articles');
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior),'auto');
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await expect(page.locator('.back-top')).toBeVisible();
  await page.locator('.back-top').focus();
  await page.keyboard.press('Enter');
  await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBe(0);
  await expect(page.locator('main')).toBeFocused();
  await page.emulateMedia({reducedMotion:'no-preference'});
  report.flows.push('Clinic disclosure keyboard/repeated toggles, no health-data form, reduced motion and keyboard back-to-top');

  for (const width of [390,1440]) {
    await page.setViewportSize({width,height:1000});
    for (const route of ['#/','#/articles','#/about','#/clinic',`#/post/${data.posts[0].id}`,'#/missing']) {
      await goto(route);
      if (route.includes('/post/')) {
        assert(await page.evaluate(() => Math.abs(document.querySelector('.reading-progress').getBoundingClientRect().top - document.querySelector('.site-header').getBoundingClientRect().bottom) < 1));
      }
      const axe = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
      report.accessibility.push({width,route,violations:axe.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});
    }
  }
  console.log('Axe findings:',JSON.stringify(report.accessibility.filter(a=>a.violations.length),null,2));
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));

  for (const width of [320,390,1440]) {
    await page.setViewportSize({width,height:900});
    for (const p of data.posts) {
      await page.evaluate(id=>{location.hash='#/post/'+id;},p.id);
      await expect(page.locator('.article-heading h1')).toHaveText(p.title.trim());
      await layout(`article ${p.id} width ${width}`);
      const actual = await page.locator('.article-body > *').evaluateAll(elements=>elements.map(e=>e.tagName==='OL'?[...e.children].map(li=>li.textContent).join(' → '):e.textContent));
      assert.deepEqual(actual,p.paragraphs.map(t=>t.replace(/^▲\s*/,'')),`Medical text ${p.id}`);
    }
    report.content.push({width,articles:115,medicalTextPreserved:true,overflow:false,arrows:false});
  }
  await page.setViewportSize({width:844,height:390});
  await goto('#/'); await layout('landscape home');
  await goto('#/articles'); await layout('landscape library');
  await page.setViewportSize({width:640,height:900});
  await goto('#/articles');
  await page.evaluate(()=>document.documentElement.style.zoom='2');
  await layout('200% zoom library');
  await page.evaluate(()=>document.documentElement.style.zoom='1');
  report.flows.push('Landscape and 200% zoom reflow');

  let release;
  await page.route('**/data.json',route=>new Promise(resolve=>{release=async()=>{await route.abort('failed');resolve();};}));
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await expect(page.locator('.initial-state')).toBeVisible();
  await expect.poll(()=>typeof release).toBe('function');
  await release();
  await expect(page.locator('main h1')).toHaveText('文章暫時無法載入。');
  await page.unroute('**/data.json');
  await page.reload();
  await expect(page.locator('#hero-title')).toBeVisible();
  report.flows.push('Loading state, network failure, recovery and unknown routes');
  assert.deepEqual(errors,[]);
  assert.deepEqual(broken,[]);
  assert.deepEqual(writes,[]);
  assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
  const baseline = path.resolve(__dirname,'../research/original-file-hashes.json');
  if (fs.existsSync(baseline)) {
    const before = JSON.parse(fs.readFileSync(baseline,'utf8').replace(/^\uFEFF/,''));
    for (const file of before) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file.Path)).digest('hex').toUpperCase(),file.Hash,`Original file was changed: ${file.Path}`);
    report.originalProjectUnchanged = true;
  } else {
    report.originalProjectUnchanged = 'Not applicable: original local project is not part of this checkout';
  }
  report.sourceDataIdentical = crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'../public/data.json'))).digest('hex') === 'f74bb274ced49f5a0a949fc984af6b1707ef6cce28a5c4b0c159021470069c39';
  assert(report.sourceDataIdentical);
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
  await browser.close();
  assert(!report.accessibility.some(a=>a.violations.length),'Axe violations remain; see test-results/report.json');
  console.log('PASS',JSON.stringify({responsive:report.responsive.length,axePages:report.accessibility.length,medicalContent:report.content,flows:report.flows,originalUnchanged:report.originalProjectUnchanged},null,2));
})().catch(error=>{console.error(error);process.exit(1);});
