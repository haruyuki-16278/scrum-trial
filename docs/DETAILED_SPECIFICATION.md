# スク・ラム・トライアル (Scrum Trial) 詳細仕様書

## 1. システムアーキテクチャ

本システムは、Denoによるバックエンドサーバーと、React (Vite) によるフロントエンドSPAで構成されます。リアルタイム通信にはWebSocketを使用し、アプリケーション状態（タスク、メンバー等）とドキュメント編集状態（Yjs）を同期します。

### 構成図
```mermaid
graph TD
    Client[Client (React/Vite)]
    Server[Server (Deno)]
    KV[(Deno KV)]

    Client -- REST API (POST/GET) --> Server
    Client -- WebSocket (/ws) --> Server
    Client -- WebSocket (/yjs) --> Server
    
    Server -- Persist --> KV
    Server -- Broadcast --> Client
```

## 2. 技術スタック

### フロントエンド
*   **Framework**: React 19, Vite 7
*   **Language**: TypeScript
*   **State Sync**: WebSocket (Custom Hook)
*   **Editor**: MDXEditor (Rich Text) + Yjs (CRDT)
*   **Styling**: Vanilla CSS (Variables, HSL colors)
*   **Testing**: Playwright (E2E)

### バックエンド
*   **Runtime**: Deno (Latest)
*   **Framework**: Hono (v4)
*   **Database**: Deno KV (Key-Value Store)
*   **Protocols**: 
    *   standard WebSocket (App State)
    *   y-websocket (Collaboration)
    *   REST API (Fallback/Session Creation)

## 3. バックエンド詳細仕様

### 3.1 API エンドポイント

#### REST API
*   `POST /api/sessions`: 新規セッション作成
    *   Req: `{ name: string }`
    *   Res: `{ id, name, createdAt, ...initialState }`
*   `GET /api/sessions/:id/yjs-state`: Yjsドキュメント状態の取得 (RESTフォールバック)
    *   Res: encoded Yjs binary state (Uint8Array)

#### WebSocket: `/ws`
アプリケーションのメインロジックを扱うWebSocketエンドポイント。
クエリパラメータ: `?sessionId={id}`

*   **受信メッセージ (Client -> Server)**:
    *   `JOIN`: 参加通知
    *   `ROLL`: ダイスロール実行
    *   `ADD_TASK`, `UPDATE_TASK`, `DELETE_TASK`: タスク操作
    *   `ADVANCE_PHASE`: フェーズ進行
    *   `UPDATE_DOC`: ドキュメント更新 (レガシー/バックアップ用)
*   **送信メッセージ (Server -> Client)**:
    *   `STATE`: 接続時の全状態同期
    *   `SESSION_UPDATE`, `TASKS_UPDATE`, `MEMBER_UPDATED`: 差分更新

#### WebSocket: `/yjs/:docName`
Yjsプロトコル(y-protocols)を用いたリアルタイム共同編集用エンドポイント。
*   MDXEditorの共同編集機能を提供。
*   `y-websocket` 互換のバイナリメッセージをやり取りする。

### 3.2 データ永続化 (Deno KV)

システムの状態はDeno KVに永続化され、サーバー再起動後も復元されます。

**Key設計**:
*   `["sessions", sessionId]`: セッション基本情報
*   `["sessions", sessionId, "members", memberId]`: メンバー情報
*   `["sessions", sessionId, "tasks", taskId]`: タスク情報
*   `["yjs", docName, "state"]`: Yjsドキュメントのバイナリ状態 (Uint8Array)

**永続化ロジック**:
*   アプリケーション状態: 操作毎に即時KVへ書き込み(`kv.atomic()`).
*   Yjs状態: 
    *   接続終了時(`close`イベント)に保存。
    *   編集操作に対するデバウンス(遅延)保存 (2000ms)。

## 4. フロントエンド詳細仕様

### 4.1 ディレクトリ構造 & コンポーネント
*   `src/components/WorkspaceScreen.tsx`: メイン画面。4カラムレイアウトの実装。
*   `src/hooks/useScrumSession.ts` (`useスクラムセッション`): WebSocket通信とアプリ状態管理を行うカスタムフック。
*   `src/plugins/yjsPlugin.tsx`: MDXEditorとYjsを接続するためのプラグイン設定。

### 4.2 コーディング規約 (日本語識別子)
本プロジェクトでは、可読性とドメイン知識の共有を目的として、**ソースコード内の識別子（変数名、関数名、コンポーネント名）を日本語で記述**しています。
*   例: `const [タスク一覧, タスク一覧設定] = useState([])`
*   *例外*: 通信プロトコル上のJSONフィールド名（`id`, `type`など）や、ライブラリ固有のプロパティ名は英語のまま維持。

### 4.3 Yjs統合とフォールバック
*   通常時はWebSocket (`/yjs`) でリアルタイム同期を行う。
*   読み取り専用モード（Finishedフェーズ）や、WebSocket接続に問題がある環境（テスト環境等）のために、REST APIから全状態を取得して適用するフォールバックロジックを `WorkspaceScreen.tsx` に実装済み。

## 5. テスト仕様

### Playwright E2Eテスト (`tests/e2e/scrum.spec.ts`)
「スクラム体験（Golden Path）」を網羅する自動テストを実装。
*   **シナリオ**: セッション作成 -> メンバー参加 -> タスク追加 -> スプリント開始 -> ダイスロール -> タスク完了 -> 振り返り(KPT)。
*   **特徴**: 複数のブラウザコンテキスト（User A, User B）を起動し、リアルタイム同期（Aの操作がBに反映されるか）を検証する。

## 6. 既知の問題と制限事項

1.  **Yjs Dual-Package Hazard**:
    *   Web/CommonJS/ESMモジュールの読み込み競合により、特定の環境下で `Invalid access: Add Yjs type...` エラーが発生する場合がある。
    *   **対策**: 本番動作には影響ないが、テスト環境ではRESTフォールバックにより各クライアントの状態整合性を担保している。
2.  **静的アセット配信**:
    *   現在、Denoサーバーからの静的フロントエンド配信は無効化されており、開発時は `vite` サーバーと `deno` サーバーを並列起動する必要がある。
