# データモデル

- `InterestProfile`: 利用目的、カテゴリ、キーワード、除外キーワード、好みのスタイル
- `NewsItem`: 見出し、短い要約、出典、URL、日時、カテゴリ、キーワード、興味度、状態
- `PostDraft`: ニュース、コメント、スタイル、文体、見出し、本文、ハッシュタグ、出典、状態、予定日、投稿日
- `PostSlide`: 順番、テンプレート、見出し、本文

端末内キーは`insta-news-studio-*-v1`。将来D1ではNewsItem、UserComment、PostDraft、PostSlideを正規化し、ユーザー画像のバイナリはR2、権利確認と参照情報はD1に保存する。
