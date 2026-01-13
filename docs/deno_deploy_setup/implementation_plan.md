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
    4.  **Setup Deno**: (Optional, deployctl が内包している場合もあるが明示的に設定推奨)
    5.  **Deploy**: `denoland/deployctl` アクションを使用
        - `entrypoint`: `server.ts`
        - `root`: `.` (プロジェクトルート)
        - `permissions`: `id-token: write` (OIDC認証用)

## ユーザー側での作業
- Deno Deploy で新規プロジェクトを作成 (または既存プロジェクトを使用)
- プロジェクトと GitHub リポジトリをリンク (ただし、Automatic モードではなく GitHub Actions モードとして扱うため、プロジェクト名を Workflow に記述するか、リンク済みであれば `deployctl` が自動検出することを期待)

※ `deployctl` アクションは、GitHub リポジトリが Deno Deploy プロジェクトにリンクされている場合、複雑な設定なしで OIDC 認証でデプロイ可能。

## 検証手順
- 作成した Workflow ファイルをコミット & プッシュ
- GitHub Actions タブで成功を確認
- Deno Deploy の URL にアクセスし、アプリが表示されるか確認
