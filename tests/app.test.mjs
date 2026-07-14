import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createFavoriteCategory, createInitialFavoriteCategories, deleteFavoriteCategory, isFrequentCategory, recordCategoryUsage, reorderFavoriteCategories } from "../src/lib/categories.ts";
import { composeCaption, createCaptionBlocks, polishCaptionBlocks, reorderCaptionBlocks, shortenCaptionBlocks } from "../src/lib/composer.ts";
import { createManualNewsItem } from "../src/services/news/manual.ts";
import { createArticleSearchUrl, getPreferredArticleUrl, isLikelyArticleUrl, normalizeNewsUrl, resolveArticleUrl } from "../src/services/news/url.ts";
import { createBingNewsRssUrl, createGoogleNewsRssUrl, deduplicateRssNews, normalizeRssCategories, parseBingNewsRss, parseGoogleNewsRss } from "../src/services/news/rss.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers:{ accept:"text/html" } }), { ASSETS:{ fetch:async()=>new Response("Not found",{status:404}) } }, { waitUntil(){}, passThroughOnException(){} });
}

test("Insta News Studioをサーバーレンダリングする", async()=>{
  const response=await render();
  assert.equal(response.status,200);
  const html=await response.text();
  assert.match(html,/Insta News Studio/);
  assert.match(html,/ニュースから今日の投稿をつくる/);
  assert.doesNotMatch(html,/codex-preview|Your site is taking shape/);
});

test("主要導線とフォールバックを実装している", async()=>{
  const [app,models,mock]=await Promise.all([read("app/InstaNewsStudio.tsx"),read("src/lib/models.ts"),read("src/services/news/MockNewsProvider.ts")]);
  for(const phrase of ["今日のおすすめ","投稿候補にする","あなたのコメント","投稿素材を生成する","この画像を保存","本文をコピー","投稿済みにする","Instagramへの投稿手順"]) assert.match(app,new RegExp(phrase));
  assert.match(models,/generateDraft/);
  assert.match(mock,/モックニュース/);
});

test("画像生成は1080px正方形で長文を折り返す", async()=>{
  const app=await read("app/InstaNewsStudio.tsx");
  assert.match(app,/width="1080" height="1080"/);
  assert.match(app,/drawWrapped/);
  assert.match(app,/toDataURL\("image\/png"\)/);
});

