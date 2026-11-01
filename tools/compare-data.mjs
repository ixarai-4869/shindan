// 比較コンテンツ（/fukugyo/compare/<slug>/）のデータ。価格・条件は変わるので、ここだけ直して
//   node tools/build-pages.mjs
// を実行する。公式サイトで確認できた値だけを入れ、確認日を updated に書く（ページに「○年○月時点」で出る）。
// 書いていない（空の）項目があるサービスがある間は、ページを公開しない。実測していない項目は「公式公表値」とページに注記する。
//
// services[]: {id,name,monthly,initial,trial,speed,wp,support, good:[],caution:[],fit:[], link:"LINKS のキー（任意）", official:"公式URL（任意）"}
//   monthly: 月額（最安プランの契約期間つきで書く）／initial: 初期費用／trial: 無料期間／speed: 表示速度の公称値（公式公表値）
//   wp: WordPress簡単設置の有無／support: サポート内容
export const COMPARE={
  server:{
    slug:"server",
    title:"レンタルサーバー比較（ブログ・副業向け）",
    updated:"",            // 例 "2026年11月"
    orderBasis:"",         // 並び順と推奨の根拠。例「月額の安い順。広告の報酬額では決めていません」
    summary:[],            // タイプ別の向き不向き [[タイプキー W/V/M/S/C, 文章], …]
    criteria:[],           // 選び方の基準 [見出し, 文章]
    services:[],
  },
};
