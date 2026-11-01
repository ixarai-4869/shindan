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
import {CONDITIONS,HUB_LEAD,ZUKAN_LEAD} from "./conditions-data.mjs";

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
function page({path,title,desc,crumbs,body,ptype=""}){
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
    <p><a href="${href("")}">${NAME}をやってみる</a>・<a href="${href(GUIDE)}">タイプと副業の一覧</a>・<a href="${href(COLUMN)}">副業の悩みコラム</a>・<a href="${href(ZUKAN)}">称号図鑑</a>${PUB.length?`・<a href="${href(CONDS)}">条件から探す</a>`:""}</p>
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
// サービス名＋選ぶ理由＋ボタンのカード（index.html の svcCard と同じ見た目）。place は計測用の置き場所
const svcCard=(k,place,job)=>{const L=LINKS[k];return `<a class="svc" href="${L.url}" target="_blank" rel="sponsored noopener" data-track="${place==="job_top"?"first_step_click":"affiliate_click"}" data-service="${esc(L.svc)}" data-placement="${place}"${job?` data-job-id="${job}"`:""}><span class="svc-t"><b>${esc(L.svc)}</b><span>${esc(L.why)}</span></span><span class="svc-b">${esc(L.label)}</span></a>`};
const affLinks=(keys,place="column")=>keys.length?`<div class="aff">${keys.map(k=>svcCard(k,place)).join("")}</div>
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
  const first=j.plan.find(p=>live(p[2]));
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

  <section class="card">
    <h2>最初の30日プラン</h2>
    <ol class="plan">${j.plan.map(([d,text,lk])=>`<li><span class="day">${d}日目</span><span>${esc(text)}${live(lk)?`${svcCard(lk,"plan_step",j.id)}`:""}</span></li>`).join("")}</ol>
    ${linkKeys.length?`<p class="pr">PR：プラン内のリンクは広告（アフィリエイト）を含みます。</p>`:""}
    <p class="sub">診断を受けると、このプランにチェックをつけて進み具合を記録できます。</p>
  </section>

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
    <p><a class="more" href="${COLUMN}">コラムをすべて見る</a>・<a class="more" href="${GUIDE}">タイプと副業の一覧</a>・<a class="more" href="${ZUKAN}">称号図鑑</a>${PUB.length?`・<a class="more" href="${CONDS}">条件から探す</a>`:""}</p>
    <h2 style="margin-top:22px">よくある質問</h2>
    <dl>${FAQ.map(([q,a])=>`<dt>${esc(q)}</dt><dd>${esc(a)}</dd>`).join("")}</dl>
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
write(PRIVACY,privacyPage());write(ABOUT,aboutPage());

writeFileSync(join(ROOT,"sitemap.xml"),`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${["",...out].map(p=>`  <url><loc>${SITE}${p}</loc></url>`).join("\n")}
</urlset>
`);
console.log(`${out.length} ページと sitemap.xml を書き出しました`);