test("PWAと8種類のテーマを提供する", async()=>{
  const [manifest,models,layout]=await Promise.all([read("public/manifest.webmanifest"),read("src/lib/models.ts"),read("app/layout.tsx")]);
  assert.equal(JSON.parse(manifest).display,"standalone");
  assert.equal((models.match(/\[".+?","theme-/g)||[]).length,8);
  assert.match(layout,/manifest\.webmanifest/);
});

test("おすすめジャンルを追加・削除・並び替え・初期化できる",()=>{
  const initial=createInitialFavoriteCategories();
  assert.equal(initial.length,8);
  const added=[...initial,createFavoriteCategory(initial.length,"custom-test")];
  assert.equal(added.length,9);
  assert.equal(added.at(-1).displayName,"新しいジャンル");
  const reordered=reorderFavoriteCategories(added,"custom-test",initial[0].id);
  assert.equal(reordered[0].id,"custom-test");
  assert.deepEqual(reordered.map(item=>item.order),reordered.map((_,index)=>index));
  const deleted=deleteFavoriteCategory(reordered,"custom-test");
  assert.equal(deleted.length,8);
  const reset=createInitialFavoriteCategories();
  assert.equal(reset.every(category=>category.usageCount===0),true);
});

test("ジャンル利用回数と最近よく利用する判定を更新する",()=>{
  let categories=createInitialFavoriteCategories();
  for(let index=0;index<3;index++)categories=recordCategoryUsage(categories,"AI",`2026-07-1${index+1}T00:00:00.000Z`);
  const ai=categories.find(category=>category.displayName==="AI");
  assert.equal(ai.usageCount,3);
  assert.equal(ai.lastUsedAt,"2026-07-13T00:00:00.000Z");
  assert.equal(isFrequentCategory(ai),true);
});

test("記事URLを正規化し、一覧URLと記事URLを判定する",()=>{
  assert.equal(normalizeNewsUrl("https://example.com/news/123/?utm_source=rss&b=2&a=1#top"),"https://example.com/news/123?a=1&b=2");
  assert.equal(isLikelyArticleUrl("https://example.com/"),false);
  assert.equal(isLikelyArticleUrl("https://example.com/rss.xml"),false);
  assert.equal(isLikelyArticleUrl("https://example.com/category/sports"),false);
  assert.equal(isLikelyArticleUrl("https://example.com/news/2026/important-story"),true);
  assert.equal(getPreferredArticleUrl({articleUrl:"https://example.com/news/1?utm_medium=rss",originalUrl:"https://example.com/feed",isArticleUrl:true}),"https://example.com/news/1");
});

test("RSSのリダイレクト先を記事URLとして優先する",async()=>{
  const responses=new Map([
    ["https://example.com/go",new Response(null,{status:302,headers:{location:"/news/42?utm_campaign=test"}})],
    ["https://example.com/news/42",new Response(null,{status:200})],
  ]);
  const result=await resolveArticleUrl("https://example.com/go",async input=>responses.get(input)??new Response(null,{status:404}));
  assert.deepEqual(result,{articleUrl:"https://example.com/news/42",redirectCount:1,isArticleUrl:true});
});

test("ニュース導線とジャンル管理UIを提供する",async()=>{
  const app=await read("app/InstaNewsStudio.tsx");
  for(const phrase of ["おすすめジャンル管理","ジャンル追加","初期8ジャンルへ戻す","この記事を読む","配信元を見る","リンクをコピー","タイトルをコピー"])assert.match(app,new RegExp(phrase));
  assert.match(app,/onDragStart/);
  assert.match(app,/onTouchStart/);
});

test("記事URL付きニュースを手動登録し、検索リンクを作れる",()=>{
  const item=createManualNewsItem({title:"若手選手の起用方針を発表",summary:"起用方針の要点です。",sourceName:"球団公式",articleUrl:"https://example.com/news/2026/entry?utm_source=share",category:"プロ野球"},new Date("2026-07-15T00:00:00.000Z"));
  assert.equal(item.articleUrl,"https://example.com/news/2026/entry");
  assert.equal(item.isArticleUrl,true);
  assert.equal(item.id,"manual-1784073600000");
  assert.throws(()=>createManualNewsItem({title:"一覧",summary:"",sourceName:"",articleUrl:"https://example.com/",category:"AI"}),/記事本文/);
  assert.match(createArticleSearchUrl("記事タイトル","配信元"),/^https:\/\/www\.google\.com\/search\?q=/);
});

test("生成AIなしで文章ブロックを構成・並び替え・整形・短縮できる",()=>{
  const news={title:"ニュース",summary:"概要です。 次の説明です。",sourceName:"公式",category:"AI",keywords:["生成AI","教育"]};
  const blocks=createCaptionBlocks(news,"自分の意見",news.title,"個人的な感想です。",["#AI"]);
  assert.equal(blocks.length,7);
  assert.match(composeCaption(blocks),/私が注目したのは/);
  assert.equal(reorderCaptionBlocks(blocks,"summary",-1)[0].id,"summary");
  assert.match(composeCaption(polishCaptionBlocks(blocks)),/概要です。\n次の説明です。/);
  assert.ok(shortenCaptionBlocks(blocks.map(block=>({...block,body:block.body.repeat(20)}))).every(block=>block.body.length<=161));
});

test("画像と文章の直接編集UIを提供する",async()=>{
  const app=await read("app/InstaNewsStudio.tsx");
  for(const phrase of ["見つけた記事を登録する","タイトルで記事を探す","画像の文字と構成を編集","前へ移動","複製","文章構成エディター","読みやすく整える","短くまとめる"])assert.match(app,new RegExp(phrase));
  assert.match(app,/layout-headline|layout-/);
  assert.match(app,/captionBlocks/);
});

test("公開RSSを実ニュースへ変換し、除外・重複排除できる",()=>{
  const category={id:"ai",name:"AI",keywords:["生成AI"],excludedKeywords:["広告"]};
  const xml=`<?xml version="1.0"?><rss><channel>
    <item><title>生成AIを教育へ活用 - 配信社</title><link>https://news.google.com/rss/articles/abc?utm_source=rss</link><pubDate>Wed, 15 Jul 2026 01:00:00 GMT</pubDate><source url="https://example.com/">配信社</source></item>
    <item><title>広告のお知らせ - 配信社</title><link>https://news.google.com/rss/articles/ad</link><pubDate>Wed, 15 Jul 2026 00:00:00 GMT</pubDate><source url="https://example.com/">配信社</source></item>
  </channel></rss>`;
  const items=parseGoogleNewsRss(xml,category);
  assert.equal(items.length,1);
  assert.equal(items[0].title,"生成AIを教育へ活用");
  assert.equal(items[0].sourceName,"配信社");
  assert.equal(items[0].isArticleUrl,true);
  assert.equal(isLikelyArticleUrl(items[0].articleUrl),true);
  assert.equal(deduplicateRssNews([...items,{...items[0],id:"duplicate"}]).length,1);
  assert.match(createGoogleNewsRssUrl(category),/^https:\/\/news\.google\.com\/rss\/search\?/);
});

test("RSSリクエストを制限し、不正な入力を除外する",()=>{
  const categories=normalizeRssCategories([{id:"ai",name:" AI ",keywords:["生成AI",1],excludedKeywords:["広告"]},null,{name:""}]);
  assert.deepEqual(categories,[{id:"ai",name:"AI",keywords:["生成AI"],excludedKeywords:["広告"]}]);
  assert.deepEqual(normalizeRssCategories("invalid"),[]);
});

test("代替RSSから配信元の直接記事URLを取り出す",()=>{
  const category={id:"ai",name:"AI",keywords:["AI"],excludedKeywords:[]};
  const xml=`<rss><channel><item><title>AIの最新記事</title><link>http://www.bing.com/news/apiclick.aspx?ref=FexRss&amp;url=https%3A%2F%2Fexample.com%2Fnews%2F42%3Futm_source%3Drss</link><pubDate>Tue, 14 Jul 2026 14:30:00 GMT</pubDate><News:Source>ニュース社</News:Source></item></channel></rss>`;
  const [item]=parseBingNewsRss(xml,category);
  assert.equal(item.articleUrl,"https://example.com/news/42?utm_source=rss");
  assert.equal(item.sourceUrl,"https://example.com");
  assert.equal(item.sourceName,"ニュース社");
  assert.equal(item.redirectCount,1);
  assert.match(createBingNewsRssUrl(category),/^https:\/\/www\.bing\.com\/news\/search\?/);
});

test("実ニュース取得UIとモックフォールバックを提供する",async()=>{
  const [app,route]=await Promise.all([read("app/InstaNewsStudio.tsx"),read("app/api/news/route.ts")]);
  for(const phrase of ["実ニュース","最新ニュースを取得","公開RSS","モックニュースを表示中","生成AI・AI APIは使用していません"])assert.match(app,new RegExp(phrase));
  assert.match(route,/Public News RSS/);
  assert.match(route,/status:502/);
});
