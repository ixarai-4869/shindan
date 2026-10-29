// タイプ別・副業別の解説ページ（静的HTML）と sitemap.xml を作る。
// 診断のデータは index.html から読むので、index.html の TYPES・JOBS・LINKS・GA_ID を変えたら
//   node tools/build-pages.mjs
// を実行して、できたファイルもあわせてコミットする。
import {readFileSync,writeFileSync,mkdirSync,rmSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
import vm from "node:vm";
import {TYPE_EXTRA,JOB_EXTRA} from "./pages-data.mjs";
import {COLUMNS} from "./column-data.mjs";

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
const columnPath=c=>`${COLUMN}${c.slug}/`;
const typeLabel=k=>`${TYPES[k].animal}の${TYPES[k].chara}（${TYPES[k].short}タイプ）`;
const titleOf=(main,sub)=>TYPES[sub].adj+TYPES[main].role;
const stars=n=>"★".repeat(n)+"☆".repeat(5-n);

// ---- 共通の枠 ----
// path はサイトルートからのパス（末尾 /）。リンクは相対パスにして github.io/shindan/ でも動くようにする
function page({path,title,desc,crumbs,body}){
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
<script>
const GA_ID="${GA_ID}";
const NOTRACK=(()=>{try{const q=new URLSearchParams(location.search).get("notrack");if(q==="1")localStorage.setItem("shindan-notrack","1");if(q==="0")localStorage.removeItem("shindan-notrack");return localStorage.getItem("shindan-notrack")==="1"}catch(e){return false}})();
if(GA_ID&&!NOTRACK){
  const s=document.createElement("script");s.async=true;s.src="https://www.googletagmanager.com/gtag/js?id="+GA_ID;document.head.appendChild(s);
  window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag("js",new Date());gtag("config",GA_ID);
}
document.addEventListener("click",e=>{const a=e.target.closest("a[data-track]");if(a&&window.gtag)gtag("event",a.dataset.track,{page:location.pathname,link:a.textContent.trim()})});
</script>
</head>
<body>
<main>
  <p class="pr">※ 本サイトには広告（PR・アフィリエイトリンク）が含まれます。</p>
  <nav class="crumbs" aria-label="パンくずリスト">${crumbs.map(([n,p],i)=>i<crumbs.length-1?`<a href="${href(p)}">${esc(n)}</a>`:`<span aria-current="page">${esc(n)}</span>`).join(" › ")}</nav>
${body(href)}
  <footer>
    <p><a href="${href("")}">${NAME}をやってみる</a>・<a href="${href(GUIDE)}">タイプと副業の一覧</a>・<a href="${href(COLUMN)}">副業の悩みコラム</a></p>
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
const live=k=>k&&!LINKS[k][1].startsWith("#REPLACE");
const affLinks=keys=>keys.length?`<ul class="aff">${keys.map(k=>`<li><a href="${LINKS[k][1]}" target="_blank" rel="sponsored noopener" data-track="affiliate_click">${esc(LINKS[k][0])} →</a></li>`).join("")}</ul>
    <p class="pr">PR：上のリンクは広告（アフィリエイト）を含みます。</p>`:"";

const jobMeta=j=>`<div class="meta"><span>初期費用 ${esc(j.costLabel)}</span><span>週${j.h}時間〜</span><span>最初の収入まで ${esc(j.first)}</span><span>半年後の目安 ${esc(j.month)}</span><span>始めやすさ <span class="stars">${stars(j.ease)}</span></span></div>`;
const FACE=["顔も声も出さずにできる","声出しが必要","顔出しが必要"];

// ---- タイプ別ページ ----
function typePage(k){
  const T=TYPES[k],X=TYPE_EXTRA[k],jobs=JOBS.filter(j=>j.t===k),path=typePath(k);
  const g=T.good,o=T.opp;
  const title=`${T.animal}の${T.chara}（${T.short}タイプ）の特徴と向いてる副業｜${NAME}`;
  const desc=`${NAME}の「${T.short}」タイプ（${T.animal}の${T.chara}）の特徴、強み、つまずきやすい点、向いている副業${jobs.length}つと避けた方がいい副業を解説します。${T.catch}`;
  return page({path,title,desc,crumbs:[[NAME,""],["タイプと副業の一覧",GUIDE],[`${T.short}タイプ`,path]],body:href=>`
  <article>
  <header class="card hero">
    ${charSVG(k,true)}
    <p class="sub">${esc(T.animal)}の「${esc(T.chara)}」</p>
    <h1>${esc(T.short)}タイプ（${esc(T.role)}）の特徴と向いてる副業</h1>
    <p class="catch">${esc(T.catch)}</p>
    <p class="left">${esc(X.lead)}${esc(T.desc)}</p>
  </header>

  <section class="card">
    <h2>こんなところ、ありませんか？</h2>
    <ul>${T.aru.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>
  </section>

  <section class="card">
    <h2>${esc(T.short)}タイプがよく言うセリフ</h2>
    <ul>${T.serif.map(s=>`<li>「${esc(s)}」</li>`).join("")}</ul>
  </section>

  <section class="card">
    <h2>${esc(T.short)}タイプの取扱説明書</h2>
    <dl class="faq">${T.tori.map(([h,t])=>`<dt>${esc(h)}</dt><dd>${esc(t)}</dd>`).join("")}</dl>
  </section>

  <section class="card">
    <h2>${esc(T.short)}タイプの強み</h2>
    <ul>${T.str.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>
    <p class="sub">${esc(T.weak)}</p>
  </section>

  <section class="card">
    <h2>${esc(T.short)}タイプに向いてる副業</h2>
    <div class="jobs">${jobs.map(j=>`
      <a class="job" href="${href(jobPath(j))}"><b>${esc(j.name)}</b>${jobMeta(j)}<span class="more">くわしく見る →</span></a>`).join("")}
    </div>
  </section>

  <section class="card">
    <h2>${esc(T.short)}タイプが避けた方がいい副業</h2>
    <p><b>${esc(T.avoid[0])}</b></p>
    <p class="sub">${esc(T.avoid[1])}</p>
  </section>

  <section class="card">
    <h2>はじめの一歩のコツ</h2>
    <ul>${X.tips.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>
  </section>

  <section class="card">
    <h2>${esc(T.short)}タイプの称号（全4通り）</h2>
    <p class="sub">診断では、2番目に強い素質によって称号が変わります。</p>
    <ul class="titles">${KEYS.filter(s=>s!==k).map(s=>`<li><b>${esc(titleOf(k,s))}</b><span class="sub">${esc(TYPES[s].short)}の素質：${esc(TYPES[s].str[0])}</span></li>`).join("")}</ul>
  </section>

  <section class="card">
    <h2>相性</h2>
    <a class="pair" href="${href(typePath(g[0]))}">${charSVG(g[0],true)}<span><b>最高の相棒：${esc(typeLabel(g[0]))}</b><br><span class="sub">${esc(g[1])}</span></span></a>
    <a class="pair" href="${href(typePath(o[0]))}">${charSVG(o[0])}<span><b>真逆のタイプ：${esc(typeLabel(o[0]))}</b><br><span class="sub">${esc(o[1])}</span></span></a>
  </section>
  </article>

${cta(href,`あなたは${T.short}タイプ？`)}

  <section class="card">
    <h2>ほかのタイプ</h2>
    <div class="others">${KEYS.map(s=>s===k?"":`<a href="${href(typePath(s))}">${charSVG(s)}${esc(TYPES[s].short)}</a>`).join("")}</div>
  </section>
`});
}

// ---- 副業別ページ ----
function jobPage(j){
  const T=TYPES[j.t],X=JOB_EXTRA[j.id],path=jobPath(j);
  const linkKeys=[...new Set(j.plan.map(p=>p[2]).filter(live))];
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

  <section class="card">
    <h2>最初の30日プラン</h2>
    <ol class="plan">${j.plan.map(([d,text,lk])=>`<li><span class="day">${d}日目</span><span>${esc(text)}${live(lk)?`<br><a href="${LINKS[lk][1]}" target="_blank" rel="sponsored noopener" data-track="affiliate_click">${esc(LINKS[lk][0])} →</a>`:""}</span></li>`).join("")}</ol>
    ${linkKeys.length?`<p class="pr">PR：プラン内のリンクは広告（アフィリエイト）を含みます。</p>`:""}
    <p class="sub">診断を受けると、このプランにチェックをつけて進み具合を記録できます。</p>
  </section>
${linkKeys.length?`
  <section class="card">
    <h2>${esc(j.name)}を始めるのに使うサービス</h2>
    ${affLinks(linkKeys)}
  </section>
`:""}
  <section class="card">
    <h2>よくある質問</h2>
    <dl class="faq">${X.faq.map(([q,a])=>`<dt>${esc(q)}</dt><dd>${esc(a)}</dd>`).join("")}</dl>
  </section>
  </article>

${related(href,COLUMNS.filter(c=>c.jobs.includes(j.id)))}
${cta(href,`${j.name}があなたに向いているか、診断で確かめる`)}

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

  <section class="card">
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
  if(b.note)return `<p class="sub">${esc(b.note)}</p>`;
  throw new Error("column-data.mjs に知らない形の中身があります: "+JSON.stringify(b));
}
function columnPage(c){
  const path=columnPath(c);
  return page({path,title:`${c.title}｜${NAME}`,desc:c.desc,crumbs:[[NAME,""],["副業の悩みコラム",COLUMN],[c.short,path]],body:href=>`
  <article>
  <header class="card">
    <h1>${esc(c.title)}</h1>
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

// ---- 書き出し ----
rmSync(join(ROOT,BASE),{recursive:true,force:true});
const out=[];
const write=(path,content)=>{const f=join(ROOT,path,"index.html");mkdirSync(dirname(f),{recursive:true});writeFileSync(f,content);out.push(path)};
write(GUIDE,guidePage());
KEYS.forEach(k=>write(typePath(k),typePage(k)));
JOBS.forEach(j=>write(jobPath(j),jobPage(j)));
write(COLUMN,columnIndex());
COLUMNS.forEach(c=>write(columnPath(c),columnPage(c)));

writeFileSync(join(ROOT,"sitemap.xml"),`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${["",...out].map(p=>`  <url><loc>${SITE}${p}</loc></url>`).join("\n")}
</urlset>
`);
console.log(`${out.length} ページと sitemap.xml を書き出しました`);
