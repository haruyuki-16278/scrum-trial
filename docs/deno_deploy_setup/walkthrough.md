# Deno Deploy 設定確認 (Walkthrough)

## 実施した変更
`docs/deno_deploy_setup` ディレクトリにドキュメントを作成し、GitHbu Actions 用のワークフローファイルを作成しました。

- **ファイル**: `.github/workflows/deploy.yml`
    - Node.js をセットアップし、Frontend (`./frontend`) をビルドします。
    - ビルドされた静的ファイル (`dist`) を含む状態で、Deno Deploy にアップロードします。

## 次のステップ（ユーザー作業）

1. **GitHub へ Push**
   - 作成された `.github/workflows/deploy.yml` をリポジトリにコミットし、GitHub へプッシュしてください。

2. **Deno Deploy でのプロジェクト設定**
   - [Deno Deploy Dashboard](https://dash.deno.com/) にアクセスします。
   - **New Project** を作成します。
   - **Git Integration** を選択し、この GitHub リポジトリを選択します。
   - **Build Step** の設定画面が出るかもしれませんが、今回は GitHub Actions でデプロイするため、デフォルトのままで構いません（あるいは "GitHub Actions" モードを選択できる場合はそちらを推奨）。
     - *重要*: 自動デプロイ (Automatic) が走ると `frontend/dist` が無いため失敗、または画面が真っ白になる可能性がありますが、直後に GitHub Actions が走り、正しいビルド物がデプロイされれば成功です。

   - **プロジェクトのリンク**:
     - リポジトリ設定で Deno Deploy プロジェクトとリンクされていれば、`deploy.yml` 内の `project` 指定は不要です。
     - もし明示的に指定したい場合は、`.github/workflows/deploy.yml` の `with` セクションに `project: "あなたのプロジェクト名"` を追記してください。

3. **環境変数の設定 (Deno KV)**
   - アプリケーションが動作するために必要な環境変数がもしあれば、Deno Deploy のプロジェクト設定 ("Settings" -> "Environment Variables") で追加してください。
     - 今回、Deno KV (`--unstable-kv`) を使用していますが、Deno Deploy ではデフォルトで有効であり、設定なしで永続化が利用できます。

4. **動作確認**
   - GitHub Actions の実行完了を待ちます。
   - Deno Deploy のデプロイメント URL にアクセスし、アプリが表示されるか確認してください。
