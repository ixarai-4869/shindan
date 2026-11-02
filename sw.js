// ミニ診断の Service Worker。ホーム画面に追加でき、オフラインでも「前回の結果と30日プラン」を開けるようにする。
// 結果とチェックはブラウザの localStorage にあるので、トップページ（index.html）と画像・CSS がキャッシュにあれば読める。
// 外部サイト（広告リンク先、Google アナリティクスなど）は扱わず、そのままネットワークへ。
// キャッシュの中身を変えたいときは VERSION を上げる。
const VERSION="v9";
const CORE=`shindan-core-${VERSION}`,RUN=`shindan-run-${VERSION}`;
const PRECACHE=["./","assets/icons/icon-192.png","assets/icons/icon-512.png"];

self.addEventListener("install",e=>{
  e.waitUntil(caches.open(CORE).then(c=>c.addAll(PRECACHE)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CORE&&k!==RUN).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener("fetch",e=>{
  const req=e.request,url=new URL(req.url);
  if(req.method!=="GET"||url.origin!==location.origin)return;
  if(req.mode==="navigate"){
    // ページ：まずネットワーク（更新をすぐ届ける）。オフラインならキャッシュ、なければトップ
    e.respondWith(fetch(req).then(res=>{
      if(res.ok){const copy=res.clone();const key=url.pathname==="/"?"./":req;caches.open(url.pathname==="/"?CORE:RUN).then(c=>c.put(key,copy))}
      return res;
    }).catch(()=>caches.match(url.pathname==="/"?"./":req,{ignoreSearch:true}).then(r=>r||caches.match("./"))));
    return;
  }
  // 画像・CSS など：キャッシュを先に出しつつ、裏で更新する
  e.respondWith(caches.open(RUN).then(c=>c.match(req).then(hit=>{
    const net=fetch(req).then(res=>{if(res.ok)c.put(req,res.clone());return res}).catch(()=>hit);
    return hit||net;
  })));
});
