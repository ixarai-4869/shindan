// PWA 用のアイコン（assets/icons/）を作る。フクロウを生成りの背景に置いた絵を Playwright で描く。
// キャラの絵を変えたら  node tools/build-icons.mjs  を実行して、できたファイルもコミットする。
import {readFileSync,mkdirSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import vm from "node:vm";
const ROOT=join(dirname(fileURLToPath(import.meta.url)),"..");
const html=readFileSync(join(ROOT,"index.html"),"utf8");
const from=html.indexOf("// ---- キャラクター"),to=html.indexOf("// ---- アフィリエイトリンク");
const {charSVG}=vm.runInNewContext(html.slice(from,to)+";({charSVG})");
const {chromium}=createRequire(import.meta.url)("playwright");
mkdirSync(join(ROOT,"assets/icons"),{recursive:true});
// maskable は安全領域（中央80%）に収める。通常のアイコンは大きめに置く
const make=(size,scale,file,page)=>page.setViewportSize({width:size,height:size}).then(async()=>{
  await page.setContent(`<body style="margin:0;width:${size}px;height:${size}px;background:#f7f5f0;display:grid;place-items:center"><div style="width:${size*scale}px;height:${size*scale}px">${charSVG("W",true)}</div><style>svg{width:100%;height:100%}</style></body>`);
  await page.screenshot({path:join(ROOT,"assets/icons",file)});
});
const b=await chromium.launch();const p=await b.newPage();
await make(192,.82,"icon-192.png",p);
await make(512,.82,"icon-512.png",p);
await make(512,.62,"icon-maskable-512.png",p);
await make(180,.8,"apple-touch-icon.png",p);
await b.close();
console.log("icons done");
