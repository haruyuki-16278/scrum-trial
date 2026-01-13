# 変更内容の確認 (Walkthrough)

E2Eテストが失敗した際にも録画を確認できるように、`tests/e2e/scrum.spec.ts` を修正しました。

## 変更点

### `tests/e2e/scrum.spec.ts`

1.  **`test.afterAll` を `test.afterEach` に変更し、動画添付処理を追加**
    - コンテキストのクローズ処理と同時に、録画ファイルのパスを取得してテストレポートに添付するようにしました。
    - これにより、テストが失敗して途中で終了した場合でも、`afterEach` が実行されて録画が保存・添付されます。

2.  **テストケース末尾の動画添付処理を削除**
    - 重複を防ぐため、テスト本体の最後にあった動画添付コードを削除しました。

```typescript
// 変更前 (afterAll)
test.afterAll(async () => {
  await コンテキストA?.close();
  // ...
});

// 変更後 (afterEach)
test.afterEach(async ({}, testInfo) => {
  // コンテキストを閉じる
  await Promise.all([
     コンテキストA?.close(),
     // ...
  ]);

  // 動画を添付する
  const pages = [ ... ];
  for (const p of pages) {
      if (p.page?.video()) {
          // ... testInfo.attach(...)
      }
  }
});
```

これにより、CIやローカルでのテスト実行時に、エラー発生時の状況を動画で確認できるようになります。
