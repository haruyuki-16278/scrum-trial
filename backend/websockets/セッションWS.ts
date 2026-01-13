import * as データベース from "../services/データベース.ts";

const 接続リスト = new Map<string, Set<WebSocket>>();
const チャンネル一覧 = new Map<string, BroadcastChannel>();

function チャンネル取得または作成(セッションID: string) {
  if (!チャンネル一覧.has(セッションID)) {
    const チャンネル = new BroadcastChannel(`session-${セッションID}`);
    チャンネル.onmessage = (e) => {
      const 接続セット = 接続リスト.get(セッションID);
      if (接続セット) {
        for (const ソケット of 接続セット) {
          try {
            ソケット.send(JSON.stringify(e.data));
          } catch {
            // ignore closed
          }
        }
      }
    };
    チャンネル一覧.set(セッションID, チャンネル);
  }
  return チャンネル一覧.get(セッションID)!;
}

function セッションへ配信(セッションID: string, メッセージ: any) {
  チャンネル取得または作成(セッションID).postMessage(メッセージ);
  const 接続セット = 接続リスト.get(セッションID);
  if (接続セット) {
    for (const ソケット of 接続セット) {
      try {
        ソケット.send(JSON.stringify(メッセージ));
      } catch {
        // ignore
      }
    }
  }
}

export const セッションWebSocket処理 = (リクエスト: Request) => {
    const url = new URL(リクエスト.url);
    const セッションID = url.searchParams.get("sessionId");

    if (リクエスト.headers.get("upgrade") !== "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    try {
        const { response, socket: ソケット } = Deno.upgradeWebSocket(リクエスト);

        ソケット.onopen = () => {
             if (セッションID) {
                  if (!接続リスト.has(セッションID)) {
                    接続リスト.set(セッションID, new Set());
                    チャンネル取得または作成(セッションID); 
                  }
                  接続リスト.get(セッションID)!.add(ソケット);
             }
        };
        ソケット.onmessage = async (イベント) => {
            if (!セッションID) return;
            const データ = JSON.parse(イベント.data.toString());
            
            try {
               if (データ.type === "JOIN") {
                 const メンバー = await データベース.セッション参加(セッションID, データ.memberName);
                 ソケット.send(JSON.stringify({ type: "JOINED", member: メンバー }));
                 const メンバー一覧 = await データベース.セッションメンバー取得(セッションID);
                 const タスク一覧 = await データベース.タスク一覧取得(セッションID);
                 const バックログ = await データベース.ドキュメント取得(セッションID, "backlog");
                 const セッション情報 = await データベース.セッション取得(セッションID);
                 ソケット.send(JSON.stringify({ type: "STATE", members: メンバー一覧, tasks: タスク一覧, backlog: バックログ, session: セッション情報 }));
                 セッションへ配信(セッションID, { type: "MEMBER_JOINED", member: メンバー });
               } else if (データ.type === "ROLL") {
                   await データベース.ダイスロール追加(セッションID, データ.roll);
                   セッションへ配信(セッションID, { type: "ROLLED", roll: データ.roll });
                   const 最新セッション = await データベース.セッション取得(セッションID);
                   if (最新セッション) {
                     セッションへ配信(セッションID, { type: "SESSION_UPDATE", session: 最新セッション });
                   }
                   if (データ.roll.taskId && データ.roll.type === "progress") {
                      const タスク一覧 = await データベース.タスク一覧取得(セッションID);
                      セッションへ配信(セッションID, { type: "TASKS_UPDATE", tasks: タスク一覧 });
                   }
               } else if (データ.type === "UPDATE_DOC") {
                   await データベース.ドキュメント更新(セッションID, データ.docType, データ.content);
                   セッションへ配信(セッションID, { type: "DOC_UPDATED", docType: データ.docType, content: データ.content });
               } else if (データ.type === "ADD_TASK") {
                   const タスク = {
                    id: crypto.randomUUID(),
                    title: データ.title,
                    status: "todo",
                    progress: 0,
                    type: データ.payload?.type || "sprint", 
                    order: Date.now(), 
                    ...データ.payload
                   };
                   await データベース.タスク更新(セッションID, タスク as any);
                   セッションへ配信(セッションID, { type: "TASK_ADDED", task: タスク });
               } else if (データ.type === "UPDATE_TASK") {
                   await データベース.タスク更新(セッションID, データ.task);
                   セッションへ配信(セッションID, { type: "TASK_UPDATED", task: データ.task });
               } else if (データ.type === "DELETE_TASK") {
                   await データベース.タスク削除(セッションID, データ.taskId);
                   セッションへ配信(セッションID, { type: "TASK_DELETED", taskId: データ.taskId });
               } else if (データ.type === "ADVANCE_PHASE") {
                    const session = await データベース.セッション取得(セッションID);
                    if (session && session.phase !== "finished") {
                      let changed = false;
                      if (session.phase === "planning") {
                        session.phase = "sprint";
                        session.day = 1;
                        session.dailyDoneMembers = [];
                        changed = true;
                      } else if (session.phase === "sprint") {
                        if (session.day < 4) {
                          session.day++;
                          session.dailyDoneMembers = [];
                          changed = true;
                        } else {
                          session.phase = "review";
                          changed = true;
                        }
                      } else if (session.phase === "review") {
                        session.phase = "retrospective";
                        changed = true;
                      } else if (session.phase === "retrospective") {
                        if (session.sprintCount < 3) {
                          session.sprintCount++;
                          session.phase = "planning";
                          session.day = 0;
                          changed = true;
                        } else {
                          session.phase = "finished";
                          changed = true;
                        }
                      }
                      if (changed) {
                        await データベース.セッション状態更新(session);
                        セッションへ配信(セッションID, { type: "SESSION_UPDATE", session });
                      }
                    }
                } else if (データ.type === "CHANGE_ROLE") {
                    const updateMember = await データベース.メンバー役職更新(セッションID, データ.memberId, データ.role);
                    if (updateMember) {
                        セッションへ配信(セッションID, { type: "MEMBER_UPDATED", member: updateMember });
                    }
                } else if (データ.type === "CURSOR") {
                    セッションへ配信(セッションID, { 
                      type: "CURSOR_MOVED", 
                      memberId: データ.memberId, 
                      cursor: データ.cursor,
                      memberName: データ.memberName
                    });
                }
            } catch (e) {
                console.error(e);
            }
        };
        ソケット.onclose = () => {
            if (セッションID && 接続リスト.has(セッションID)) {
              接続リスト.get(セッションID)!.delete(ソケット);
              if (接続リスト.get(セッションID)!.size === 0) {
                 接続リスト.delete(セッションID);
                 const チャンネル = チャンネル一覧.get(セッションID);
                 if (チャンネル) {
                   チャンネル.close();
                   チャンネル一覧.delete(セッションID);
                 }
              }
            }
        };
        
        return response;
    } catch (e) {
         console.error("/ws Upgrade Error", e);
         return new Response("WebSocket Upgrade Error", { status: 500 });
    }
}
