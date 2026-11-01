// キャラの4コマ・掛け合い（/characters/comics/）。原稿ができたら、配列に1件足して  node tools/build-pages.mjs  を実行するだけで、一覧と詳細ページができる。
// 1件も無い間は、一覧のリンクも出さない。
// {slug:"半角の短い名前", date:"2026-12-01", title, chara:["W","V"]（登場するキャラ）, panels:[{who:"W"（話すキャラ、空なら地の文）, text:"セリフ"}, …（4コマなら4つ）]}
export const COMICS=[];
