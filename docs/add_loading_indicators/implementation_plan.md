# 実装計画: ローディング・スケルトン表示の追加

## 概要
ユーザーインタラクションに対するレスポンス向上として、主要なアクションにローディング状態を追加する。
状態管理は画面の親コンポーネントである `ワークスペース画面.tsx` で行い、各子コンポーネントにフラグを渡して表示を制御する。

## 変更ファイル

### 1. `frontend/src/index.css`
*   **追加**: `spinner` クラスおよびアニメーション定義を追加する。
*   **追加**: 必要に応じて `skeleton` クラスを追加する。

### 2. `frontend/src/components/ワークスペース画面.tsx`
*   **変更**: 以下のローディング状態をStateとして追加する。
    *   `isAddingTask` (boolean): PBLへのタスク追加中
    *   `processingTaskId` (string | null): タスク移動/更新中のタスクID
    *   `processingUserId` (string | null): ロール変更中のユーザーID
*   **変更**: 既存のハンドラ（`PBL追加処理`, `タスク移動`, `役職変更処理`）をラップし、ローディング状態のON/OFFを行うように修正する。
*   **変更**: 子コンポーネントへ上記のStateを追加のPropsとして渡す。

### 3. `frontend/src/components/scrum/プロダクトバックログ.tsx`
*   **変更**: Propsインターフェースに `isAdding` (boolean) と `processingTaskId` (string | null) を追加。
*   **変更**: タスク追加ボタンにおいて、`isAdding` が true の場合はボタンを無効化し、アイコンをスピナーにする。
*   **変更**: タスク移動ボタンにおいて、`processingTaskId` が対象タスクIDと一致する場合、ボタンを無効化し、アイコンをスピナーにする。

### 4. `frontend/src/components/scrum/スプリントバックログ.tsx`
*   **変更**: Propsインターフェースに `processingTaskId` (string | null) を追加。
*   **変更**: タスク移動（PBLへ戻す）ボタンにおいて、`processingTaskId` が一致する場合、ローディング表示を行う。

### 5. `frontend/src/components/scrum/チームパネル.tsx`
*   **変更**: Propsインターフェースに `processingUserId` (string | null) を追加。
*   **変更**: ロールアイコンのクリック時に `processingUserId` が一致する場合、アイコン内に極小のスピナーを表示するか、点滅させるなどして処理中であることを示す。

## 手順
1.  `index.css` にスタイルを追加。
2.  `ワークスペース画面.tsx` にStateとハンドラロジックを追加。
3.  各子コンポーネントにProps定義を追加およびUI実装。
4.  動作確認。
