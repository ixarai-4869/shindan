// 結果ごとのシェア画像（assets/og/XY.png、1200×630）と、その画像を OGP に持つシェア用ページ（r/XY/）を作る。
// X や LINE は JavaScript を動かさずにページを読むので、?r=XY だけでは結果ごとの画像を出せない。
// そこで結果ごとに静的なページを置き、開いた人はすぐ診断トップ（?r=XY）へ移す。
// index.html の TYPES（名前・称号・キャッチ）を変えたら
//   node tools/build-share.mjs
// を実行して、できたファイルもあわせてコミットする。画像の描画に Playwright を使う。
import {readFileSync,writeFileSync,mkdirSync,rmSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import vm from "node:vm";

const ROOT=join(dirname(fileURLToPath(import.meta.url)),"..");
const SITE="https://mini-shindan.com/";
const NAME="向いてる副業診断";

const html=readFileSync(join(ROOT,"index.html"),"utf8");
const from=html.indexOf("// ---- キャラクター"),to=html.indexOf("// ---- アフィリエイトリンク");
if(from<0||to<0)throw new Error("index.html のデータ部分が見つかりません");
const {TYPES,charSVG}=vm.runInNewContext(html.slice(from,to)+";({TYPES,charSVG})");
const KEYS=Object.keys(TYPES);
const CODES=KEYS.flatMap(m=>KEYS.filter(s=>s!==m).map(s=>m+s));
const titleOf=(m,s)=>TYPES[s].adj+TYPES[m].role;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);

// タイプごとの背景色（キャラの色を薄くしたもの）
const TINT={W:"#efe3d6",V:"#dcf1e4",M:"#efdfd2",S:"#fde3d4",C:"#fbefc4"};

function card(code){
  const [m,s]=code,T=TYPES[m];
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@500;700;900&display=block" rel="stylesheet">
<style>
*{box-sizing:border-box}
body{margin:0;width:1200px;height:630px;background:${TINT[m]};font-family:"Noto Sans JP",sans-serif;color:#232220;
  background-image:radial-gradient(rgba(0,0,0,.07) 1.5px,transparent 1.5px);background-size:26px 26px}
.c{position:absolute;inset:36px;background:#fff;border-radius:36px;display:flex;align-items:center;padding:0 60px 0 40px;gap:36px}
.ch{flex:none;width:400px;height:400px;border-radius:50%;background:${TINT[m]};display:flex;align-items:center;justify-content:center}
.ch svg{width:340px;height:340px}
.r{flex:1;min-width:0}
.pill{display:inline-block;background:#fbe9df;color:#e2672f;font-weight:700;font-size:26px;border-radius:999px;padding:6px 24px}
.lead{margin:22px 0 0;font-size:30px;font-weight:700;color:#6b675f}
.adj{margin:4px 0 0;font-size:56px;font-weight:900;line-height:1.15}
.role{margin:0;white-space:nowrap;font-weight:900;line-height:1.1;color:#e2672f;letter-spacing:2px}
.name{margin:14px 0 0;font-size:28px;font-weight:700;color:#6b675f}
.foot{margin:26px 0 0;font-size:24px;font-weight:700;color:#a8a299}
.foot b{color:#232220;margin-right:18px}
</style></head><body><div class="c">
<div class="ch">${charSVG(m,true)}</div>
<div class="r">
<span class="pill">${NAME}の結果</span>
<p class="lead">私の副業タイプは</p>
<p class="adj">${esc(TYPES[s].adj)}</p>
<p class="role" style="font-size:${Math.min(104,Math.floor(570/T.role.length))}px">${esc(T.role)}</p>
<p class="name">${esc(T.animal)}の「${esc(T.chara)}」× ${esc(TYPES[s].short)}の素質</p>
<p class="foot"><b>あなたはどの子？</b>mini-shindan.com</p>
</div>
</div></body></html>`;
}

function sharePage(code){
  const [m,s]=code,T=TYPES[m],title=titleOf(m,s);
  const pt=`私は「${title}」でした｜${NAME}`;
  const desc=`${T.animal}の「${T.chara}」× ${TYPES[s].short}の素質。${T.catch}あなたはどの子？11問・約2分の無料診断。`;
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(pt)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="noindex">
<link rel="canonical" href="${SITE}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="ミニ診断">
<meta property="og:locale" content="ja_JP">
<meta property="og:title" content="${esc(pt)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}r/${code}/">
<meta property="og:image" content="${SITE}assets/og/${code}.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(`${NAME}の結果：${title}（${T.animal}の${T.chara}）`)}">
<meta name="twitter:card" content="summary_large_image">
<script>location.replace("../../?r=${code}"+(location.search?"&"+location.search.slice(1):""))</script>
</head>
<body>
<p><a href="../../?r=${code}">${esc(pt)}</a></p>
</body>
</html>
`;
}

rmSync(join(ROOT,"r"),{recursive:true,force:true});
mkdirSync(join(ROOT,"assets/og"),{recursive:true});
for(const code of CODES){
  mkdirSync(join(ROOT,"r",code),{recursive:true});
  writeFileSync(join(ROOT,"r",code,"index.html"),sharePage(code));
}

const {chromium}=createRequire(import.meta.url)("playwright");
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1200,height:630}});
for(const code of CODES){
  await page.setContent(card(code),{waitUntil:"networkidle"});
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:join(ROOT,"assets/og",code+".png")});
}
await browser.close();
console.log(`${CODES.length} 枚の画像とシェア用ページを書き出しました`);
