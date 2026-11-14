// タイプ別・副業別の解説ページ（静的HTML）と sitemap.xml を作る。
// 診断のデータは index.html から読むので、index.html の TYPES・JOBS・LINKS・GA_ID を変えたら
//   node tools/build-pages.mjs
// を実行して、できたファイルもあわせてコミットする。
import {readFileSync,writeFileSync,mkdirSync,rmSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
import vm from "node:vm";
import {TYPE_EXTRA,JOB_EXTRA} from "./pages-data.mjs";
import {TYPE_DEEP} from "./type-deep-data.mjs";
import {COLUMNS} from "./column-data.mjs";
import {CONDITIONS,HUB_LEAD,ZUKAN_LEAD} from "./conditions-data.mjs";
import {COMPARE} from "./compare-data.mjs";
import {SEASONS,FEATURES} from "./season-data.mjs";
import {UNSEI,TSUMAZUKI} from "./quiz-data.mjs";
import {CONT} from "./continue-data.mjs";
import {GUIDES,GUIDE_BANNED} from "./guide-data.mjs";
import {NEWS} from "./news-data.mjs";
import {COMICS} from "./comics-data.mjs";

const ROOT=join(dirname(fileURLToPath(import.meta.url)),"..");
const SITE="https://mini-shindan.com/";
const BASE="fukugyo/";
const NAME="向いてる副業診断";

// ---- index.html からデータを取り出す ----
const html=readFileSync(join(ROOT,"index.html"),"utf8");
const GA_ID=(html.match(/const GA_ID="([^"]*)"/)||[])[1]||"";
const from=html.indexOf("// ---- キャラクター"),to=html.indexOf("// ---- 条件の質問");
if(from<0||to<0)throw new Error("index.html のデータ部分が見つかりません");
const D=vm.runInNewContext(html.slice(from,to)+";({ART,TYPES,LINKS,JOBS,charSVG})");
const {TYPES,LINKS,JOBS,charSVG}=D;
const KEYS=Object.keys(TYPES);
for(const k of KEYS)if(!TYPE_EXTRA[k])throw new Error(`pages-data.mjs にタイプ ${k} の文章がありません`);
for(const j of JOBS)if(!JOB_EXTRA[j.id])throw new Error(`pages-data.mjs に副業 ${j.id} の文章がありません`);
const JOB_BY_ID=Object.fromEntries(JOBS.map(j=>[j.id,j]));
for(const c of COLUMNS)for(const id of [...c.jobs,...c.sections.flatMap(([,b])=>b.flatMap(x=>x.jobs||[]))])if(!JOB_BY_ID[id])throw new Error(`column-data.mjs の ${c.slug} にある副業 ${id} が JOBS にありません`);

const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
const typePath=k=>`${BASE}type/${TYPES[k].slug}/`;
const jobPath=j=>`${BASE}job/${j.id}/`;
const GUIDE=`${BASE}guide/`;
const COLUMN=`${BASE}column/`;
const TOOLS_DIR="tools/";
const ZUKAN=`${BASE}zukan/`;
const CONDS=`${BASE}conditions/`;
const condPath=c=>`${CONDS}${c.slug}/`;
// 文章が揃った条件だけ公開する（未入稿のページは作らない）。確認用に CONDITIONS_PREVIEW=1 で仮文を入れられる（コミットしない）
const PREVIEW=process.env.CONDITIONS_PREVIEW==="1";
const PUB=CONDITIONS.map(c=>PREVIEW&&!c.intro.length?{...c,intro:["（確認用の仮文）"],fail:["（確認用の仮文）"],note:"（確認用の仮文）"}:c).filter(c=>c.intro.length&&c.fail.length&&c.note);
const PRIVACY="privacy/",ABOUT="about/";
const columnPath=c=>`${COLUMN}${c.slug}/`;
const typeLabel=k=>`${TYPES[k].animal}の${TYPES[k].chara}（${TYPES[k].short}タイプ）`;
const titleOf=(main,sub)=>TYPES[sub].adj+TYPES[main].role;
const stars=n=>"★".repeat(n)+"☆".repeat(5-n);

// ---- 共通の枠 ----
// path はサイトルートからのパス（末尾 /）。リンクは相対パスにして github.io/shindan/ でも動くようにする
function page({path,title,desc,crumbs,body,ptype="",extraLd=""}){
  const up="../".repeat(path.split("/").filter(Boolean).length);
  const href=p=>up+p;
  const ld={"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:crumbs.map(([n,p],i)=>({"@type":"ListItem",position:i+1,name:n,item:SITE+p}))};
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${path}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="ミニ診断">
<meta property="og:locale" content="ja_JP">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:image" content="${SITE}ogp.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="向いてる副業診断。フクロウ、インコ、ビーバー、キツネ、ミツバチの5キャラ">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#f7f5f0" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#1a1917" media="(prefers-color-scheme: dark)">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ctext y=%22.9em%22 font-size=%2290%22%3E%F0%9F%A6%8A%3C/text%3E%3C/svg%3E">
<link rel="stylesheet" href="${href("assets/pages.css")}">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
${extraLd}<script>
const GA_ID="${GA_ID}";
const NOTRACK=(()=>{try{const q=new URLSearchParams(location.search).get("notrack");if(q==="1")localStorage.setItem("shindan-notrack","1");if(q==="0")localStorage.removeItem("shindan-notrack");return localStorage.getItem("shindan-notrack")==="1"}catch(e){return false}})();
if(GA_ID&&!NOTRACK){
  const s=document.createElement("script");s.async=true;s.src="https://www.googletagmanager.com/gtag/js?id="+GA_ID;document.head.appendChild(s);
  window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag("js",new Date());gtag("config",GA_ID,Object.assign(/[?&]debug=1/.test(location.search)?{debug_mode:true}:{},${JSON.stringify(ptype?{page_type:ptype}:{})}));
}
document.addEventListener("click",e=>{const a=e.target.closest("a[data-track]");if(a&&window.gtag)gtag("event",a.dataset.track,a.dataset.placement?{job_id:a.dataset.jobId||"",service_name:a.dataset.service,placement:a.dataset.placement,page:location.pathname}:{page:location.pathname,link:a.textContent.trim(),place:a.dataset.place||""})});
</script>
</head>
<body>
<main>
  <p class="pr">※ 本サイトには広告（PR・アフィリエイトリンク）が含まれます。</p>
  <nav class="crumbs" aria-label="パンくずリスト">${crumbs.map(([n,p],i)=>i<crumbs.length-1?`<a href="${href(p)}">${esc(n)}</a>`:`<span aria-current="page">${esc(n)}</span>`).join(" › ")}</nav>
${body(href)}
  <footer>
    <p><a href="${href("")}">${NAME}をやってみる</a>・<a href="${href(GUIDE)}">タイプと副業の一覧</a>・<a href="${href(COLUMN)}">副業の悩みコラム</a>・<a href="${href(ZUKAN)}">称号図鑑</a>・<a href="${href(TOOLS_DIR)}">ミニ計算ツール</a>・<a href="${href(TSUMAZUKI.slug)}">つまずきタイプ診断</a>・<a href="${href(CHARS)}">キャラクター</a>・<a href="${href(NEWSP)}">更新履歴</a>${PUB.length?`・<a href="${href(CONDS)}">条件から探す</a>`:""}</p>
    <p><a href="${href(PRIVACY)}">プライバシーポリシー・免責事項</a>・<a href="${href(ABOUT)}">運営者情報・広告について</a></p>
    <p class="pr">費用・期間・収入は始め方による一般的な目安で、収益を保証するものではありません。この診断は娯楽・参考用です。</p>
  </footer>
</main>
</body>
</html>
`;
}

const cta=(href,text)=>`  <div class="cta card">
    <p><b>${text}</b></p>
    <p class="sub">11問・約2分・登録不要。あなたのタイプと、今の時間とお金で始められる副業、最初の30日プランがわかります。</p>
    <a class="primary" href="${href("")}" data-track="page_to_quiz">無料で診断する</a>
  </div>`;

// URL が #REPLACE_… のままの枠は出さない（index.html の結果画面と同じ）
const live=k=>!!(k&&LINKS[k]&&!LINKS[k].url.startsWith("#REPLACE"));
const isAd=k=>live(k)&&!LINKS[k].plain;
// サービス名＋選ぶ理由＋ボタンのカード（index.html の svcCard と同じ見た目）。place は計測用の置き場所
const svcCard=(k,place,job)=>{const L=LINKS[k];return `<a class="svc" href="${L.url}" target="_blank" rel="${L.plain?"noopener":"sponsored noopener"}" data-track="${place==="job_top"?"first_step_click":"affiliate_click"}" data-service="${esc(L.svc)}" data-placement="${place}"${job?` data-job-id="${job}"`:""}><span class="svc-t"><b>${esc(L.svc)}</b><span>${esc(L.why)}</span></span><span class="svc-b">${esc(L.label)}</span></a>`};
const affLinks=(keys,place="column")=>keys.length?`<div class="aff">${keys.map(k=>svcCard(k,place)).join("")}</div>
    <p class="pr">PR：上のリンクは広告（アフィリエイト）を含みます。</p>`:"";

const jobMeta=j=>`<div class="meta"><span>初期費用 ${esc(j.costLabel)}</span><span>週${j.h}時間〜</span><span>最初の収入まで ${esc(j.first)}</span><span>半年後の目安 ${esc(j.month)}</span><span>始めやすさ <span class="stars">${stars(j.ease)}</span></span></div>`;
const FACE=["顔も声も出さずにできる","声出しが必要","顔出しが必要"];

// ---- タイプ別ページ ----
function typePage(k){
  const T=TYPES[k],X=TYPE_EXTRA[k],D=TYPE_DEEP[k],jobs=JOBS.filter(j=>j.t===k),path=typePath(k);
  const g=T.good,o=T.opp;
  const title=`${T.animal}の${T.chara}（${T.short}タイプ）を深掘り：場面別の行動・つまずき・伸ばし方｜${NAME}`;
  const desc=`${NAME}の「${T.short}」タイプ（${T.animal}の${T.chara}）を深掘り。仕事場面でのふるまい、副業を始めてからの時系列、収入が伸びる型、称号4つの使い方、よくある疑問、Lv1〜4のロードマップを解説します。`;
  const ldFaq=`<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"FAQPage",mainEntity:D.faq.map(([q,a])=>({"@type":"Question",name:q,acceptedAnswer:{"@type":"Answer",text:a}}))})}</script>\n`;
  return page({path,title,desc,extraLd:ldFaq,crumbs:[[NAME,""],["タイプと副業の一覧",GUIDE],[`${T.short}タイプ`,path]],body:href=>`
  <article>
  <header class="card hero">
    ${charSVG(k,true)}
    <p class="sub">${esc(T.animal)}の「${esc(T.chara)}」</p>
    <h1>${esc(T.short)}タイプ（${esc(T.role)}）を深掘り</h1>
    <p class="catch">${esc(T.catch)}</p>
    <p class="left">${esc(X.lead)}${esc(T.desc)}</p>
    <p class="left sub">診断結果の画面にある「あるある」「取扱説明書」などは省き、このページでは場面別のふるまい、始めてからの時系列、称号ごとの使い方、ロードマップを詳しく解説します。</p>
  </header>

  <section class="card">
    <h2>${esc(T.short)}タイプの強みと弱み</h2>
    <ul>${T.str.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>
    <p class="sub">${esc(T.weak)}</p>
  </section>

  <section class="card">
    <h2>場面別：${esc(T.short)}タイプのふるまい</h2>
    <dl class="faq">${D.scenes.map(([h,t])=>`<dt>${esc(h)}</dt><dd>${esc(t)}</dd>`).join("")}</dl>
  </section>

  <section class="card">
    <h2>副業を始めてからの時系列：起きること・抜け方</h2>
    <dl class="faq">${D.stages.map(([h,t,r])=>`<dt>${esc(h)}</dt><dd><b>起きること：</b>${esc(t)}<br><b>抜け方：</b>${esc(r)}</dd>`).join("")}</dl>
  </section>

  <section class="card">
    <h2>収入が伸びる型：週5時間の配分例</h2>
    <ul class="titles">${D.alloc.map(([h,t])=>`<li><b>${esc(h)}</b><span class="sub">${esc(t)}</span></li>`).join("")}</ul>
    <p>${esc(D.gear)}</p>
    <p class="sub">${esc(D.metric)}配分は一般的な目安で、収益を保証するものではありません。</p>
  </section>

  <section class="card">
    <h2>${esc(T.short)}タイプに向いてる副業</h2>
    <div class="jobs">${jobs.map(j=>`
      <a class="job" href="${href(jobPath(j))}"><b>${esc(j.name)}</b>${jobMeta(j)}<span class="more">くわしく見る →</span></a>`).join("")}
    </div>
    <p class="sub">避けた方がいい副業：${esc(T.avoid[0])}（${esc(T.avoid[1])}）</p>
  </section>

  <section class="card">
    <h2>称号4つの使い方</h2>
    <p class="sub">診断では、2番目に強い素質によって称号が変わります。</p>
    <dl class="faq">${KEYS.filter(s=>s!==k).map(s=>`<dt>${esc(titleOf(k,s))}（${esc(TYPES[s].short)}の素質）</dt><dd>${esc(D.titles[s])}</dd>`).join("")}</dl>
  </section>

  <section class="card">
    <h2>はじめの一歩のコツ</h2>
    <ul>${X.tips.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>
  </section>

  <section class="card">
    <h2>Lv1〜Lv4ロードマップ</h2>
    <ol class="road">${D.roadmap.map(([lv,todo,change,stuck])=>`<li><b>${esc(lv)}</b><span>やること：${esc(todo)}</span><span>変わること：${esc(change)}</span><span class="sub">つまずき所：${esc(stuck)}</span></li>`).join("")}</ol>
    <p class="sub">金額は目標の目安で、達成や収益を保証するものではありません。</p>
  </section>

  <section class="card">
    <h2>相棒と組むなら</h2>
    <p>${esc(D.partner)}</p>
    <a class="pair" href="${href(typePath(g[0]))}">${charSVG(g[0],true)}<span><b>最高の相棒：${esc(typeLabel(g[0]))}</b><br><span class="sub">${esc(g[1])}</span></span></a>
    <a class="pair" href="${href(typePath(o[0]))}">${charSVG(o[0])}<span><b>真逆のタイプ：${esc(typeLabel(o[0]))}</b><br><span class="sub">${esc(o[1])}</span></span></a>
  </section>

  <section class="card">
    <h2>よくある疑問</h2>
    <dl class="faq">${D.faq.map(([q,a])=>`<dt>${esc(q)}</dt><dd>${esc(a)}</dd>`).join("")}</dl>
  </section>
  </article>

${guideHtml(guidesFor(k))}${k==="W"&&serverCmp?cmpCard(href,serverCmp,"ブログを始めるときに迷いやすい、レンタルサーバーの選び方を比べました。"):""}${cta(href,`あなたは${T.short}タイプ？`)}

  <section class="card">
    <h2>ほかのタイプ</h2>
    <p class="sub"><a href="${href(CHARS)}#c-${T.slug}">${esc(T.chara)}のキャラクター紹介と相性表</a></p>
    <div class="others">${KEYS.map(s=>s===k?"":`<a href="${href(typePath(s))}">${charSVG(s)}${esc(TYPES[s].short)}</a>`).join("")}</div>
  </section>
`});
}

// ---- 副業別ページ ----
function jobPage(j){
  const T=TYPES[j.t],X=JOB_EXTRA[j.id],path=jobPath(j);
  const linkKeys=[...new Set(j.plan.map(p=>p[2]).filter(live))];
  const first=j.plan.find(p=>isAd(p[2]));
  const same=JOBS.filter(x=>x.t===j.t&&x.id!==j.id);
  const title=`${j.name}の始め方と最初の30日プラン｜${NAME}`;
  const desc=`${j.name}の初期費用（${j.costLabel}）、必要な時間（週${j.h}時間〜）、最初の収入までの期間（${j.first}）、半年後の目安（${j.month}）と、最初の30日でやることを解説します。`;
  return page({path,title,desc,crumbs:[[NAME,""],["タイプと副業の一覧",GUIDE],[j.name,path]],body:href=>`
  <article>
  <header class="card">
    <p class="sub"><a href="${href(typePath(j.t))}">${esc(typeLabel(j.t))}</a>に向いてる副業</p>
    <h1>${esc(j.name)}の始め方と最初の30日プラン</h1>
    ${jobMeta(j)}
    <p>${esc(j.real)}</p>
  </header>
${first?`
  <section class="card first">
    <p class="kicker">今日やる最初の一歩</p>
    <p>${esc(first[1])}</p>
    ${svcCard(first[2],"job_top",j.id)}
    <p class="pr">PR：広告（アフィリエイト）リンクです。登録は無料です。</p>
  </section>
`:""}
  <section class="card">
    <h2>${esc(j.name)}の目安</h2>
    <table>
      <tr><th>初期費用</th><td>${esc(j.costLabel)}</td></tr>
      <tr><th>必要な時間</th><td>週${j.h}時間〜</td></tr>
      <tr><th>顔出し・声出し</th><td>${FACE[j.face]}</td></tr>
      <tr><th>最初の収入まで</th><td>${esc(j.first)}</td></tr>
      <tr><th>半年後の目安</th><td>${esc(j.month)}</td></tr>
      <tr><th>始めやすさ</th><td><span class="stars">${stars(j.ease)}</span></td></tr>
    </table>
  </section>

  <section class="card">
    <h2>${esc(j.name)}に向いている人</h2>
    <ul>${X.who.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>
    <a class="pair" href="${href(typePath(j.t))}">${charSVG(j.t,true)}<span><b>${esc(typeLabel(j.t))}</b><br><span class="sub">${esc(T.catch)}</span></span></a>
  </section>

  <section class="card" id="plan">
    <h2>最初の30日プラン</h2>
    <ol class="plan">${j.plan.map(([d,text,lk])=>`<li><span class="day">${d}日目</span><span>${esc(text)}${live(lk)?`${svcCard(lk,"plan_step",j.id)}`:""}</span></li>`).join("")}</ol>
    ${linkKeys.some(isAd)?`<p class="pr">PR：プラン内のリンクは広告（アフィリエイト）を含みます。</p>`:""}
    <p class="sub">診断を受けると、このプランにチェックをつけて進み具合を記録できます。</p>
  </section>

  <section class="card">
    <h2>よくある質問</h2>
    <dl class="faq">${X.faq.map(([q,a])=>`<dt>${esc(q)}</dt><dd>${esc(a)}</dd>`).join("")}</dl>
  </section>
  </article>

${exitCards(href,j)}
${j.id==="blog"&&serverCmp?cmpCard(href,serverCmp,"ブログの土台になるレンタルサーバーを、月額・初期費用・サポートなどで比べました。"):""}${cta(href,`${j.name}があなたに向いているか、診断で確かめる`)}

  <section class="card">
    <h2>${esc(T.short)}タイプに向いてるほかの副業</h2>
    <ul class="links">${same.map(x=>`<li><a href="${href(jobPath(x))}">${esc(x.name)}</a></li>`).join("")}</ul>
  </section>
`});
}

// ---- 一覧ページ ----
function guidePage(){
  const title=`副業タイプ5種類と副業${JOBS.length}種類の一覧｜${NAME}`;
  const desc=`${NAME}の5つのタイプ（書く・話す・作る・売る・こなす）と、それぞれに向いている副業${JOBS.length}種類の初期費用・必要な時間・収入の目安を一覧で比べられます。`;
  return page({path:GUIDE,title,desc,crumbs:[[NAME,""],["タイプと副業の一覧",GUIDE]],body:href=>`
  <h1>副業タイプと副業の一覧</h1>
  <p class="sub">${NAME}では、11の質問からあなたを5つのタイプのどれかに分け、タイプと今の条件（時間・お金・顔出し）に合う副業を選びます。</p>
${KEYS.map(k=>`
  <section class="card">
    <a class="pair" href="${href(typePath(k))}">${charSVG(k,true)}<span><b>${esc(typeLabel(k))}</b><br><span class="sub">${esc(TYPES[k].catch)}</span></span></a>
    <div class="jobs">${JOBS.filter(j=>j.t===k).map(j=>`
      <a class="job" href="${href(jobPath(j))}"><b>${esc(j.name)}</b>${jobMeta(j)}</a>`).join("")}
    </div>
  </section>`).join("")}

  ${PUB.length?`<section class="card">
    <h2>条件から探す</h2>
    <p><a href="${href(CONDS)}">顔出しなし・初期費用0円・週3時間以内など、条件から副業を探す</a></p>
  </section>

`:""}  <section class="card">
    <h2>副業の悩みコラム</h2>
    ${columnList(href,COLUMNS)}
  </section>

${cta(href,"あなたはどのタイプ？")}
`});
}

// ---- コラム ----
const columnList=(href,list)=>`<ul class="links">${list.map(c=>`<li><a href="${href(columnPath(c))}">${esc(c.title)}</a></li>`).join("")}</ul>`;
const related=(href,list)=>list.length?`  <section class="card">
    <h2>関連コラム</h2>
    ${columnList(href,list)}
  </section>
`:"";
const jobCards=(href,ids)=>`<div class="jobs">${ids.map(id=>{const j=JOB_BY_ID[id];return `
      <a class="job" href="${href(jobPath(j))}"><b>${esc(j.name)}</b>${jobMeta(j)}<span class="more">始め方を見る →</span></a>`}).join("")}
    </div>`;
function block(href,b){
  if(typeof b==="string")return `<p>${esc(b)}</p>`;
  if(b.ul)return `<ul>${b.ul.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>`;
  if(b.ol)return `<ol>${b.ol.map(s=>`<li>${esc(s)}</li>`).join("")}</ol>`;
  if(b.jobs)return jobCards(href,b.jobs);
  if(b.aff)return affLinks(b.aff.filter(live));
  if(b.cta)return `<div class="cta mid"><p><b>${esc(b.cta)}</b></p><p class="sub">11問・約2分・登録不要。今の時間とお金で始められる副業と、最初の30日プランがわかります。</p><a class="primary" href="${href("")}" data-track="page_to_quiz" data-place="column_mid">無料で診断する</a></div>`;
  if(b.note)return `<p class="sub">${esc(b.note)}</p>`;
  if(b.link)return `<p><a href="${href(b.link[0])}">${esc(b.link[1])}</a></p>`;
  throw new Error("column-data.mjs に知らない形の中身があります: "+JSON.stringify(b));
}
function columnPage(c){
  const path=columnPath(c);
  return page({path,title:`${c.title}｜${NAME}`,desc:c.desc,crumbs:[[NAME,""],["副業の悩みコラム",COLUMN],[c.short,path]],body:href=>`
  <article>
  <header class="card">
    <h1>${esc(c.title)}</h1>
    <p class="sub"><time datetime="${c.updated}">${c.updated.replace(/^(\d+)-0?(\d+)-0?(\d+)$/,"$1年$2月$3日")}更新</time></p>
    <p>${esc(c.lead)}</p>
  </header>
${c.sections.map(([h,bs])=>`
  <section class="card">
    <h2>${esc(h)}</h2>
    ${bs.map(b=>block(href,b)).join("\n    ")}
  </section>`).join("")}
  </article>

${cta(href,"自分に向いてる副業を、診断で確かめる")}

  <section class="card">
    <h2>ほかのコラム</h2>
    ${columnList(href,COLUMNS.filter(x=>x!==c))}
  </section>
`});
}
function columnIndex(){
  const title=`副業の悩みコラム｜${NAME}`;
  const desc=`副業を始める前の「何から始める？」「会社にバレる？」「経費はどこまで？」などの悩みに答えるコラムの一覧です。`;
  return page({path:COLUMN,title,desc,crumbs:[[NAME,""],["副業の悩みコラム",COLUMN]],body:href=>`
  <h1>副業の悩みコラム</h1>
  <p class="sub">副業を始める前と、始めたばかりのころによくある悩みに答えます。</p>
${COLUMNS.map(c=>`
  <a class="job card" href="${href(columnPath(c))}"><b>${esc(c.title)}</b><span class="sub">${esc(c.desc)}</span><span class="more">読む →</span></a>`).join("")}

${cta(href,"あなたに向いてる副業は？")}
`});
}


// ---- プライバシーポリシー・運営者情報（独立ページ） ----
const contactMail="info@mini-shindan.com";
function privacyPage(){
  return page({path:PRIVACY,title:`プライバシーポリシー・免責事項｜${NAME}`,desc:`${NAME}（ミニ診断）のアクセス解析・広告・診断データの扱い、お問い合わせ先、免責事項です。`,crumbs:[[NAME,""],["プライバシーポリシー・免責事項",PRIVACY]],body:href=>`
  <article class="card">
    <h1>プライバシーポリシー・免責事項</h1>
    <h2>アクセス解析について</h2>
    <p>当サイトはサイトの改善のため、Googleによるアクセス解析ツール「Google アナリティクス」を使用しています。Google アナリティクスはCookieを使用してトラフィックデータを収集しますが、個人を特定する情報は含みません。収集を拒否したい場合は、ブラウザの設定でCookieを無効にしてください。詳しくは<a href="https://policies.google.com/technologies/partner-sites?hl=ja" target="_blank" rel="noopener">Googleのポリシー</a>をご覧ください。</p>
    <h2>広告について</h2>
    <p>当サイトはアフィリエイトプログラム（A8.net、もしもアフィリエイト等）に参加しており、紹介した商品・サービスの申し込みや購入があった場合に報酬を受け取ることがあります。Amazonのアソシエイトとして、当サイトは適格販売により収入を得ています。広告主のサービスに関するお問い合わせは、各サービスへ直接お願いします。くわしくは<a href="${href(ABOUT)}">運営者情報・広告について</a>をご覧ください。</p>
    <h2>診断データについて</h2>
    <p>診断の回答と結果、30日プランのチェックはお使いの端末（ブラウザのlocalStorage）にのみ保存され、運営者のサーバーには送信されません。ブラウザのデータを消すと、保存した結果とチェックも消えます。ホーム画面に追加した場合も、ページと画像の一部（キャッシュ）をお使いの端末に保存するだけで、運営者のサーバーには何も送りません。</p>
    <h2>お問い合わせ</h2>
    <p>当サイトへのお問い合わせは、<a href="mailto:${contactMail}">${contactMail}</a> までお願いします。</p>
    <h2>免責事項</h2>
    <p>掲載している費用・期間・収入は一般的な目安であり、正確性や収益を保証するものではありません。当サイトの情報を利用したことで生じた損害について、運営者は責任を負いかねます。この診断は娯楽・参考用です。</p>
  </article>
`});
}
function aboutPage(){
  return page({path:ABOUT,title:`運営者情報・広告について｜${NAME}`,desc:`${NAME}（ミニ診断）の運営者情報、お問い合わせ先、広告（アフィリエイト）に関する方針です。`,crumbs:[[NAME,""],["運営者情報・広告について",ABOUT]],body:href=>`
  <article class="card">
    <h1>運営者情報・広告について</h1>
    <h2>運営者情報</h2>
    <table>
      <tr><th>サイト名</th><td>ミニ診断（${NAME}）</td></tr>
      <tr><th>お問い合わせ</th><td><a href="mailto:${contactMail}">${contactMail}</a></td></tr>
      <tr><th>サイトの内容</th><td>11問の質問から、タイプと向いてる副業、最初の30日プランを案内する無料の診断サイトです。登録は不要です。</td></tr>
    </table>
    <h2>広告（アフィリエイト）について</h2>
    <p>当サイトは、A8.netなどのアフィリエイトプログラムを利用しています。サービス名つきのカードや「PR」と書かれたリンクは広告で、そこから申し込みや購入があると、運営者に報酬が入ることがあります。利用者の料金が増えることはありません。</p>
    <h2>広告を選ぶときの方針</h2>
    <ul>
      <li>成果の条件が「無料登録」「無料体験」「出品」など、利用者に大きな負担のないものを中心に選びます。</li>
      <li>診断の結果や副業の紹介は、広告の有無で変えていません。</li>
      <li>広告リンクは「PR」の表示またはサービス名のカードにして、通常のリンクと区別できるようにします。</li>
      <li>収入の目安は一般的な範囲で、必ず稼げるとは書きません。</li>
    </ul>
    <p class="sub">くわしくは<a href="${href(PRIVACY)}">プライバシーポリシー・免責事項</a>をご覧ください。</p>
  </article>
`});
}

// ---- トップページのランディング部分（index.html の landing:begin〜end の間を作り直す） ----
const FAQ=[
  ["診断は無料ですか？","はい、無料です。診断も、結果も、30日プランも、お金はかかりません。"],
  ["登録は必要ですか？","いいえ、登録もログインも不要です。メールアドレスなどの入力もありません。"],
  ["結果は保存されますか？","結果と30日プランのチェックは、お使いの端末（ブラウザ）の中だけに保存されます。運営者のサーバーには送られません。ブラウザのデータを消すと、保存した結果も消えます。"],
  ["どれくらい時間がかかりますか？","11問で、約2分です。選択肢をタップするだけで進みます。"],
  ["診断結果は当たりますか？","この診断は娯楽・参考用です。タイプは回答の傾向から決めているもので、向き不向きを断定するものではありません。副業を選ぶときのきっかけにしてください。"],
  ["副業で必ず稼げますか？","いいえ。収入は始め方や続けた期間で大きく変わり、最初の数か月はほとんど収入がないのがふつうです。サイトに書いている金額は一般的な目安で、収益を保証するものではありません。"],
  ["広告が含まれているのはなぜですか？","サイトの運営費のため、アフィリエイト広告を載せています。広告リンクには「PR」を表示しています。診断の結果は広告の有無で変えていません。"]
];
// ---- 特集ページ（季節バナーの行き先。tools/season-data.mjs） ----
const featPath=f=>`${BASE}feature/${f.slug}/`;
const TOOL_TITLES={hourly:"副業時給計算機","target":"月1万円逆算ツール","tax-flow":"確定申告フローチェック",schedule:"週の副業時間割シミュレータ",freetime:"スキマ時間ツール"};
const FEATS=FEATURES.filter(f=>f.cards.length);
const featCard=(href,c)=>{
  if(c.type==="column"){const x=COLUMNS.find(y=>y.slug===c.slug);return `<a class="job" href="${href(columnPath(x))}"><b>${esc(x.title)}</b><span class="more">読む →</span></a>`}
  if(c.type==="job"){const j=JOB_BY_ID[c.slug];return `<a class="job" href="${href(jobPath(j))}"><b>${esc(j.name)}</b>${specLine(j)}<span class="more">始め方を見る →</span></a>`}
  if(c.type==="cond"){const x=CONDITIONS.find(y=>y.slug===c.slug);return `<a class="job" href="${href(condPath(x))}"><b>${esc(x.title)}</b><span class="more">条件から探す →</span></a>`}
  if(c.type==="unsei")return `<a class="job" href="${href(UNSEI_TOP+UNSEI.slug.replace(/^unsei\//,""))}"><b>${esc(c.label)}</b>${c.note?`<span class="sub">${esc(c.note)}</span>`:""}<span class="more">見てみる →</span></a>`;
  if(c.type==="tool")return `<a class="job" href="${href(TOOLS_DIR+c.slug+"/")}"><b>${esc(TOOL_TITLES[c.slug])}</b><span class="more">使ってみる →</span></a>`;
  const k=KEYS.find(x=>TYPES[x].slug===c.slug);return `<a class="job" href="${href(typePath(k))}"><b>${esc(typeLabel(k))}</b><span class="more">くわしく見る →</span></a>`;
};
function featurePage(f){
  const path=featPath(f),T=TYPES[f.chara];
  return page({path,title:`${f.title}｜${NAME}`,desc:f.lead,ptype:"feature",crumbs:[[NAME,""],["特集",path],[f.title,path]],body:href=>`
  <article>
  <header class="card hero">
    ${charSVG(f.chara,true)}
    <p class="sub">${esc(T.animal)}の「${esc(T.chara)}」より</p>
    <h1>${esc(f.title)}</h1>
    <p class="catch">${esc(T.catch)}</p>
    <p class="left">${esc(f.lead)}</p>
  </header>
  <section class="card"><h2>関連ページ</h2><div class="jobs">
    ${f.cards.map(c=>featCard(href,c)).join("\n    ")}
  </div></section>
${cta(href,"あなたに向いてる副業を診断する")}
  </article>
`});
}
// 季節バナー：トップに差し込む（期間外は何も出ない）。リンク先が公開されている季節だけ載せる
const SEASON_PUB=[...SEASONS.filter(s=>s.href===UNSEI.slug||FEATS.some(f=>s.href===featPath(f)))].map(s=>({...s,svg:charSVG(s.chara,true)}));
const seasonScript=()=>`<script>
(function(){
  var S=${JSON.stringify(SEASON_PUB)},d=new Date(),p=function(n){return(n<10?"0":"")+n};
  var t=d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate()),s=null;
  for(var i=0;i<S.length;i++)if(t>=S[i].from&&t<=S[i].to){s=S[i];break}
  var el=document.getElementById("seasonBanner");if(!s||!el)return;
  document.documentElement.setAttribute("data-season",s.theme||"");
  el.innerHTML=s.svg+'<span><b></b><br><span class="sub"></span></span>';
  el.querySelector("b").textContent=s.title;el.querySelector(".sub").textContent=s.text;
  el.href=s.href;el.hidden=false;
  el.addEventListener("click",function(){if(window.track)track("season_click",{season:s.id})});
  if(window.track)track("season_view",{season:s.id});
})();
</script>`;

// ---- キャラクターのページ（C10）・更新履歴（C11）・ガイドカード（C9） ----
const CHARS="characters/",NEWSP="news/",COMICSP=`${CHARS}comics/`;
const PAIR_DATA=vm.runInNewContext(html.slice(html.indexOf("const PAIR={"),html.indexOf("function pairOf"))+";PAIR");
const pairOfKeys=(a,b)=>{const key=[a,b].sort((x,y)=>KEYS.indexOf(x)-KEYS.indexOf(y)).join("");return PAIR_DATA[key]};
const comicsPub=PREVIEW&&!COMICS.length?[{slug:"sample",date:"2026-01-01",title:"（確認用の仮データ）",chara:["W","V"],panels:[{who:"W",text:"テスト"},{who:"V",text:"テスト"},{who:"",text:"テスト"},{who:"W",text:"テスト"}]}]:COMICS;
const comicPath=c=>`${COMICSP}${c.slug}/`;
function charactersPage(){
  const path=CHARS;
  const title=`キャラクター紹介と相性表｜${NAME}`;
  const desc="診断に出てくる5匹のキャラ（フクロウのフミ、インコのピーチ、ビーバーのポコ、キツネのコン、ミツバチのハニ）の性格・口ぐせ・得意と苦手、5×5の相性表をまとめました。";
  return page({path,title,desc,ptype:"characters",crumbs:[[NAME,""],["キャラクター",path]],body:href=>`
  <article>
  <header class="card hero season-hero">
    <div class="zk-line">${KEYS.map(k=>charSVG(k,true)).join("")}</div>
    <h1>キャラクター紹介</h1>
    <p class="left">診断に出てくる5匹の相棒です。タイプ別のページと、称号図鑑にもつながっています。</p>
  </header>
${KEYS.map(k=>{const T=TYPES[k];return `  <section class="card" id="c-${T.slug}">
    <div class="pair">${charSVG(k,true)}<span><b>${esc(T.animal)}の「${esc(T.chara)}」</b><br><span class="sub">${esc(T.short)}タイプ（${esc(T.role)}）</span></span></div>
    <p class="catch">${esc(T.catch)}</p>
    <h2>性格</h2><p>${esc(T.desc)}</p>
    <h2>口ぐせ</h2><ul>${T.serif.map(s=>`<li>「${esc(s)}」</li>`).join("")}</ul>
    <h2>得意なこと</h2><ul>${T.str.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>
    <h2>苦手なこと</h2><p>${esc(T.weak.replace(/^つまずきやすい点：/,""))}</p>
    <p><a href="${href(typePath(k))}">${esc(T.short)}タイプをくわしく見る</a>・<a href="${href(ZUKAN)}#zk-${T.slug}">${esc(T.chara)}の称号を図鑑で見る</a></p>
  </section>`}).join("\n")}
  <section class="card">
    <h2>相性表（5×5）</h2>
    <p class="sub">メインタイプどうしの組み合わせです。パーセントはこのサイトの診断上の目安で、娯楽・参考用です。</p>
    <div class="tbl"><table><thead><tr><th></th>${KEYS.map(k=>`<th>${esc(TYPES[k].chara)}</th>`).join("")}</tr></thead><tbody>
${KEYS.map(a=>`<tr><th>${esc(TYPES[a].chara)}</th>${KEYS.map(b=>{const P=pairOfKeys(a,b);return `<td><b>${esc(P[0])}</b><br>${P[1]}%</td>`}).join("")}</tr>`).join("\n")}
    </tbody></table></div>
    <p class="sub">診断の結果では、友達と診断すると、2人のコンビ名と一言が出ます。</p>
  </section>
  ${comicsPub.length?`<section class="card"><h2>キャラの4コマ・掛け合い</h2><ul class="links">${comicsPub.map(c=>`<li><a href="${href(comicPath(c))}">${esc(c.title)}</a>（${esc(c.date)}）</li>`).join("")}</ul></section>`:""}
${cta(href,"あなたはどの子？")}
  </article>
`});
}
function comicPage(c){
  return page({path:comicPath(c),title:`${c.title}｜キャラの4コマ｜${NAME}`,desc:`${c.title}。${c.chara.map(k=>TYPES[k].chara).join("と")}の掛け合い。`,ptype:"characters",crumbs:[[NAME,""],["キャラクター",CHARS],[c.title,comicPath(c)]],body:href=>`
  <article>
  <header class="card hero"><div class="zk-line">${c.chara.map(k=>charSVG(k,true)).join("")}</div><h1>${esc(c.title)}</h1><p class="sub">${esc(c.date)}</p></header>
  <section class="card">${c.panels.map((p,i)=>`<div class="panel"><span class="sub">${i+1}コマ目</span><p>${p.who?`<b>${esc(TYPES[p.who].chara)}</b>「${esc(p.text)}」`:esc(p.text)}</p></div>`).join("")}</section>
  <p><a href="${href(CHARS)}">キャラクター紹介へ</a></p>
  </article>
`});
}
const newsPath=n=>`${NEWSP}${n.slug}/`;
const KIND={update:"更新",diary:"開発日誌"};
function newsIndex(){
  return page({path:NEWSP,title:`更新履歴・開発日誌｜${NAME}`,desc:"機能やコンテンツの追加の記録と、短い開発日誌です。",ptype:"news",crumbs:[[NAME,""],["更新履歴",NEWSP]],body:href=>`
  <article>
  <header class="card hero">${charSVG("C",true)}<h1>更新履歴・開発日誌</h1><p class="left">サイトに追加した機能とコンテンツの記録です。</p></header>
  <section class="card"><ul class="news">${[...NEWS].sort((a,b)=>b.date.localeCompare(a.date)).map(n=>`<li><span class="sub">${esc(n.date)}　${KIND[n.kind]||"更新"}</span><br><a href="${href(newsPath(n))}">${esc(n.title)}</a></li>`).join("")}</ul></section>
  </article>
`});
}
function newsPage(n){
  return page({path:newsPath(n),title:`${n.title}｜更新履歴｜${NAME}`,desc:n.body[0],ptype:"news",crumbs:[[NAME,""],["更新履歴",NEWSP],[n.title,newsPath(n)]],body:href=>`
  <article class="card">
  <p class="sub">${esc(n.date)}　${KIND[n.kind]||"更新"}</p>
  <h1>${esc(n.title)}</h1>
  ${n.body.map(p=>`<p>${esc(p)}</p>`).join("")}
  ${n.href?`<p><a href="${href(n.href)}">関連ページを見る</a></p>`:""}
  <p><a href="${href(NEWSP)}">更新履歴の一覧へ</a></p>
  </article>
`});
}
// ガイドカード（自社商品）。商品が無い間は何も出さない
const GUIDES_PUB=(()=>{
  const g=(PREVIEW&&!GUIDES.length)?[{id:"sample",enabled:true,title:"（確認用の仮データ）",types:[],price:"1,000円",url:"https://example.com/",summary:"確認用です。"}]:GUIDES;
  const on=g.filter(x=>x.enabled);
  for(const x of on){if(!PREVIEW&&(GUIDE_BANNED.test(x.title)||GUIDE_BANNED.test(x.summary)))throw new Error(`guide-data.mjs の ${x.id} に、収入や成果を約束する表現があります`);if(!x.title||!x.price||!/^https:\/\//.test(x.url))throw new Error(`guide-data.mjs の ${x.id} に title・price・https の url が必要です`)}
  return on;
})();
const guideHtml=(gs)=>gs.length?`<section class="card guide-card" aria-label="自社のガイド">${gs.map(x=>`<div class="guide"><p class="kicker">自社のガイド（広告ではありません）</p><h2>${esc(x.title)}</h2><p>${esc(x.summary)}</p><p><b>${esc(x.price)}</b>　<a class="primary" href="${esc(x.url)}" target="_blank" rel="noopener" data-track="guide_click" data-place="${esc(x.id)}">販売ページを見る</a></p></div>`).join("")}</section>`:"";
const guidesFor=k=>GUIDES_PUB.filter(x=>!x.types.length||x.types.includes(k));
const guideScript=()=>GUIDES_PUB.length?`<script>
window.renderGuide=function(k){
  var G=${JSON.stringify(GUIDES_PUB.map(x=>({id:x.id,title:x.title,types:x.types,price:x.price,url:x.url,summary:x.summary})))},el=document.getElementById("guideSlot");if(!el)return;
  var list=G.filter(function(x){return!x.types.length||x.types.indexOf(k)>=0});
  el.innerHTML="";if(!list.length){el.hidden=true;return}
  list.forEach(function(x){var d=document.createElement("div");d.className="guide";
    var p=document.createElement("p");p.className="sub";p.textContent="自社のガイド（広告ではありません）";
    var h=document.createElement("h2");h.textContent=x.title;var s=document.createElement("p");s.textContent=x.summary;
    var l=document.createElement("p"),b=document.createElement("b");b.textContent=x.price+"　";var a=document.createElement("a");a.className="primary";a.href=x.url;a.target="_blank";a.rel="noopener";a.textContent="販売ページを見る";
    a.onclick=function(){if(window.track)track("guide_click",{guide:x.id})};
    l.appendChild(b);l.appendChild(a);d.appendChild(p);d.appendChild(h);d.appendChild(s);d.appendChild(l);el.appendChild(d)});
  el.hidden=false;
};
</script>`:"";

function landing(){
  const first=j=>j.plan.slice(0,3);
  const ex=JOB_BY_ID.writer; // 結果の実例：Webライター（書くタイプ）
  const top=[...JOBS].sort((a,b)=>b.ease-a.ease||a.cost-b.cost).slice(0,6);
  return `<h2>この診断でわかること</h2>
    <div class="lp-3">
      <div><b>1. あなたの副業タイプ</b>11問の回答から、5タイプと「第2の素質」で称号を決めます（全20種）。
        <p class="ex">結果の例：${esc(typeLabel("W"))}。「${esc(TYPES.W.catch)}」</p></div>
      <div><b>2. 今のあなたにできる副業</b>時間・お金・顔出しの条件で絞り込み、初期費用や収入の目安もそのまま見られます。
        <p class="ex">例：${esc(ex.name)}（初期費用 ${esc(ex.costLabel)}・週${ex.h}時間〜・半年後の目安 ${esc(ex.month)}）</p></div>
      <div><b>3. 最初の30日プラン</b>日ごとにやることを並べ、チェックをつけて進められます。
        <p class="ex">例（${esc(ex.name)}）：${first(ex).map(([d,t])=>`${d}日目 ${esc(t)}`).join(" → ")}</p></div>
    </div>
    <h2 style="margin-top:22px">5つのタイプ</h2>
    <p class="lead">タップすると、それぞれの特徴と向いてる副業を読めます。</p>
    <div class="lp-types">${KEYS.map(k=>`<a href="${typePath(k)}">${charSVG(k)}<b>${esc(TYPES[k].short)}</b><br>${esc(TYPES[k].animal)}</a>`).join("")}</div>
    <h2 style="margin-top:22px">始めやすい副業</h2>
    <p class="lead">「始めやすさ」の評価が高い順に並べています（人気ランキングではありません）。</p>
    <div class="lp-jobs">${top.map(j=>`<a class="lp-job" href="${jobPath(j)}"><b>${esc(j.name)}</b><div class="meta"><span>初期費用 ${esc(j.costLabel)}</span><span>週${j.h}時間〜</span><span>半年後の目安 ${esc(j.month)}</span><span>始めやすさ <span class="stars">${stars(j.ease)}</span></span></div></a>`).join("")}</div>
    <p class="sub" style="margin:12px 0 4px">すべての副業（${JOBS.length}種類）</p>
    <div class="lp-all">${JOBS.map(j=>`<a href="${jobPath(j)}">${esc(j.name)}</a>`).join("")}</div>
    <h2 style="margin-top:22px">副業の悩みコラム</h2>
    <ul class="cols">${COLUMNS.map(c=>`<li><a href="${columnPath(c)}">${esc(c.title)}</a></li>`).join("")}</ul>
    <p><a class="more" href="${COLUMN}">コラムをすべて見る</a>・<a class="more" href="${GUIDE}">タイプと副業の一覧</a>・<a class="more" href="${ZUKAN}">称号図鑑</a>・<a class="more" href="${TOOLS_DIR}">ミニ計算ツール</a>・<a class="more" href="${TSUMAZUKI.slug}">つまずきタイプ診断</a>・<a class="more" href="${CHARS}">キャラクター</a>・<a class="more" href="${NEWSP}">更新履歴</a>${PUB.length?`・<a class="more" href="${CONDS}">条件から探す</a>`:""}</p>
    <h2 style="margin-top:22px">よくある質問</h2>
    <dl>${FAQ.map(([q,a])=>`<dt>${esc(q)}</dt><dd>${esc(a)}</dd>`).join("")}</dl>
    ${seasonScript()}${guideScript()}
    <script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"FAQPage",mainEntity:FAQ.map(([q,a])=>({"@type":"Question",name:q,acceptedAnswer:{"@type":"Answer",text:a}}))})}</script>`;
}
{
  const a="<!--landing:begin-->",b="<!--landing:end-->";
  const i=html.indexOf(a),j=html.indexOf(b);
  if(i<0||j<0)throw new Error("index.html に landing:begin / landing:end がありません");
  const out=html.slice(0,i+a.length)+"\n"+landing()+"\n"+html.slice(j);
  if(out!==html)writeFileSync(join(ROOT,"index.html"),out);
}

// ---- 条件別ランディング ----
const condCta=(href,c)=>`  <div class="cta card">
    <p><b>${c?`「${esc(c.short)}」も条件にして診断する`:"あなたに向いてる副業を診断する"}</b></p>
    <p class="sub">11問・約2分・登録不要。${c&&c.quiz?"この条件は、条件の質問にあらかじめ選んだ状態で始まります（変更もできます）。":"あなたのタイプと、今の時間とお金で始められる副業、最初の30日プランがわかります。"}</p>
    <a class="primary" href="${href("")}${c&&c.quiz?`?cond=${c.slug}`:""}" data-track="page_to_quiz">無料で診断する</a>
  </div>`;
const specLine=j=>`<div class="meta"><span>初期費用 ${esc(j.costLabel)}</span><span>週${j.h}時間〜</span><span>半年後の目安 ${esc(j.month)}</span><span>始めやすさ <span class="stars">${stars(j.ease)}</span></span></div>`;
function conditionPage(c){
  const path=condPath(c),ok=JOBS.filter(c.ok),ng=JOBS.filter(j=>!c.ok(j));
  const T=TYPES[c.chara];
  const title=`${c.title}｜${NAME}`;
  const desc=`${c.title}を${JOBS.length}種類から${ok.length}つ紹介。初期費用・必要な時間・収入の目安つきで、向かない副業とその理由、失敗しやすい点も正直にまとめました。`;
  return page({path,title,desc,ptype:"condition",crumbs:[[NAME,""],["条件から探す",CONDS],[c.short,path]],body:href=>`
  <article>
  <header class="card hero">
    ${charSVG(c.chara,true)}
    <p class="sub">${esc(T.animal)}の「${esc(T.chara)}」より</p>
    <h1>${esc(c.title)}</h1>
    <p class="catch">${esc(T.catch)}</p>
    <div class="left">${c.intro.map(p=>`<p>${esc(p)}</p>`).join("")}</div>
  </header>

  <section class="card">
    <h2>条件に合う副業（${ok.length}つ）</h2>
    <p class="sub">${JOBS.length}種類のうち、${esc(c.rule)}を、診断と同じ基準で選びました。</p>
    <div class="jobs">${ok.map(j=>`
      <a class="job" href="${href(jobPath(j))}"><b>${esc(j.name)}</b>${specLine(j)}${c.okNote&&c.okNote(j)?`<span class="sub">※${esc(c.okNote(j))}</span>`:""}<span class="more">始め方を見る →</span></a>`).join("")}
    </div>
  </section>

  <section class="card">
    <h2>この条件に合わない副業（${ng.length}つ）</h2>
    <p class="sub">条件だけで選ぶと、あとでつらくなる副業です。理由も書いておきます。</p>
    ${ng.length?`<ul class="ngs">${ng.map(j=>`<li><a href="${href(jobPath(j))}">${esc(j.name)}</a><span class="sub">：${esc(c.why(j))}</span></li>`).join("")}</ul>`:`<p>${JOBS.length}種類すべてが条件に合います。</p>`}
  </section>

  <section class="card">
    <h2>この条件で失敗しやすい点</h2>
    <ul>${c.fail.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>
    <p>${esc(c.note)}</p>
  </section>

${condCta(href,c)}
  <p class="sub"><a href="${href(CONDS)}">ほかの条件から探す</a>・<a href="${href(GUIDE)}">タイプと副業の一覧</a></p>
  </article>
`});
}
function conditionHub(){
  const path=CONDS;
  const title=`条件から副業を探す（顔出しなし・初期費用0円など）｜${NAME}`;
  const desc=`顔出しなし、初期費用0円、週3時間以内、スマホだけなど、条件から向いてる副業を探せます。${JOBS.length}種類の副業を診断と同じ基準で絞り込んでいます。`;
  return page({path,title,desc,ptype:"condition",crumbs:[[NAME,""],["条件から探す",path]],body:href=>`
  <article>
  <header class="card hero">
    ${charSVG("S",true)}
    <h1>条件から副業を探す</h1>
    ${HUB_LEAD?`<p class="left">${esc(HUB_LEAD)}</p>`:""}
  </header>
  <section class="card">
    <div class="jobs">${PUB.map(c=>`
      <a class="job cond" href="${href(condPath(c))}">${charSVG(c.chara)}<span><b>${esc(c.title)}</b><span class="sub">${JOBS.filter(c.ok).length}つの副業</span></span></a>`).join("")}
    </div>
  </section>
${condCta(href,null)}
  </article>
`});
}

// ---- 称号図鑑 ----
function zukanPage(){
  const path=ZUKAN;
  const title=`称号図鑑｜全20種の副業タイプ称号一覧｜${NAME}`;
  const desc=`${NAME}で出会える全20種の称号を、5タイプのキャラ別に紹介。診断すると獲得した称号が図鑑に記録され、集めた数が分かります。`;
  const cards=(m,href)=>KEYS.filter(s=>s!==m).map(s=>`
      <a class="zk" href="${href(typePath(m))}" data-code="${m}${s}">${charSVG(m)}<span class="zk-t"><b>${esc(titleOf(m,s))}</b><span class="sub">「${esc(TYPES[s].short)}」の素質：${esc(TYPES[s].str[0])}も強み</span></span><span class="zk-h">${esc(TYPES[m].animal)} × ${esc(TYPES[s].short)}の素質</span></a>`).join("");
  return page({path,title,desc,ptype:"zukan",crumbs:[[NAME,""],["称号図鑑",path]],body:href=>`
  <article>
  <header class="card hero">
    <div class="zk-line">${KEYS.map(k=>charSVG(k,true)).join("")}</div>
    <h1>称号図鑑</h1>
    <p class="catch" id="zkCount">全20種</p>
    ${ZUKAN_LEAD?`<p class="left">${esc(ZUKAN_LEAD)}</p>`:""}
    <p class="left sub">称号は「メインのタイプ」と「第2の素質」の組み合わせで決まります（5タイプ × 4素質 = 全20種）。どの称号が出る確率も同じ約5%です（全員が同じ確率で回答した場合の計算値）。診断した端末にだけ、獲得状況が記録されます。</p>
    <p class="zk-badge" id="zkBadge" hidden>全20種コンプリート！</p>
  </header>
${KEYS.map(m=>`
  <section class="card" id="zk-${TYPES[m].slug}">
    <a class="pair" href="${href(typePath(m))}">${charSVG(m,true)}<span><b>${esc(typeLabel(m))}</b><br><span class="sub">${esc(TYPES[m].catch)}</span></span></a>
    <div class="zk-grid">${cards(m,href)}
    </div>
  </section>`).join("")}

${condCta(href,null)}
  </article>
  <script>
  (function(){
    var got=[];try{var a=JSON.parse(localStorage.getItem("shindan-titles"));if(Array.isArray(a))got=a}catch(e){}
    var cards=document.querySelectorAll(".zk"),n=0,rm=matchMedia("(prefers-reduced-motion: reduce)").matches;
    cards.forEach(function(el,i){
      var on=got.indexOf(el.dataset.code)>=0;
      if(on){n++;el.classList.add("got");if(!rm)el.style.animationDelay=(n*.05)+"s"}
      else{el.classList.add("lock");el.querySelector(".zk-t").innerHTML="<b>？？？</b>";el.setAttribute("aria-label","未獲得の称号："+el.querySelector(".zk-h").textContent)}
    });
    document.getElementById("zkCount").textContent="獲得 "+n+" ／ 20";
    if(n===cards.length)document.getElementById("zkBadge").hidden=false;
    if(window.gtag)gtag("event","zukan_view",{got:n});
  })();
  </script>
`});
}

// ---- ミニ計算ツール（/tools/<slug>/）。入力はブラウザの中だけで計算し、サーバーにも GA にも送らない ----
const TOOL_UPDATED="2026年11月時点";
const colLink=(href,slug,label)=>`<li><a href="${href(columnPath(COLUMNS.find(c=>c.slug===slug)))}">${esc(label||COLUMNS.find(c=>c.slug===slug).title)}</a></li>`;
const yenMax=s=>{let m=0;for(const [,n,man] of String(s).matchAll(/([\d,]+)(万)?/g)){const v=Number(n.replace(/,/g,""))*(man?10000:1);if(v>m)m=v}return m};
const TOOL_JOBS=JOBS.map(j=>({id:j.id,name:j.name,max:yenMax(j.month),month:j.month,h:j.h,ease:j.ease,cost:j.costLabel,url:jobPath(j)}));
const TOOL_JS=`
var $=function(i){return document.getElementById(i)};
var used=false,done=false;
function ev(n,p){if(window.gtag)gtag("event",n,p)}
function num(id){var v=parseFloat(String($(id).value).replace(/,/g,""));return isFinite(v)?v:NaN}
function yen(n){return Math.round(n).toLocaleString("ja-JP")}
function touched(slug){if(!used){used=true;ev("tool_use",{tool:slug})}}
function completed(slug){if(!done){done=true;ev("tool_complete",{tool:slug})}}
function copyText(t,btn,slug){
  function ok(){btn.textContent="コピーしました";setTimeout(function(){btn.textContent="結果をコピーする"},2000)}
  ev("share_click",{placement:"tool_"+slug});
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(ok,function(){fallback()});else fallback();
  function fallback(){var a=document.createElement("textarea");a.value=t;document.body.appendChild(a);a.select();try{document.execCommand("copy");ok()}catch(e){btn.textContent="コピーできませんでした"}document.body.removeChild(a)}
}
`;
function toolShell({slug,chara,title,desc,lead,form,result,after,script,path}){
  const T=TYPES[chara];
  return page({path,title:`${title}｜${NAME}`,desc,ptype:"tool",crumbs:[[NAME,""],["ミニ計算ツール",TOOLS_DIR],[title,path]],body:href=>`
  <article>
  <header class="card hero tool-hero">
    ${charSVG(chara,true)}
    <p class="tool-say">「${esc(lead)}」</p>
    <p class="sub">${esc(T.animal)}の「${esc(T.chara)}」がご案内します</p>
    <h1>${esc(title)}</h1>
  </header>
  <section class="card tool-card">
${form}
  </section>
  <section class="card tool-result" id="result" aria-live="polite">
${result}
  </section>
${after(href)}
  <p class="sub">入力した内容はこのページの中だけで計算し、サーバーや計測ツールには送りません。${TOOL_UPDATED}の内容です。</p>
  <p class="sub"><a href="${href(TOOLS_DIR)}">ほかのミニ計算ツール</a></p>
  </article>
  <script>${TOOL_JS}
${script}
  </script>
`});
}
const field=(id,label,unit,val,extra="")=>`    <label class="tool-f" for="${id}"><span>${label}</span><span class="tool-in"><input id="${id}" type="number" inputmode="decimal" min="0" step="any" value="${val}" ${extra}><b>${unit}</b></span></label>`;
const toolHub=()=>page({path:TOOLS_DIR,title:`ミニ計算ツール（副業時給・月1万円の逆算・確定申告の目安）｜${NAME}`,desc:"副業の時給、月1万円までに必要な件数、確定申告が必要かの目安を、1画面で計算できる無料ツール。入力した内容は送信されません。",ptype:"tool",crumbs:[[NAME,""],["ミニ計算ツール",TOOLS_DIR]],body:href=>`
  <article>
  <header class="card hero"><div class="zk-line">${["W","S","C"].map(k=>charSVG(k,true)).join("")}</div><h1>ミニ計算ツール</h1><p class="left">副業のお金と時間の目安を、1画面で確認できる4つのツールです。入力した内容はこのページの中だけで計算し、送信されません。</p></header>
  <section class="card"><div class="jobs">
    <a class="job cond" href="${href(TOOLS_DIR+"hourly/")}">${charSVG("W")}<span><b>副業時給計算機</b><span class="sub">収入と作業時間から、実際の時給を出します</span></span></a>
    <a class="job cond" href="${href(TOOLS_DIR+"target/")}">${charSVG("S")}<span><b>月1万円逆算ツール</b><span class="sub">目標までに必要な件数と作業量の目安</span></span></a>
    <a class="job cond" href="${href(TOOLS_DIR+"tax-flow/")}">${charSVG("C")}<span><b>確定申告フローチェック</b><span class="sub">申告が必要かどうかの目安を数問で確認</span></span></a>
    <a class="job cond" href="${href(TOOLS_DIR+"schedule/")}">${charSVG("W")}<span><b>週の副業時間割シミュレータ</b><span class="sub">平日と週末の空き時間から、1週間の時間の使い方の目安を出します</span></span></a>
    <a class="job cond" href="${href(TOOLS_DIR+"freetime/")}">${charSVG("W")}<span><b>スキマ時間ツール</b><span class="sub">1日の決まった予定を入れると、空き時間の目安がわかります</span></span></a>
  </div></section>
${cta(href,"まずは自分のタイプを知る")}
  </article>
`});

function hourlyPage(){
  const path=TOOLS_DIR+"hourly/",slug="hourly";
  return toolShell({slug,path,chara:"W",lead:"時給にすると、意外な数字が出ることもあります",
    title:"副業時給計算機",desc:"副業の月収と作業時間を入れるだけで、実際の時給と年間の収入の目安がわかる無料の計算機。入力内容は送信されません。",
    form:[field("inc","1か月の副業収入","円",30000),field("days","作業した日数（1か月）","日",8,'max="31"'),field("hrs","1日あたりの作業時間","時間",2,'max="24" step="0.25"')].join("\n"),
    result:`    <p class="kicker">結果</p>
    <p class="tool-big"><span id="rHour">―</span></p>
    <p class="sub" id="rSub">数字を入れると、時給が出ます。</p>
    <button class="primary tool-copy" id="copy" type="button" hidden>結果をコピーする</button>`,
    after:href=>`  <section class="card">
    <h2>時給を上げたいときは</h2>
    <p><b>単価を上げる</b>：同じ作業のまま、依頼者への単価交渉や、実績をそろえてからの値上げで時給は上がります。作業時間を記録しておくと、交渉の材料になります。</p>
    <p><b>副業を変える</b>：作業時間が長いわりに収入が増えないなら、別の副業のほうが合うかもしれません。</p>
    <ul class="links">${colLink(href,"10000-yen")}${colLink(href,"first-step")}<li><a href="${href(GUIDE)}">副業の一覧を見る</a></li>${PUB.length?`<li><a href="${href(CONDS)}">条件から副業を探す</a></li>`:""}</ul>
  </section>`,
    script:`
function calc(){
  var inc=num("inc"),d=num("days"),h=num("hrs");
  if(!(inc>=0)||!(d>0)||!(h>0)||d>31||h>24){$("rHour").textContent="―";$("rSub").textContent="収入・日数・時間を入れてください（日数は31日以下、時間は24時間以下）。";$("copy").hidden=true;return}
  var tot=d*h,hour=inc/tot;
  $("rHour").textContent="時給 約"+yen(hour)+"円";
  $("rSub").textContent="1か月の作業時間は"+(Math.round(tot*100)/100)+"時間。この収入が12か月続くと、年間で約"+yen(inc*12)+"円です。";
  $("copy").hidden=false;$("copy").onclick=function(){copyText("私の副業を時給にすると、約"+yen(hour)+"円でした。（ミニ診断「副業時給計算機」）https://mini-shindan.com/tools/hourly/",$("copy"),"hourly")};
  completed("hourly");
}
["inc","days","hrs"].forEach(function(i){$(i).addEventListener("input",function(){touched("hourly");calc()})});
calc();`});
}
function schedulePage(){
  const path=TOOLS_DIR+"schedule/",slug="schedule";
  return toolShell({slug,path,chara:"W",lead:"空き時間を入れると、1週間の使い方の目安が出ます",
    title:"週の副業時間割シミュレータ",desc:"平日と週末の空き時間を入れるだけで、1週間・1か月に使える副業時間と、時間に合う進め方の目安がわかる無料ツール。入力内容は送信されません。",
    form:[field("wd","平日（月〜金）1日あたり","分",30,'max="600" step="5"'),field("we","週末（土日）1日あたり","分",120,'max="900" step="5"')].join("\n"),
    result:`    <p class="kicker">結果</p>
    <p class="tool-big"><span id="rWeek">―</span></p>
    <p class="sub" id="rSub">数字を入れると、1週間に使える時間が出ます。</p>
    <p id="rPlan"></p>
    <button class="primary tool-copy" id="copy" type="button" hidden>結果をコピーする</button>`,
    after:href=>`  <section class="card">
    <h2>この時間割の使い方</h2>
    <p>表示されるのは、入れた時間から計算した目安です。副業や人によって、実際に必要な時間は変わります。無理のない範囲で、少なめに入れておくと続けやすくなります。</p>
    <ul class="links">${colLink(href,"first-step")}<li><a href="${href(TOOLS_DIR+"hourly/")}">副業時給計算機</a></li><li><a href="${href(GUIDE)}">副業の一覧を見る</a></li>${PUB.length?`<li><a href="${href(CONDS)}">条件から副業を探す</a></li>`:""}</ul>
  </section>`,
    script:`
function calc(){
  var wd=num("wd"),we=num("we");
  if(!(wd>=0)||!(we>=0)||wd>600||we>900){$("rWeek").textContent="―";$("rSub").textContent="分数を入れてください（平日は600分以下、週末は900分以下）。";$("rPlan").textContent="";$("copy").hidden=true;return}
  var wk=(wd*5+we*2)/60,mo=wk*52/12,r=function(x){return Math.round(x*10)/10};
  if(wk<=0){$("rWeek").textContent="週 0時間";$("rSub").textContent="時間が0分だと副業は進めにくいので、まず15分だけでも入れてみてください。";$("rPlan").textContent="";$("copy").hidden=true;return}
  $("rWeek").textContent="週 約"+r(wk)+"時間";
  $("rSub").textContent="1か月では約"+r(mo)+"時間。平日は1日"+wd+"分×5日、週末は1日"+we+"分×2日の計算です。";
  var t=wk<2?"週2時間未満の目安：1回15〜30分で終わる出品やデータ入力など、細切れで進められるものが合いやすい時間です。まず「毎週決まった曜日に1回」を目標にしましょう。":
    wk<5?"週2〜5時間の目安：平日は下調べや記録などの短い作業、週末にまとまった作業を入れる使い分けが合いやすい時間です。":
    wk<10?"週5〜10時間の目安：ライティングやブログなど、まとまった時間が必要な副業にも取り組める時間です。週1日は休む日を作ると続きやすくなります。":
    "週10時間以上の目安：かなり本格的に取り組める時間です。本業や休息に響かないよう、最初は予定の7〜8割で始めるのがおすすめです。";
  $("rPlan").textContent=t;
  $("copy").hidden=false;$("copy").onclick=function(){copyText("私が副業に使える時間は、週に約"+r(wk)+"時間でした。（ミニ診断「週の副業時間割シミュレータ」）https://mini-shindan.com/tools/schedule/",$("copy"),"schedule")};
  completed("schedule");
}
["wd","we"].forEach(function(i){$(i).addEventListener("input",function(){touched("schedule");calc()})});
calc();`});
}
function freetimePage(){
  const path=TOOLS_DIR+"freetime/",slug="freetime";
  return toolShell({slug,path,chara:"W",lead:"決まっている予定を引くと、空き時間が見えてきます",
    title:"スキマ時間ツール",desc:"1日の決まった予定（仕事・学校・睡眠・家事など）の時間を入れると、平日と週末の空き時間の目安がわかる無料ツール。入力内容は送信されません。",
    form:[field("bwd","平日1日の予定の合計","時間",15,'max="24" step="0.5"'),field("bwe","週末1日の予定の合計","時間",12,'max="24" step="0.5"')].join("\n"),
    result:`    <p class="kicker">結果</p>
    <p class="tool-big"><span id="rFree">―</span></p>
    <p class="sub" id="rSub">予定の時間を入れると、空き時間の目安が出ます。</p>
    <p id="rNote"></p>
    <p class="sub">この時間は目安です。実際の作業時間は人によって違います。</p>
    <button class="primary tool-copy" id="copy" type="button" hidden>結果をコピーする</button>`,
    after:href=>`  <section class="card">
    <h2>空き時間を時間割に入れる</h2>
    <p>ここで出た空き時間は、「予定が決まっていない時間」の目安です。疲れている日や予定の変更もあるので、実際に使えるのは空き時間より少ないことが多いです。</p>
    <p>平日と週末の空き時間の分数を、<a href="${href(TOOLS_DIR+"schedule/")}">週の副業時間割シミュレータ</a>の欄に入れると、1週間の目安が出ます。</p>
    <ul class="links">${colLink(href,"first-step")}<li><a href="${href(TOOLS_DIR+"schedule/")}">週の副業時間割シミュレータ</a></li><li><a href="${href(TOOLS_DIR)}">ほかのミニ計算ツール</a></li></ul>
  </section>`,
    script:`
function calc(){
  var bwd=num("bwd"),bwe=num("bwe");
  if($("bwd").value===""||$("bwe").value===""){$("rFree").textContent="―";$("rSub").textContent="予定の時間を入れると、空き時間の目安が出ます。";$("rNote").textContent="";$("copy").hidden=true;return}
  if(!(bwd>=0)||!(bwe>=0)||bwd>24||bwe>24){$("rFree").textContent="―";$("rSub").textContent="予定の時間は0〜24時間で入れてください。";$("rNote").textContent="";$("copy").hidden=true;return}
  var fwd=Math.round((24-bwd)*60),fwe=Math.round((24-bwe)*60);
  var h=function(m){return Math.floor(m/60)+"時間"+(m%60?(m%60)+"分":"")};
  $("rFree").textContent="平日 約"+h(fwd)+"／週末 約"+h(fwe);
  $("rSub").textContent="1日24時間から、入れた予定の時間を引いた空き時間です（平日"+fwd+"分／週末"+fwe+"分）。";
  $("rNote").textContent=fwd<=0||fwe<=0?"予定の時間が24時間に近いので、空き時間はほとんどありません。予定を少し見直すと、副業の時間を作りやすくなります。":"この分数を時間割シミュレータに入れると、1週間の目安がわかります。";
  $("copy").hidden=false;$("copy").onclick=function(){copyText("私の空き時間は、平日1日約"+h(fwd)+"、週末1日約"+h(fwe)+"でした。（ミニ診断「スキマ時間ツール」）https://mini-shindan.com/tools/freetime/",$("copy"),"freetime")};
  completed("freetime");
}
["bwd","bwe"].forEach(function(i){$(i).addEventListener("input",function(){touched("freetime");calc()})});
calc();`});
}
function targetPage(){
  const path=TOOLS_DIR+"target/",slug="target";
  return toolShell({slug,path,chara:"S",lead:"目標から逆算すると、やることが見えてきます",
    title:"月1万円逆算ツール",desc:"月の目標金額と1件あたりの単価から、必要な件数と週あたりの作業量の目安がわかる無料ツール。目標に合う副業の候補も表示します。",
    form:[field("goal","1か月の目標金額","円",10000),field("unit","1件（1記事・1点）あたりの収入","円",1500),field("min","1件にかかる時間","分",90,'step="5"')].join("\n"),
    result:`    <p class="kicker">結果</p>
    <p class="tool-big"><span id="rCnt">―</span></p>
    <p class="sub" id="rSub">数字を入れると、必要な件数が出ます。</p>
    <button class="primary tool-copy" id="copy" type="button" hidden>結果をコピーする</button>`,
    after:href=>`  <section class="card">
    <h2>目標に届く可能性のある副業</h2>
    <p class="sub">半年後の収入の目安の上限が、目標以上の副業です（収入を保証するものではありません）。始めやすい順に並べています。</p>
    <div class="jobs" id="jobList"></div>
  </section>
  <section class="card"><ul class="links">${colLink(href,"10000-yen")}</ul></section>`,
    script:`
var JOBS=${JSON.stringify(TOOL_JOBS)};var UP="${"../".repeat(2)}";
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function calc(){
  var g=num("goal"),u=num("unit"),m=num("min");
  if(!(g>0)||!(u>0)||!(m>=0)||g>1e8||u>1e8){$("rCnt").textContent="―";$("rSub").textContent="目標と単価を入れてください。";$("copy").hidden=true;$("jobList").innerHTML="";return}
  var cnt=Math.ceil(g/u),wk=cnt/4,hrs=wk*m/60;
  $("rCnt").textContent="1か月に"+cnt+"件が目安";
  $("rSub").textContent="1か月を4週として、週に約"+(Math.round(wk*10)/10)+"件。作業時間は週に約"+(Math.round(hrs*10)/10)+"時間です（1件"+m+"分の場合）。";
  $("jobList").innerHTML=JOBS.filter(function(j){return j.max>=g}).sort(function(a,b){return b.ease-a.ease}).map(function(j){return '<a class="job" href="'+UP+j.url+'"><b>'+esc(j.name)+'</b><div class="meta"><span>半年後の目安 '+esc(j.month)+'</span><span>初期費用 '+esc(j.cost)+'</span><span>週'+j.h+'時間〜</span></div></a>'}).join("")||'<p class="sub">この目標に届く目安の副業は、いまの一覧にはありません。目標を下げて試してみてください。</p>';
  $("copy").hidden=false;$("copy").onclick=function(){copyText("月"+yen(g)+"円を稼ぐには、単価"+yen(u)+"円なら月"+cnt+"件が必要でした。（ミニ診断「月1万円逆算ツール」）https://mini-shindan.com/tools/target/",$("copy"),"target")};
  completed("target");
}
["goal","unit","min"].forEach(function(i){$(i).addEventListener("input",function(){touched("target");calc()})});
calc();`});
}
function taxPage(){
  const path=TOOLS_DIR+"tax-flow/",slug="tax-flow";
  const sel=(id,label,opts)=>`    <fieldset class="tool-q"><legend>${label}</legend>${opts.map(([v,t],n)=>`<label class="tool-r"><input type="radio" name="${id}" value="${v}"${n===0?"":""}> ${t}</label>`).join("")}</fieldset>`;
  return toolShell({slug,path,chara:"C",lead:"申告のルールは、順番に確認すれば大丈夫です",
    title:"確定申告フローチェック",desc:"会社員の副業で確定申告や住民税の申告が必要かどうかを、3つの質問で確認できる目安ツール。最終的な判断は税務署・市区町村で確認してください。",
    form:[sel("q1","1. 本業は？",[["emp","会社員・公務員など（給与をもらっている）"],["none","上記以外（学生・主婦（夫）・個人事業など）"]]),
      sel("q2","2. 副業のもらい方は？",[["biz","報酬（業務委託・販売・広告収入など）"],["wage","給与（アルバイト・パートなど）"]]),
      sel("q3","3. 1年間の副業は？（報酬は収入から経費を引いた「所得」、給与は「収入」）",[["le","20万円以下"],["gt","20万円超"],["na","まだわからない"]])].join("\n"),
    result:`    <p class="kicker">結果（目安）</p>
    <p class="tool-big"><span id="rMain">3つの質問に答えてください</span></p>
    <div id="rBody" class="sub"></div>
    <button class="primary tool-copy" id="copy" type="button" hidden>結果をコピーする</button>
    <p class="pr">これは一般的な目安で、個人の事情で判断が変わります。最終的な判断は、お近くの税務署や市区町村の窓口、税理士に確認してください。</p>`,
    after:href=>`  <section class="card">
    <h2>あわせて読む</h2>
    <ul class="links">${colLink(href,"expenses")}${colLink(href,"company-secret")}</ul>
  </section>`,
    script:`
function val(n){var e=document.querySelector('input[name="'+n+'"]:checked');return e?e.value:""}
function calc(){
  var a=val("q1"),b=val("q2"),c=val("q3");
  if(!a||!b||!c){return}
  var main,body;
  if(c==="na"){main="まず、1年間の所得を計算しましょう";body="報酬は「収入−経費」、給与は「収入」で見ます。経費の考え方を読んで、ざっくり計算してからもう一度試してください。"}
  else if(a==="emp"&&c==="le"){main="所得税の確定申告は、原則不要の目安です";body="ただし、住民税の申告は別に必要になる場合があります。お住まいの市区町村の案内を確認してください。医療費控除などを受けたい場合は、確定申告をします。"}
  else if(a==="emp"&&c==="gt"){main="確定申告が必要になる目安です";body=(b==="wage"?"副業の給与が年末調整されていない場合は、申告が必要になることがあります。":"副業の所得が年20万円を超えると、申告が必要になるのが一般的です。")+"申告の時期は翌年の2月中旬から3月中旬です。住民税の申告は、確定申告をすれば別に出す必要はないのが一般的です。"}
  else if(c==="le"){main="所得が少ないため、申告が不要な場合もあります";body="本業がないときは、所得の合計と控除の額で決まります。住民税の申告は別にあるので、市区町村と税務署に確認してください。"}
  else{main="確定申告が必要になる可能性があります";body="本業がない場合は、所得の合計が基礎控除などを超えるかで決まります。税務署の案内か、税理士に確認してください。"}
  $("rMain").textContent=main;$("rBody").textContent=body;
  $("copy").hidden=false;$("copy").onclick=function(){copyText("確定申告フローチェックの結果：「"+main+"」（目安）。（ミニ診断）https://mini-shindan.com/tools/tax-flow/",$("copy"),"tax-flow")};
  completed("tax-flow");
}
Array.prototype.forEach.call(document.querySelectorAll("input[type=radio]"),function(r){r.addEventListener("change",function(){touched("tax-flow");calc()})});`});
}

// ---- 比較コンテンツ（データが揃ったものだけ公開） ----
const CMP_FIELDS=["name","monthly","initial","trial","speed","wp","support"];
const cmpReady=d=>d.updated&&d.orderBasis&&d.summary.length&&d.criteria.length&&d.services.length>=2&&d.services.every(s=>CMP_FIELDS.every(f=>s[f])&&s.good.length&&s.caution.length&&s.fit.length);
const CMP=Object.values(COMPARE).filter(cmpReady);
const cmpPath=d=>`${BASE}compare/${d.slug}/`;
const serverCmp=CMP.find(d=>d.slug==="server");
const cmpCard=(href,d,lead)=>`  <section class="card">
    <h2>${esc(d.title)}</h2>
    <p>${esc(lead)}</p>
    <p><a href="${href(cmpPath(d))}" data-track="compare_view">${esc(d.title)}を見る</a>（${esc(d.updated)}時点）</p>
  </section>
`;
function comparePage(d){
  const path=cmpPath(d),title=`${d.title}｜${NAME}`;
  const desc=`${d.title}。月額・初期費用・無料期間・WordPress設置・サポートを表で比べ、向いている人と気になる点もまとめました（${d.updated}時点）。`;
  return page({path,title,desc,ptype:"compare",crumbs:[[NAME,""],["比較",path],[d.title,path]],body:href=>`
  <article>
  <header class="card hero">
    ${charSVG("W",true)}
    <h1>${esc(d.title)}</h1>
    <p class="sub">${esc(d.updated)}時点の情報です。価格やキャンペーンは変わるので、申し込み前に公式サイトで確認してください。</p>
  </header>
  <p class="pr">PR：このページには広告（アフィリエイト）リンクを含みます。</p>
  <section class="card">
    <h2>結論：タイプ別の向き不向き</h2>
    <ul>${d.summary.map(([k,t])=>`<li><b>${esc(TYPES[k].short)}タイプ</b>：${esc(t)}</li>`).join("")}</ul>
  </section>
  <section class="card">
    <h2>比較表（${esc(d.updated)}時点）</h2>
    <p class="sub">並び順と推奨の根拠：${esc(d.orderBasis)}。表示速度は各社の公式公表値で、このサイトで実測したものではありません。</p>
    <div class="tbl"><table><thead><tr><th>サービス</th><th>月額</th><th>初期費用</th><th>無料期間</th><th>表示速度（公式公表値）</th><th>WordPress簡単設置</th><th>サポート</th></tr></thead><tbody>
${d.services.map(s=>`<tr><th>${esc(s.name)}</th><td>${esc(s.monthly)}</td><td>${esc(s.initial)}</td><td>${esc(s.trial)}</td><td>${esc(s.speed)}</td><td>${esc(s.wp)}</td><td>${esc(s.support)}</td></tr>`).join("\n")}
    </tbody></table></div>
  </section>
${d.services.map(s=>`  <section class="card">
    <h2>${esc(s.name)}</h2>
    <p><b>良い点</b></p><ul>${s.good.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
    <p><b>気になる点</b></p><ul>${s.caution.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
    <p><b>向いている人</b></p><ul>${s.fit.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
    ${s.link&&live(s.link)?affLinks([s.link],"compare"):""}${s.official?`<p class="sub"><a href="${esc(s.official)}" rel="noopener" target="_blank">公式サイト</a></p>`:""}
  </section>`).join("\n")}
  <section class="card">
    <h2>選び方の基準</h2>
    ${d.criteria.map(([h,t])=>`<p><b>${esc(h)}</b><br>${esc(t)}</p>`).join("")}
  </section>
${cta(href,"まず自分のタイプを知る")}
  </article>
  <script>document.addEventListener("click",function(e){var a=e.target.closest(".tbl a,.aff a");if(a&&window.gtag){var n=a.dataset.service||a.textContent.trim();gtag("event","compare_click",{service_name:n})}})</script>
`});
}

// ---- 副業運勢（/unsei/2027/）。エンジンは assets/quiz2.js、データは tools/quiz-data.mjs ----
const unseiPath=UNSEI.slug,UNSEI_TOP="unsei/";
function unseiPage(){
  const path=unseiPath,ID=UNSEI.id;
  const title=`${UNSEI.year}年の副業運勢｜今年のラッキー副業を8問で占う｜${NAME}`;
  const desc=`${UNSEI.year}年の副業運勢を8問で診断。今年のラッキー副業、気をつけたい月、相性の良いタイプがわかります。占いは娯楽・参考用です。`;
  const data={
    id:ID,year:UNSEI.year,to:UNSEI.to,qs:UNSEI.qs,keys:KEYS,yearMsg:UNSEI.yearMsg,caution:UNSEI.caution,
    types:Object.fromEntries(KEYS.map(k=>[k,{animal:TYPES[k].animal,chara:TYPES[k].chara,short:TYPES[k].short,role:TYPES[k].role,adj:TYPES[k].adj,slug:TYPES[k].slug,good:TYPES[k].good[0],goodText:TYPES[k].good[1],jobs:JOBS.filter(j=>j.t===k).map(j=>({id:j.id,name:j.name}))}])),
    svg:Object.fromEntries(KEYS.map(k=>[k,charSVG(k,true).replace("<svg ",'<svg xmlns="http://www.w3.org/2000/svg" ')])),
  };
  return page({path,title,desc,ptype:"unsei",crumbs:[[NAME,""],[`${UNSEI.year}年の副業運勢`,path]],body:href=>`
  <article class="qz">
  <section id="qzStart" class="card hero unsei-hero">
    <div class="zk-line">${KEYS.map(k=>charSVG(k,true)).join("")}</div>
    <p class="kicker">${UNSEI.year}年 新春限定</p>
    <h1>${UNSEI.year}年の副業運勢</h1>
    <p class="left">8問に答えると、今年のラッキー副業、気をつけたい月、相性の良いタイプがわかります。あなたの副業タイプ（称号）も出ます。</p>
    <p class="sub left">約1分・登録不要。占いは娯楽・参考用で、収益を保証するものではありません。</p>
    <div id="qzEnded" class="banner" hidden>この限定診断の公開期間は終了しました。結果は引き続き見られます。<a href="${href("")}">通常の診断はこちら</a></div>
    <p><button class="primary" id="qzGo" type="button">占いをはじめる</button></p>
    <p class="sub" id="qzPrev" hidden><button class="qz-link" id="qzPrevBtn" type="button">前回の結果を見る</button></p>
  </section>
  <section id="qzQuiz" class="card" hidden>
    <div class="qz-head"><button class="qz-link" id="qzBack" type="button">← ひとつ戻る</button><span class="sub" id="qzNum"></span></div>
    <div class="qz-bar" aria-hidden="true"><i id="qzProg"></i></div>
    <h2 id="qzQ" class="qz-q"></h2>
    <div id="qzOpts"></div>
  </section>
  <section id="qzResult" hidden>
    <div class="card hero unsei-res">
      <p class="kicker">${UNSEI.year}年の副業運勢</p>
      <div id="rChar"></div>
      <p class="sub" id="rName"></p>
      <h1 id="rTitle"></h1>
      <p class="catch" id="rYear"></p>
    </div>
    <div class="card"><h2>今年のラッキー副業</h2><p id="rLucky"></p></div>
    <div class="card"><h2>気をつけたい月</h2><p id="rMonth"></p></div>
    <div class="card"><h2>相性の良いタイプ</h2><p id="rGood"></p></div>
    <div class="card">
      <h2>結果を保存・シェアする</h2>
      <p><button class="primary" id="rSave" type="button">結果の画像を保存する</button></p>
      <p><button class="qz-link" id="rCopy" type="button">結果のテキストをコピーする</button></p>
      <canvas id="rCanvas" width="1200" height="630" hidden></canvas>
    </div>
    <p class="sub">占いは娯楽・参考用です。副業タイプの診断結果とは別に保存され、通常の診断の結果や称号には影響しません。</p>
    <p><a class="primary" href="${href("")}">通常の診断（11問）もやってみる</a></p>
    <p><button class="qz-link" id="rAgain" type="button">もう一度占う</button></p>
  </section>
  </article>
  <script src="${href("assets/quiz2.js")}"></script>
  <script>
  (function(){
    var D=${JSON.stringify(data).replace(/</g,"\\u003c")},$=function(i){return document.getElementById(i)};
    var KEY="unsei-"+D.year,today=(function(){var d=new Date(),p=function(n){return(n<10?"0":"")+n};return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())})();
    function ev(n,p){if(window.gtag)gtag("event",n,p||{})}
    if(today>D.to)$("qzEnded").hidden=false;
    function hash(a){var h=0,s=a.join("");for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h}
    function build(ans,r){
      var m=r.order[0],s=r.order[1],T=D.types[m],h=hash(ans);
      var jobs=T.jobs,job=jobs[h%jobs.length],month=(Math.floor(h/7)%12)+1;
      return{m:m,s:s,job:job,month:month};
    }
    function titleOf(m,s){return D.types[s].adj+D.types[m].role}
    var cur=null;
    function show(res){
      cur=res;var T=D.types[res.m],S=D.types[res.s],G=D.types[T.good];
      $("qzStart").hidden=true;$("qzQuiz").hidden=true;$("qzResult").hidden=false;
      $("rChar").innerHTML=D.svg[res.m];$("rChar").className="unsei-char";
      $("rName").textContent=T.animal+"の「"+T.chara+"」 × "+S.short+"の素質";
      $("rTitle").textContent=titleOf(res.m,res.s);$("rYear").textContent=D.yearMsg[res.m];
      var j=D.types[res.m].jobs.filter(function(x){return x.id===res.job.id})[0];
      $("rLucky").innerHTML='<b></b>。<a></a>';$("rLucky").querySelector("b").textContent=res.job.name;
      var a=$("rLucky").querySelector("a");a.textContent="始め方を見る";a.href="../../fukugyo/job/"+res.job.id+"/";
      $("rMonth").textContent=res.month+"月。"+D.caution[res.m];
      $("rGood").innerHTML='<a></a>：<span></span>';var ga=$("rGood").querySelector("a");ga.textContent=G.animal+"の「"+G.chara+"」（"+G.short+"タイプ）";ga.href="../../fukugyo/type/"+G.slug+"/";$("rGood").querySelector("span").textContent=T.goodText;
      window.scrollTo(0,0);
    }
    var run=Quiz.run({id:D.id,qs:D.qs,keys:D.keys,els:{start:$("qzStart"),quiz:$("qzQuiz"),num:$("qzNum"),prog:$("qzProg"),q:$("qzQ"),opts:$("qzOpts"),back:$("qzBack")},
      onDone:function(ans,r){var res=build(ans,r);try{localStorage.setItem(KEY,JSON.stringify(res))}catch(e){}ev("quiz_complete",{quiz:D.id,result_type:res.m+res.s});show(res)}});
    $("qzGo").onclick=function(){run.begin()};
    $("rAgain").onclick=function(){$("qzResult").hidden=true;run.begin()};
    var prev=null;try{prev=JSON.parse(localStorage.getItem(KEY))}catch(e){}
    if(prev&&D.types[prev.m]&&D.types[prev.s]&&prev.job&&prev.month){$("qzPrev").hidden=false;$("qzPrevBtn").onclick=function(){show(prev)}}
    function text(){return D.year+"年の副業運勢は「"+titleOf(cur.m,cur.s)+"」。ラッキー副業は"+cur.job.name+"、気をつけたい月は"+cur.month+"月でした。（ミニ診断）https://mini-shindan.com/"+${JSON.stringify(unseiPath)}}
    $("rCopy").onclick=function(){var t=text();ev("share_click",{placement:"unsei"});var b=$("rCopy");function ok(){b.textContent="コピーしました"}
      if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(ok,function(){b.textContent="コピーできませんでした"});else b.textContent="コピーできませんでした"};
    // 結果画像（正月限定デザイン）：ブラウザの中で描いて保存する。サイトの色（--accent など）を使う
    $("rSave").onclick=function(){
      var c=$("rCanvas"),x=c.getContext("2d"),T=D.types[cur.m],S=D.types[cur.s];
      var cs=getComputedStyle(document.documentElement),acc="#b8460f";
      x.fillStyle="#f7f5f0";x.fillRect(0,0,1200,630);
      x.strokeStyle=acc;x.lineWidth=10;x.strokeRect(24,24,1152,582);x.lineWidth=2;x.strokeRect(44,44,1112,542);
      x.fillStyle="#fff";x.fillRect(52,52,1096,526);
      x.fillStyle=acc;x.font="700 34px system-ui,'Hiragino Sans','Yu Gothic',sans-serif";x.fillText(D.year+"年 新春 副業運勢",90,120);
      x.fillStyle="#232220";x.font="700 40px system-ui,'Hiragino Sans','Yu Gothic',sans-serif";x.fillText(titleOf(cur.m,cur.s),90,200);
      x.font="500 28px system-ui,'Hiragino Sans','Yu Gothic',sans-serif";x.fillStyle="#57534c";x.fillText(T.animal+"の「"+T.chara+"」 × "+S.short+"の素質",90,250);
      x.fillStyle="#232220";x.font="700 32px system-ui,'Hiragino Sans','Yu Gothic',sans-serif";
      x.fillText("ラッキー副業",90,340);x.font="500 32px system-ui,'Hiragino Sans','Yu Gothic',sans-serif";x.fillText(cur.job.name,90,390);
      x.font="700 32px system-ui,'Hiragino Sans','Yu Gothic',sans-serif";x.fillText("気をつけたい月",90,460);x.font="500 32px system-ui,'Hiragino Sans','Yu Gothic',sans-serif";x.fillText(cur.month+"月",90,510);
      x.fillStyle="#57534c";x.font="500 24px system-ui,'Hiragino Sans','Yu Gothic',sans-serif";x.fillText("mini-shindan.com/unsei/"+D.year+"/",90,555);
      var img=new Image(),svg=new Blob([D.svg[cur.m]],{type:"image/svg+xml"}),url=URL.createObjectURL(svg);
      img.onload=function(){x.drawImage(img,760,120,340,340);URL.revokeObjectURL(url);finish()};img.onerror=function(){finish()};img.src=url;
      function finish(){ev("result_save",{quiz:D.id});c.toBlob(function(b){var a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="unsei-"+D.year+".png";document.body.appendChild(a);a.click();document.body.removeChild(a)},"image/png")}
    };
  })();
  </script>
