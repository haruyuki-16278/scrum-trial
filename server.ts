import アプリ from "./backend/アプリ.ts";
import { セッションWebSocket処理 } from "./backend/websockets/セッションWS.ts";
import { YjsWebSocket処理 } from "./backend/websockets/YjsWS.ts";

console.log("Starting server (Refactored)...");

Deno.serve({ port: 8001 }, (リクエスト) => {
    const url = new URL(リクエスト.url);

    // Bypass Hono for WebSockets
    if (url.pathname === "/ws") {
        return セッションWebSocket処理(リクエスト);
    }
    
    if (url.pathname.startsWith("/yjs/")) {
        const ドキュメント名 = url.pathname.slice(5); // remove "/yjs/"
        return YjsWebSocket処理(リクエスト, ドキュメント名);
    }

    // Default to Hono
    return アプリ.fetch(リクエスト);
});
