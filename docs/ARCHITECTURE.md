# アーキテクチャ

UIはNext.js App Router上のクライアントアプリとして動作し、Cloudflare Workers互換のvinextでビルドする。画面状態と端末内データは`app/InstaNewsStudio.tsx`、生成ルールと型は`src/lib/models.ts`、ルール式文章構成は`src/lib/composer.ts`、ジャンル移行・利用履歴は`src/lib/categories.ts`、ニュース取得・手動登録・URL品質判定は`src/services/news`に分離した。

```text
UI → Post生成ルール → PostDraft / PostSlide
UI → NewsProvider → Mock / Manual / RSS（将来接続）
UI → FavoriteCategory → 並び順 / 表示 / キーワード / 利用履歴
NewsProvider → URL正規化 → 記事判定 → 記事URL優先
UI → ManualNews → 記事URL検証 → localStorage
UI → CaptionBlock → 並び替え / 整形 / 短縮 → Caption
UI → PostSlide → 文字 / 4レイアウト / 順番 → Canvas PNG
UI → Storage Adapter（現在localStorage、将来D1/R2）
```

AI接続時はサーバールートを追加し、APIキーをサーバーだけで参照する。入力は見出し、要約、出典、コメント、スタイル、文体に限定し、構造化JSONをZodで検証して失敗時は現在の固定ルールへフォールバックする。