`});
}
function unseiTop(){
  const path=UNSEI_TOP;
  return page({path,title:`副業運勢｜年ごとの限定診断｜${NAME}`,desc:"新年に公開する、副業運勢の限定診断の入口です。",ptype:"unsei",crumbs:[[NAME,""],["副業運勢",path]],body:href=>`
  <article>
  <header class="card hero"><div class="zk-line">${KEYS.map(k=>charSVG(k,true)).join("")}</div><h1>副業運勢</h1><p class="left">新年に公開する限定の診断です。</p></header>
  <section class="card"><div class="jobs"><a class="job" href="${href(unseiPath)}"><b>${UNSEI.year}年の副業運勢</b><span class="more">占ってみる →</span></a></div></section>
  <p><a href="${href("")}">通常の診断（11問）はこちら</a></p>
  </article>
`});
}

// ---- 副業つまずきタイプ診断（/tsumazuki/） ----
function tsumazukiPage(){
  const Q=TSUMAZUKI,path=Q.slug;
  const title=`副業つまずきタイプ診断｜続かない・出せない・迷うの原因がわかる｜${NAME}`;
  const desc="副業を始めたあとのつまずきを、8問で5タイプに分けて、関連コラムや見直しポイントを案内する無料診断。1本目の診断結果と並べても見られます。";
  const hrefOf=l=>l.type==="column"?columnPath(COLUMNS.find(c=>c.slug===l.slug)):l.type==="condition"?condPath({slug:l.slug}):l.type==="tool"?`${TOOLS_DIR}${l.slug}/`:l.type==="plan"||l.type==="top"?"":GUIDE;
  const types=Object.fromEntries(Q.keys.map(k=>{const t=Q.types[k];return [k,{name:t.name,lead:t.lead,chara:t.chara,advice:t.advice,links:t.links.map(l=>({label:l.label,href:"../"+hrefOf(l)+(l.type==="plan"?"?plan=1":"")}))}]}));
  const main=Object.fromEntries(KEYS.map(k=>[k,{animal:TYPES[k].animal,chara:TYPES[k].chara,short:TYPES[k].short,role:TYPES[k].role,adj:TYPES[k].adj,weak:TYPES[k].weak,slug:TYPES[k].slug}]));
  const svg=Object.fromEntries(KEYS.map(k=>[k,charSVG(k,true)]));
  const data={id:Q.id,qs:Q.qs,keys:Q.keys,types,main,svg};
  return page({path,title,desc,ptype:"tsumazuki",crumbs:[[NAME,""],["副業つまずきタイプ診断",path]],body:href=>`
  <article class="qz">
  <section id="qzStart" class="card hero">
    <div class="zk-line">${KEYS.map(k=>charSVG(k,true)).join("")}</div>
    <p class="kicker">第2の診断</p>
    <h1>副業つまずきタイプ診断</h1>
    <p class="left">副業を始めたあとの「出せない」「続かない」「折れそう」「時間がない」「迷う」。8問に答えると、あなたのつまずきパターンと、見直しのヒントがわかります。</p>
    <p class="sub left">約1分・登録不要・無料。娯楽・参考用です。</p>
    <p><button class="primary" id="qzGo" type="button">診断をはじめる</button></p>
  </section>
  <section id="qzQuiz" class="card" hidden>
    <div class="qz-head"><button class="qz-link" id="qzBack" type="button">← ひとつ戻る</button><span class="sub" id="qzNum"></span></div>
    <div class="qz-bar" aria-hidden="true"><i id="qzProg"></i></div>
    <h2 id="qzQ" class="qz-q"></h2>
    <div id="qzOpts"></div>
  </section>
  <section id="qzResult" hidden>
    <div class="card hero">
      <p class="kicker">あなたのつまずきタイプ</p>
      <div id="rChar" class="unsei-char"></div>
      <h1 id="rName"></h1>
      <p class="catch" id="rLead"></p>
    </div>
    <div class="card"><h2>処方箋</h2><ul id="rAdvice"></ul></div>
    <div class="card"><h2>あわせて読む・見直す</h2><ul class="links" id="rLinks"></ul></div>
    <div class="card" id="rPrev" hidden><h2>前回の副業タイプと合わせて見る</h2><p id="rPrevT"></p><p class="sub" id="rPrevW"></p><p><a id="rPrevA" href="#">タイプをくわしく見る</a></p></div>
    <p class="sub">診断は娯楽・参考用です。結果は、この端末のブラウザにだけ保存されます。</p>
    <p><a class="primary" href="${href("")}">副業タイプの診断（11問）をやってみる</a></p>
    <p><button class="qz-link" id="rAgain" type="button">もう一度診断する</button></p>
  </section>
  </article>
  <script src="${href("assets/quiz2.js")}"></script>
  <script>
  (function(){
    var D=${JSON.stringify(data).replace(/</g,"\\u003c")},$=function(i){return document.getElementById(i)};
    var KEY="tsumazuki-last";
    function ev(n,p){if(window.gtag)gtag("event",n,p||{})}
    function show(k){
      var T=D.types[k];$("qzStart").hidden=true;$("qzQuiz").hidden=true;$("qzResult").hidden=false;
      $("rChar").innerHTML=D.svg[T.chara];$("rName").textContent=T.name;$("rLead").textContent=T.lead;
      $("rAdvice").innerHTML="";T.advice.forEach(function(a){var li=document.createElement("li");li.textContent=a;$("rAdvice").appendChild(li)});
      $("rLinks").innerHTML="";T.links.forEach(function(l){var li=document.createElement("li"),a=document.createElement("a");a.href=l.href;a.textContent=l.label;li.appendChild(a);$("rLinks").appendChild(li)});
      var last=null;try{last=JSON.parse(localStorage.getItem("shindan-last"))}catch(e){}
      if(last&&D.main[last.m]&&D.main[last.s]){var M=D.main[last.m];$("rPrev").hidden=false;
        $("rPrevT").textContent="前回の副業タイプは「"+D.main[last.s].adj+M.role+"」（"+M.animal+"の「"+M.chara+"」）。つまずきタイプは「"+T.name+"」でした。";
        $("rPrevW").textContent="副業タイプの診断が示す、"+M.short+"タイプの"+M.weak;$("rPrevA").href="../fukugyo/type/"+M.slug+"/"}
      window.scrollTo(0,0);
    }
    var run=Quiz.run({id:D.id,qs:D.qs,keys:D.keys,els:{start:$("qzStart"),quiz:$("qzQuiz"),num:$("qzNum"),prog:$("qzProg"),q:$("qzQ"),opts:$("qzOpts"),back:$("qzBack")},
      onDone:function(ans,r){var k=r.order[0];try{localStorage.setItem(KEY,k)}catch(e){}ev("quiz_complete",{quiz:D.id,result_type:k});show(k)}});
    $("qzGo").onclick=function(){run.begin()};
    $("rAgain").onclick=function(){$("qzResult").hidden=true;run.begin()};
  })();
  </script>
