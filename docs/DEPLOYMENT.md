# 公開

## 必要条件

- Node.js 22以上
- pnpm
- Sitesへの公開権限

## 手順

1. `pnpm install`
2. `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
3. `dist/`、`.openai/hosting.json`をSites用アーカイブへまとめる
4. 検証済みGit commitに対応するSite Versionを保存
5. 所有者限定の非公開環境へデプロイ

環境変数は公開環境側に保存し、Gitへcommitしない。公開後はトップ画面、主要導線、PC/iPhone幅、console errorを確認する。
