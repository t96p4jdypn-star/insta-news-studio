import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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
