# Deno Deploy デプロイ設定

## 概要
Deno Deploy にアプリケーションをデプロイするための設定を行う。
Frontend (Vite) のビルドが必要であるため、GitHub Actions を利用して以下のフローを構築する。
1. Frontend のビルド (`frontend/dist` の生成)
2. Backend を含む全体を Deno Deploy へアップロード

## 前提
- Deno Deploy アカウントを持っていること
- GitHub リポジトリと連携可能であること

## タスク
- [x] `.github/workflows/deploy.yml` の作成
- [ ] `.github/workflows/deploy.yml` 内の `project` 名を実際のプロジェクト名に合わせて修正
- [ ] ユーザーへの設定手順（プロジェクト名、Secret）の案内
