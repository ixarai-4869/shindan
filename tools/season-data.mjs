// 季節バナーと特集ページのデータ。期間（from〜to、端末の日付）の間だけトップにバナーが出て、期間外は自動で通常表示に戻る。
// SEASONS: 期間・タイトル・リンク先・キャラ（イラスト）・theme（html の data-season。見た目の差し替えは index.html の CSS で）
// FEATURES: 特集ページ（/fukugyo/feature/<slug>/）。cards に関連ページを並べる。cards が空の特集は公開しない。
//   cards の type: column（コラムの slug）／ job（副業の id）／ tool（hourly・target・tax-flow）／ type（owl 等）
export const SEASONS=[
  {id:"unsei2027",from:"2026-12-20",to:"2027-01-31",title:"2027年の副業運勢を占う",text:"8問で、今年のラッキー副業と気をつけたい月がわかります。",href:"unsei/2027/",chara:"S",theme:"newyear"},
  {id:"kakutei",from:"2027-02-01",to:"2027-03-15",title:"副業の確定申告 特集",text:"申告が必要かの目安、経費の考え方、会社への知られ方をまとめました。",href:"fukugyo/feature/kakutei-shinkoku/",chara:"C",theme:"tax"},
];
export const FEATURES=[
  {slug:"kakutei-shinkoku",title:"副業の確定申告 特集",chara:"C",lead:"申告が必要かどうかの目安を調べて、経費と会社への知られ方もあわせて確認できます。",
   cards:[{type:"tool",slug:"tax-flow"},{type:"column",slug:"expenses"},{type:"column",slug:"company-secret"},{type:"column",slug:"10000-yen"}]},
];
