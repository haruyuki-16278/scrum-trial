import { Hono } from "hono";
import * as Y from "npm:yjs";
import * as データベース from "../services/データベース.ts";
import * as Yjsサービス from "../services/Yjsサービス.ts";

const APIルーター = new Hono();

// Helper to encode Uint8Array to Base64
const toBase64 = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Helper to decode Base64 to Uint8Array
const fromBase64 = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

// REST API to get Yjs state (ReadOnly access)
APIルーター.get("/sessions/:id/yjs-state", async (c) => {
  const ドキュメント名 = c.req.param("id");
  const ドキュメント = await Yjsサービス.ドキュメント取得(ドキュメント名);
  
  // Encode the entire state as update
  const 状態 = Y.encodeStateAsUpdate(ドキュメント);
  const base64 = toBase64(状態);
  
  return c.json({ state: base64 });
});

APIルーター.post("/sessions/:id/yjs-state", async (c) => {
  const ドキュメント名 = c.req.param("id");
  const body = await c.req.json();
  if (body.state) {
      try {
        const update = fromBase64(body.state);
        const ドキュメント = await Yjsサービス.ドキュメント取得(ドキュメント名);
        Y.applyUpdate(ドキュメント, update, 'api-push');
        Yjsサービス.遅延保存トリガー(ドキュメント名, ドキュメント);
        // Also broadcast to other WebSocket clients
        Yjsサービス.更新ハンドラー(update, 'api-push', ドキュメント, ドキュメント名);
        return c.json({ success: true, size: update.length });
      } catch (e) {
          console.error("Failed to apply REST update:", e);
          return c.json({ error: "Invalid state" }, 400);
      }
  }
  return c.json({ error: "No state provided" }, 400);
});

APIルーター.post("/sessions", async (c) => {
  const body = await c.req.json();
  const セッション = await データベース.セッション作成(body.name);
  return c.json(セッション);
});

export default APIルーター;
