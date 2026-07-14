# データモデル

- `InterestProfile`: 利用目的、カテゴリ、キーワード、除外キーワード、好みのスタイル、FavoriteCategory一覧
- `FavoriteCategory`: ID、表示名、アイコン、検索キーワード、除外キーワード、表示順、表示可否、説明、初期表示対象、利用回数、最終利用日
- `NewsItem`: 見出し、短い要約、出典、articleUrl、sourceUrl、feedUrl、originalUrl、isArticleUrl、redirectCount、日時、カテゴリ、キーワード、興味度、状態
- `PostDraft`: ニュース、コメント、スタイル、文体、見出し、本文、CaptionBlock、ハッシュタグ、出典、状態、予定日、投稿日
- `CaptionBlock`: 見出し、ニュース概要、意見、注目ポイント、問いかけ、出典、ハッシュタグの本文・表示可否・順番
- `PostSlide`: 順番、テンプレート、見出し、本文、レイアウト（標準・見出し重視・コメント引用・シンプル）

端末内キーは既存互換のため`insta-news-studio-*-v1`を維持する。手動ニュースは`insta-news-studio-manual-news-v1`へ保存する。旧InterestProfileとPostDraftは、既存内容を保ったままFavoriteCategory、標準レイアウト、CaptionBlockを補完する。将来D1ではFavoriteCategory、NewsItem、UserComment、PostDraft、CaptionBlock、PostSlideを正規化する。