`});
}

// ---- 31〜90日の継続プラン ----
const CONT_PUB=Object.keys(CONT).filter(id=>JOB_BY_ID[id]);
{
  const m=html.match(/const CONT_IDS=\[([^\]]*)\]/);
  const inHtml=m?m[1].split(",").map(x=>x.trim().replace(/"/g,"")).filter(Boolean).sort().join(","):"";
  if(inHtml!==[...CONT_PUB].sort().join(","))throw new Error(`index.html の CONT_IDS（${inHtml}）が tools/continue-data.mjs（${[...CONT_PUB].sort()}）と一致しません`);
}
const contPath=id=>`${BASE}plan/${id}/`;
function contPage(id){
  const j=JOB_BY_ID[id],C=CONT[id],path=contPath(id);
  const flat=C.phases.flatMap(p=>p.steps);
  const title=`${j.name}の31〜90日の継続プラン｜${NAME}`;
  const desc=`${j.name}の最初の30日プランのあと、31〜60日の習慣化と改善、61〜90日の伸ばす・守る（単価交渉・確定申告の準備・やめる判断の基準）をチェックしながら進められます。`;
  const stepLink=(href,l)=>!l?"":l.tool?` <a href="${href(TOOLS_DIR+l.tool+"/")}">${esc(TOOL_TITLES[l.tool])}</a>`:l.column?` <a href="${href(columnPath(COLUMNS.find(c=>c.slug===l.column)))}">${esc(COLUMNS.find(c=>c.slug===l.column).short)}</a>`:"";
  let n=0;
  return page({path,title,desc,ptype:"plan",crumbs:[[NAME,""],[j.name,jobPath(j)],["31〜90日の継続プラン",path]],body:href=>`
  <article>
  <header class="card hero">
    ${charSVG(j.t,true)}
    <p class="sub">${esc(TYPES[j.t].animal)}の「${esc(TYPES[j.t].chara)}」と一緒に</p>
    <h1>${esc(j.name)}：31〜90日の継続プラン</h1>
    <p class="left">最初の30日のあとの、習慣化と改善、そして伸ばす・守るための60日です。チェックはこの端末に保存されます。</p>
    <p class="catch" id="cProg"></p>
    <p class="sub left" id="cSub"></p>
  </header>
