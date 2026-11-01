// 条件別ランディング（/fukugyo/conditions/<slug>/）の定義。
// 判定は index.html の JOBS の項目で行う（face: 0=顔も声も不要 1=声が必要 2=顔出しが必要 / cost / h / ease / wk=週末中心で成立 / ph=スマホだけで可 / hm=外出・対面不要）。
//
// 文章は運営が用意する。intro / fail / note のどれかが空の条件は「未入稿」とみなし、
// ページを作らず、ハブにも sitemap にも出さない（薄い自動生成ページを公開しないため）。
//   intro: 導入文（段落の配列）
//   fail : この条件で失敗しやすい点（配列）
//   note : この条件ならではの注意点（文字列）
// ハブのリード文は HUB_LEAD、図鑑のリード文は ZUKAN_LEAD。空なら出さない。
//
// quiz: 診断の条件質問に引き継ぐ値 [質問の番号(0=時間,1=お金,2=顔・声), 選択肢の番号]。引き継げない条件は null。
// chara: ヒーローに置くキャラ（W書く V話す M作る S売る C こなす）。変えたいときはここを直す。

export const HUB_LEAD="";
export const ZUKAN_LEAD="";

export const CONDITIONS=[
  {slug:"no-face",title:"顔出しなしでできる副業",short:"顔出しなし",chara:"M",
   ok:j=>j.face<=1, why:j=>j.face===2?"顔出しが必要":"",
   okNote:j=>j.face===1?"声出しは必要":"",
   rule:"顔出しが不要な副業（声だけは出す副業を含みます）",
   quiz:[2,1], intro:[],fail:[],note:""},
  {slug:"no-voice",title:"声出しなしでできる副業",short:"声出しなし",chara:"W",
   ok:j=>j.face===0, why:j=>j.face===2?"顔出し・声出しが必要":"声出しが必要",
   rule:"顔出しも声出しも不要な副業",
   quiz:[2,0], intro:[],fail:[],note:""},
  {slug:"zero-cost",title:"初期費用0円で始められる副業",short:"初期費用0円",chara:"S",
   ok:j=>j.cost===0, why:j=>`初期費用の目安が${j.costLabel}`,
   rule:"初期費用が0円で始められる副業",
   quiz:[1,0], intro:[],fail:[],note:""},
  {slug:"short-time",title:"週3時間以内でできる副業",short:"週3時間以内",chara:"C",
   ok:j=>j.h<=3, why:j=>`週${j.h}時間〜が目安`,
   rule:"必要な時間が週3時間以下の副業",
   quiz:null, intro:[],fail:[],note:""},
  {slug:"weekend",title:"週末だけでできる副業",short:"週末だけ",chara:"M",
   ok:j=>!!j.wk, why:j=>"週末だけでは成立しにくい（継続的な対応が必要）",
   rule:"週末にまとめて作業しても成立する副業",
   quiz:null, intro:[],fail:[],note:""},
  {slug:"smartphone",title:"スマホだけでできる副業",short:"スマホだけ",chara:"V",
   ok:j=>!!j.ph, why:j=>"パソコンでの作業が必要",
   rule:"スマホだけで一通りできる副業",
   quiz:null, intro:[],fail:[],note:""},
  {slug:"zaitaku",title:"完全在宅でできる副業",short:"完全在宅",chara:"W",
   ok:j=>!!j.hm, why:j=>"発送や仕入れなどで外出が必要",
   rule:"外出も対面も不要で完結する副業",
   quiz:null, intro:[],fail:[],note:""},
  {slug:"beginner",title:"未経験から始めやすい副業",short:"未経験でもOK",chara:"S",
   ok:j=>j.ease>=4, why:j=>`始めやすさが★${j.ease}`,
   rule:"始めやすさが★4以上の副業",
   quiz:null, intro:[],fail:[],note:""},
];
