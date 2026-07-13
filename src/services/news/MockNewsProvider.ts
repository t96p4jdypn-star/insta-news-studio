import type { NewsItem, NewsProvider } from "./NewsProvider";

export const mockNews: NewsItem[] = [
  { id:"carp-1", title:"若手右腕、先発ローテーション入りへ向けて次回登板に注目", summary:"若手投手の起用方針について球団から発表。今後の登板内容が一軍定着の鍵になりそうです。", sourceName:"球団公式発表", sourceUrl:"https://www.carp.co.jp/", publishedAt:"2026-07-14T08:10:00+09:00", category:"広島東洋カープ", keywords:["若手起用","先発投手","一軍"], relevanceScore:5, status:"candidate" },
  { id:"wrestling-1", title:"女子プロレス夏のタイトル戦、挑戦者が語った勝負の焦点", summary:"タイトル戦を前に両選手がコメント。試合の組み立てと終盤の攻防に注目が集まります。", sourceName:"団体公式ニュース", sourceUrl:"https://wwr-stardom.com/", publishedAt:"2026-07-14T06:40:00+09:00", category:"女子プロレス", keywords:["タイトル戦","試合内容","技術"], relevanceScore:4, status:"candidate" },
  { id:"ai-1", title:"生成AIを授業準備に活用、教員向けの新しい指針を公開", summary:"教育現場での生成AI活用について、確認すべきポイントと具体例をまとめた指針が公開されました。", sourceName:"教育機関公式", sourceUrl:"https://www.mext.go.jp/", publishedAt:"2026-07-13T19:20:00+09:00", category:"AI", keywords:["教育","生成AI","活用指針"], relevanceScore:5, status:"candidate" },
  { id:"rugby-1", title:"リーグワン各クラブが新加入選手を発表、来季の布陣に変化", summary:"複数クラブが新戦力を発表。ポジション構成から来季の戦術を考える材料になりそうです。", sourceName:"リーグ公式", sourceUrl:"https://league-one.jp/", publishedAt:"2026-07-13T16:15:00+09:00", category:"ラグビー", keywords:["リーグワン","補強","戦術"], relevanceScore:4, status:"candidate" },
  { id:"basket-1", title:"女子日本代表候補に若手ガード、強化合宿メンバー発表", summary:"新しい代表候補メンバーが発表され、若手ポイントガードの選出が注目されています。", sourceName:"協会公式発表", sourceUrl:"https://www.japanbasketball.jp/", publishedAt:"2026-07-13T12:30:00+09:00", category:"女子バスケットボール", keywords:["日本代表","選手選考","若手"], relevanceScore:4, status:"candidate" },
  { id:"ekiden-1", title:"実業団女子駅伝、新加入選手が語る得意区間と今季の目標", summary:"新戦力へのインタビューが公開。チーム内競争と区間配置を考える上で興味深い内容です。", sourceName:"チーム公式", sourceUrl:"https://www.jaaf.or.jp/", publishedAt:"2026-07-12T17:00:00+09:00", category:"女子駅伝", keywords:["新加入","区間配置","クイーンズ駅伝"], relevanceScore:4, status:"candidate" },
  { id:"dev-1", title:"小さなWebアプリをPWA化するときに見直したい基本項目", summary:"オフライン対応、ホーム画面追加、アクセシビリティを段階的に整える方法が紹介されています。", sourceName:"技術コミュニティ", sourceUrl:"https://developer.mozilla.org/ja/", publishedAt:"2026-07-12T10:00:00+09:00", category:"アプリ開発", keywords:["PWA","アクセシビリティ"], relevanceScore:3, status:"candidate" },
  { id:"soccer-1", title:"育成年代の大会で新ルールを試行、選手の安全を優先", summary:"公式大会での試行内容が発表されました。競技性と安全性の両面から検証されます。", sourceName:"協会公式", sourceUrl:"https://www.jfa.jp/", publishedAt:"2026-07-11T18:00:00+09:00", category:"サッカー", keywords:["育成","ルール"], relevanceScore:3, status:"candidate" },
];

export class MockNewsProvider implements NewsProvider {
  readonly name = "モックニュース";
  async getLatest() { return mockNews; }
}
