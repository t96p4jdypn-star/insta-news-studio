# アーキテクチャ

UIはNext.js App Router上のクライアントアプリとして動作し、Cloudflare Workers互換のvinextでビルドする。画面状態と端末内データは`app/InstaNewsStudio.tsx`、生成ルールと型は`src/lib/models.ts`、ニュース取得境界は`src/services/news`に分離した。

```text
UI → Post生成ルール → PostDraft / PostSlide
UI → NewsProvider → Mock / Manual / RSS（将来接続）
UI → Storage Adapter（現在localStorage、将来D1/R2）
```

AI接続時はサーバールートを追加し、APIキーをサーバーだけで参照する。入力は見出し、要約、出典、コメント、スタイル、文体に限定し、構造化JSONをZodで検証して失敗時は現在の固定ルールへフォールバックする。
