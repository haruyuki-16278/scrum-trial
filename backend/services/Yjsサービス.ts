import * as Y from "npm:yjs";
import { encoding } from "npm:lib0";
import * as syncProtocol from "npm:y-protocols/sync";
import * as データベース from "./データベース.ts";

// 変数
export const Yドキュメント一覧 = new Map<string, Y.Doc>();
export const Yjs接続一覧 = new Map<string, Set<WebSocket>>();
export const ハンドラー登録済み一覧 = new Set<string>();
const 保存タイマー一覧 = new Map<string, number>();
const 保存遅延時間MS = 2000;

export const メッセージ同期 = 0;
export const メッセージアウェアネス = 1;

// 関数
export const ドキュメント保存 = async (ドキュメント名: string, ドキュメント: Y.Doc) => {

    const 状態 = Y.encodeStateAsUpdate(ドキュメント);
    await データベース.Yjs更新保存(ドキュメント名, 状態);
};

export const 遅延保存トリガー = (ドキュメント名: string, ドキュメント: Y.Doc) => {
    const 既存タイマー = 保存タイマー一覧.get(ドキュメント名);
    if (既存タイマー) {
        clearTimeout(既存タイマー);
    }
    const タイマーID = setTimeout(() => {
        ドキュメント保存(ドキュメント名, ドキュメント);
        保存タイマー一覧.delete(ドキュメント名);
    }, 保存遅延時間MS) as unknown as number;
    保存タイマー一覧.set(ドキュメント名, タイマーID);
};

export const ドキュメント取得 = async (ドキュメント名: string) => {
    if (!Yドキュメント一覧.has(ドキュメント名)) {
        const ドキュメント = new Y.Doc();
        Yドキュメント一覧.set(ドキュメント名, ドキュメント);
        
        // Load initial state synchronously (await) to ensure consistency for new connections
        const 状態 = await データベース.Yjs状態取得(ドキュメント名);
        if (状態) {

            Y.applyUpdate(ドキュメント, 状態, 'persistence-load');
        }
    }
    return Yドキュメント一覧.get(ドキュメント名)!;
}

export const 更新ハンドラー = (更新データ: Uint8Array, origin: any, ドキュメント: Y.Doc, ドキュメント名: string) => {
    const エンコーダー = encoding.createEncoder();
    encoding.writeVarUint(エンコーダー, メッセージ同期);
    syncProtocol.writeUpdate(エンコーダー, 更新データ);
    const メッセージ = encoding.toUint8Array(エンコーダー);

    const 接続セット = Yjs接続一覧.get(ドキュメント名);
    if (接続セット) {

        接続セット.forEach(ws => {
            if (ws !== origin && ws.readyState === WebSocket.OPEN) {
                ws.send(メッセージ);
            }
        });
    }

    if (origin !== 'persistence-load') {
        遅延保存トリガー(ドキュメント名, ドキュメント);
    }
}
