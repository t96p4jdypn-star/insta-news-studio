import type { Metadata } from "next";
import InstaNewsStudio from "./InstaNewsStudio";

export const metadata: Metadata = {
  title: "Insta News Studio｜ニュースから今日の投稿をつくる",
  description: "気になるニュースを選び、自分の言葉を添えてInstagram投稿素材をつくるアプリ。",
};

export default function Home() {
  return <InstaNewsStudio />;
}
