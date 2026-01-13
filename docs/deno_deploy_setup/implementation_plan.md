# 実装計画: Deno Deploy デプロイ設定

## 目的
Scrum Trial App を Deno Deploy 上で稼働させる。
Frontend は Vite でビルドし、Backend は Deno で動作し、Frontend の静的ファイルを配信する既存の構成を利用する。

## 課題
- Deno Deploy の Git 連携 (Automatic) だけでは、`.gitignore` されている `frontend/dist` が含まれないため、画面が表示されない。
- GitHub Actions を使用して、デプロイ前にビルドを行う必要がある。

## 変更内容

### 1. GitHub Actions Workflow の作成 (`.github/workflows/deploy.yml`)
- **Trigger**: `main` ブランチへの push (または `master`)
- **Job Steps**:
    1.  **Checkout**: リポジトリの取得
    2.  **Setup Node.js**: Frontend ビルド用
    3.  **Build Frontend**: `npm ci` && `npm run build` (in `frontend` dir) -> `frontend/dist` 生成
    4.  **Deploy**: `denoland/deployctl` アクションを使用
        - `project`: **必須** (Deno Deploy のプロジェクト名)
        - `entrypoint`: `server.ts`
        - `root`: `.` (プロジェクトルート)
        - `permissions`: `id-token: write` (OIDC認証用)

## ユーザー側での作業
- `.github/workflows/deploy.yml` の `project: "scrum-trial"` を実際の Deno Deploy プロジェクト名に変更する。

## 検証手順
- 作成した Workflow ファイルをコミット & プッシュ
- GitHub Actions タブで成功を確認
- Deno Deploy の URL にアクセスし、アプリが表示されるか確認
