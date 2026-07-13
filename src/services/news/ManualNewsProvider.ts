import type { NewsItem, NewsProvider } from "./NewsProvider";

export class ManualNewsProvider implements NewsProvider {
  readonly name = "手動登録";
  constructor(private readonly items: NewsItem[] = []) {}
  async getLatest() { return this.items; }
}