${C.phases.map((ph,pi)=>`  <section class="card${ph.first&&live(ph.first)?" first":""}">
    <h2>${esc(ph.name)}</h2>
    ${ph.first&&live(ph.first)?`<div class="aff">${svcCard(ph.first,"plan_step",id)}</div>`:""}
    <ol class="plan">${ph.steps.map(([d,t,l])=>`<li><label><input type="checkbox" data-n="${n++}"><span class="day">${d}日目</span><span>${esc(t)}${stepLink(href,l)}</span></label></li>`).join("\n    ")}</ol>
  </section>`).join("\n")}
  <section class="card">
    <h2>30日プランに戻る</h2>
    <p class="sub">最初の30日プランは、診断の結果ページで見られます。チェックの状態はそのまま引き継がれます。</p>
    <p><a href="${href("")}?plan=1">診断の結果と30日プランを開く</a></p>
    <p><a href="${href(jobPath(j))}">${esc(j.name)}の始め方を読む</a></p>
  </section>
${cta(href,"あなたに向いてる副業を診断する")}
  <p class="pr">費用・期間・収入は始め方による一般的な目安で、収益を保証するものではありません。</p>
  </article>
  <script>
  (function(){
    var ID=${JSON.stringify(id)},N1=${j.plan.length},N2=${flat.length},K1="shindan-plan-"+ID,K2="shindan-plan2-"+ID;
    function load(k){try{var a=JSON.parse(localStorage.getItem(k));return Array.isArray(a)?a:[]}catch(e){return[]}}
    var d1=load(K1).filter(function(x){return x<N1}),d2=new Set(load(K2));
    function ev(n,p){if(window.gtag)gtag("event",n,p||{})}
    function prog(){
      var a=d1.length,b=d2.size;
      document.getElementById("cProg").textContent="30日プラン "+a+" / "+N1+"　継続プラン "+b+" / "+N2;
      document.getElementById("cSub").textContent=a<N1?"30日プランはまだ途中です。こちらを先に進めても大丈夫です。":(b===N2?"90日、おつかれさまでした！":"30日プランは完了しています。続きを進めましょう。");
    }
    var boxes=document.querySelectorAll("input[type=checkbox]");
    boxes.forEach(function(c){var n=+c.dataset.n;if(d2.has(n)){c.checked=true;c.parentNode.classList.add("done")}
      c.onchange=function(){
        if(c.checked){if(d2.size===0)ev("plan_extend_start",{job_id:ID});d2.add(n)}else d2.delete(n);
        c.parentNode.classList.toggle("done",c.checked);
        try{localStorage.setItem(K2,JSON.stringify(Array.from(d2)))}catch(e){}prog();ev("plan_check",{job_id:ID,done_count:d2.size,phase:"extend"});
      }});
    prog();
  })();
  </script>
