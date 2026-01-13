# 実装計画: E2Eテスト失敗時の録画保存

## 変更対象ファイル
- `tests/e2e/scrum.spec.ts`

## 変更詳細

### `test.afterEach` の導入
既存の `test.afterAll` を削除し、代わりに以下の処理を行う `test.afterEach` を実装する。

1. 各ページ（`ページA`, `ページB`, `ページC`）のビデオオブジェクトを取得する。
2. 各ブラウザコンテキスト（`コンテキストA`, `コンテキストB`, `コンテキストC`）を閉じる (`close()`)。これにより録画データがディスクにフラッシュされる。
3. 取得しておいたビデオオブジェクトからパスを取得し、`testInfo.attach()` を使用してレポートに添付する。

### 既存コードの削除
- テストケース関数 (`test('スクラム全体サイクル...', ...)`) の末尾にある、`動画リスト` をループして添付している既存のブロックを削除する。

## コードイメージ

```typescript
test.afterEach(async ({}, testInfo) => {
  const contexts = [コンテキストA, コンテキストB, コンテキストC];
  const pages = [
    { page: ページA, name: 'ユーザーA (SM)' },
    { page: ページB, name: 'ユーザーB (PO)' },
    { page: ページC, name: 'ユーザーC (Dev)' }
  ];

  // 1. Close all contexts to save videos
  await Promise.all(contexts.map(c => c?.close()));

  // 2. Attach videos
  for (const item of pages) {
    const video = item.page?.video();
    if (video) {
        const path = await video.path().catch(() => null);
        if (path) {
            await testInfo.attach(`${item.name} の操作動画`, { path, contentType: 'video/webm' });
        }
    }
  }
});
```
※ `afterAll` は削除する。

## 検証
- 文法的に誤りがないか確認。
- ユーザーに失敗時も録画が見れるようになることを説明。
