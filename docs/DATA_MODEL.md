# データモデル

- `InterestProfile`: 利用目的、カテゴリ、キーワード、除外キーワード、好みのスタイル、FavoriteCategory一覧
- `FavoriteCategory`: ID、表示名、アイコン、検索キーワード、除外キーワード、表示順、表示可否、説明、初期表示対象、利用回数、最終利用日
- `NewsItem`: 見出し、短い要約、出典、articleUrl、sourceUrl、feedUrl、originalUrl、isArticleUrl、redirectCount、日時、カテゴリ、キーワード、興味度、状態
- `PostDraft`: ニュース、コメント、スタイル、文体、見出し、本文、ハッシュタグ、出典、状態、予定日、投稿日
- `PostSlide`: 順番、テンプレート、見出し、本文

端末内キーは既存互換のため`insta-news-studio-*-v1`を維持する。旧InterestProfileを読み込むと初期8ジャンルを補い、既存カテゴリとキーワードを失わずFavoriteCategoryへ移行する。将来D1ではFavoriteCategory、NewsItem、UserComment、PostDraft、PostSlideを正規化し、ユーザー画像のバイナリはR2、権利確認と参照情報はD1に保存する。