`});
}
// 副業詳細の末尾の「次に読むもの」（30日プラン・近い条件ページ・関連コラムの3点をそろえる）
// 継続プランは、あるものだけ併記。条件ページは、その副業に当てはまる最初の1つ。
// 関連コラムは、その副業のものがなければ始め方の基本コラムを案内する。
const exitCards=(href,j)=>{
  const col=COLUMNS.find(c=>c.jobs.includes(j.id))||COLUMNS.find(c=>c.slug==="first-step");
  const cond=PUB.find(c=>c.ok(j));
  return `  <section class="card">
    <h2>次に読むもの</h2>
    <ul class="links">
      <li><a href="${href(jobPath(j)+"#plan")}">${esc(j.name)}の最初の30日プラン</a></li>${CONT[j.id]?`
      <li><a href="${href(contPath(j.id))}" data-track="plan_extend_view">31〜90日の継続プラン</a></li>`:""}${cond?`
      <li><a href="${href(condPath(cond))}">${esc(cond.short)}</a></li>`:""}${col?`
      <li><a href="${href(columnPath(col))}">${esc(col.title)}</a></li>`:""}
    </ul>
  </section>
`;
};

// ---- 書き出し ----
rmSync(join(ROOT,BASE),{recursive:true,force:true});
const out=[];
const write=(path,content)=>{const f=join(ROOT,path,"index.html");mkdirSync(dirname(f),{recursive:true});writeFileSync(f,content);out.push(path)};
write(GUIDE,guidePage());
KEYS.forEach(k=>write(typePath(k),typePage(k)));
JOBS.forEach(j=>write(jobPath(j),jobPage(j)));
write(COLUMN,columnIndex());
COLUMNS.forEach(c=>write(columnPath(c),columnPage(c)));
write(ZUKAN,zukanPage());
if(PUB.length){write(CONDS,conditionHub());PUB.forEach(c=>write(condPath(c),conditionPage(c)))}
write(TOOLS_DIR,toolHub());write(TOOLS_DIR+"hourly/",hourlyPage());write(TOOLS_DIR+"target/",targetPage());write(TOOLS_DIR+"tax-flow/",taxPage());write(TOOLS_DIR+"schedule/",schedulePage());write(TOOLS_DIR+"freetime/",freetimePage());
CMP.forEach(d=>write(cmpPath(d),comparePage(d)));
write(unseiPath,unseiPage());write(UNSEI_TOP,unseiTop());
FEATS.forEach(f=>write(featPath(f),featurePage(f)));
write(TSUMAZUKI.slug,tsumazukiPage());
CONT_PUB.forEach(id=>write(contPath(id),contPage(id)));
write(CHARS,charactersPage());comicsPub.forEach(c=>write(comicPath(c),comicPage(c)));
write(NEWSP,newsIndex());NEWS.forEach(n=>write(newsPath(n),newsPage(n)));
write(PRIVACY,privacyPage());write(ABOUT,aboutPage());

writeFileSync(join(ROOT,"sitemap.xml"),`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${["",...out].map(p=>`  <url><loc>${SITE}${p}</loc></url>`).join("\n")}
</urlset>
`);
console.log(`${out.length} ページと sitemap.xml を書き出しました`);
