import { encoding, decoding } from "npm:lib0";
import * as syncProtocol from "npm:y-protocols/sync";
import * as Yjsサービス from "../services/Yjsサービス.ts";

export const YjsWebSocket処理 = (リクエスト: Request, ドキュメント名: string) => {


    if (リクエスト.headers.get("upgrade") !== "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    try {
        const { response, socket: ソケット } = Deno.upgradeWebSocket(リクエスト);

        ソケット.onopen = () => {

            if (!Yjsサービス.Yjs接続一覧.has(ドキュメント名)) {
                Yjsサービス.Yjs接続一覧.set(ドキュメント名, new Set());
            }
            Yjsサービス.Yjs接続一覧.get(ドキュメント名)!.add(ソケット);
            
            // 永続化からの読み込み待機
            Yjsサービス.ドキュメント取得(ドキュメント名).then(ドキュメント => {
                 if (!Yjsサービス.ハンドラー登録済み一覧.has(ドキュメント名)) {
                     ドキュメント.on('update', (update, origin) => {
                             Yjsサービス.更新ハンドラー(update, origin, ドキュメント, ドキュメント名);
                     });
                     Yjsサービス.ハンドラー登録済み一覧.add(ドキュメント名);
                 }
                 
                 // 初期同期 (Step 1)
                 const エンコーダー = encoding.createEncoder();
                 encoding.writeVarUint(エンコーダー, Yjsサービス.メッセージ同期);
                 syncProtocol.writeSyncStep1(エンコーダー, ドキュメント);
                 ソケット.send(encoding.toUint8Array(エンコーダー));
            });
        };

        ソケット.onmessage = async (イベント) => {
            const ドキュメント = await Yjsサービス.ドキュメント取得(ドキュメント名);
            const データ = new Uint8Array(イベント.data instanceof ArrayBuffer ? イベント.data : new ArrayBuffer(0));
            
            try {
                const エンコーダー = encoding.createEncoder();
                const デコーダー = decoding.createDecoder(データ);
                const メッセージタイプ = decoding.readVarUint(デコーダー);
                
                if (メッセージタイプ === Yjsサービス.メッセージ同期) {
                    encoding.writeVarUint(エンコーダー, Yjsサービス.メッセージ同期);
                    syncProtocol.readSyncMessage(デコーダー, エンコーダー, ドキュメント, ソケット); // socketをoriginとして渡す
                    if (encoding.length(エンコーダー) > 1) {
                        ソケット.send(encoding.toUint8Array(エンコーダー));
                    }
                } else if (メッセージタイプ === Yjsサービス.メッセージアウェアネス) {
                        // Awareness broadcast
                        const 接続セット = Yjsサービス.Yjs接続一覧.get(ドキュメント名);
                        if (接続セット) {
                            接続セット.forEach(c => {
                                if (c !== ソケット && c.readyState === WebSocket.OPEN) {
                                    c.send(データ);
                                }
                            });
                        }
                }
            } catch (e) {
                console.error("Yjs Message Error", e);
            }
        };

        ソケット.onclose = async () => {
            const 接続セット = Yjsサービス.Yjs接続一覧.get(ドキュメント名);
            if (接続セット) {
                接続セット.delete(ソケット);
                if (接続セット.size === 0) {
                        Yjsサービス.Yjs接続一覧.delete(ドキュメント名);
                        Yjsサービス.ハンドラー登録済み一覧.delete(ドキュメント名);

                        // 最後の切断時に即時保存
                        const ドキュメント = await Yjsサービス.ドキュメント取得(ドキュメント名);
                        if (ドキュメント) {
                             // タイマーキャンセルして即時保存
                             Yjsサービス.ドキュメント保存(ドキュメント名, ドキュメント).then(() => {

                                 // メモリ解放（必要に応じて）
                                 Yjsサービス.Yドキュメント一覧.delete(ドキュメント名); 
                             });
                        }
                }
            }
        };

        return response;
    } catch (e) {
        console.error("Yjs Upgrade Error:", e);
        return new Response("WebSocket upgrade failed", { status: 500 });
    }
}
