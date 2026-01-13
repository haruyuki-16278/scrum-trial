import { useEffect, useRef, useState, useCallback } from 'react';
import { saveSessionHistory } from '../utils/historyStorage';

type メンバー = { id: string; name: string; role: string };
type タスク = { 
    id: string; 
    title: string; 
    status: 'todo'|'doing'|'done'; 
    progress: number;
    type: 'product' | 'sprint';
    order: number;
};
type セッション = {
    id: string;
    name: string;
    phase: "planning" | "sprint" | "review" | "retrospective" | "finished";
    sprintCount: number;
    day: number;
    bonusAvailable?: boolean;
    dailyDoneMembers?: string[];
};
type OtherCursor = { memberId: string; cursor: number; memberName: string; timestamp: number };
type セッション状態 = { 
    members: メンバー[]; 
    tasks: タスク[]; 
    backlog: any; 
    session: セッション | null;
    cursors: OtherCursor[];
};

export function useスクラムセッション(sessionId: string | null, memberName: string | null) {
  const [ソケット, ソケット設定] = useState<WebSocket | null>(null);
  const [状態, 状態設定] = useState<セッション状態>({ members: [], tasks: [], backlog: {}, session: null, cursors: [] });
  const [接続済み, 接続済み設定] = useState(false);
  const [自身のメンバーID, 自身のメンバーID設定] = useState<string|null>(null);

  useEffect(() => {
    if (!sessionId || !memberName) return;

    const プロトコル = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ホスト = window.location.port === '5173' 
      ? window.location.hostname + ':8001'  // Updated port
      : window.location.host;
      
    const wsUrl = `${プロトコル}//${ホスト}/ws?sessionId=${sessionId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {

      接続済み設定(true);
      ws.send(JSON.stringify({ type: 'JOIN', memberName }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);


      if (data.type === 'JOINED') {
        自身のメンバーID設定(data.member.id);
      } else if (data.type === 'STATE') {
        if (data.session) {
             saveSessionHistory({
                 id: sessionId,
                 name: data.session.name,
                 memberName: memberName
             });
        }
        状態設定(前状態 => ({ ...前状態, members: data.members, tasks: data.tasks, backlog: data.backlog || {}, session: data.session }));
      } else if (data.type === 'SESSION_UPDATE') {
        if (data.session) {
             saveSessionHistory({
                 id: sessionId,
                 name: data.session.name,
                 memberName: memberName
             });
        }
        状態設定(前状態 => ({ ...前状態, session: data.session }));
      } else if (data.type === 'MEMBER_JOINED') {
        状態設定(前状態 => {
            if (前状態.members.some(m => m.id === data.member.id)) {
                return 前状態;
            }
            return { ...前状態, members: [...前状態.members, data.member] };
        });
      } else if (data.type === 'MEMBER_UPDATED') {
        状態設定(前状態 => ({ 
            ...前状態, 
            members: 前状態.members.map(m => m.id === data.member.id ? data.member : m) 
        }));
      } else if (data.type === 'TASKS_UPDATE') {
        状態設定(前状態 => ({ ...前状態, tasks: data.tasks }));
      } else if (data.type === 'TASK_ADDED') {
        状態設定(前状態 => {
            if (前状態.tasks.some(t => t.id === data.task.id)) {
                // Already exists (maybe update it to ensure sync?)
                return { ...前状態, tasks: 前状態.tasks.map(t => t.id === data.task.id ? data.task : t) };
            }
            return { ...前状態, tasks: [...前状態.tasks, data.task] };
        });
      } else if (data.type === 'TASK_UPDATED') {
        状態設定(前状態 => ({ 
            ...前状態, 
            tasks: 前状態.tasks.map(t => t.id === data.task.id ? data.task : t) 
        }));
      } else if (data.type === 'TASK_DELETED') {
        状態設定(前状態 => ({ 
            ...前状態, 
            tasks: 前状態.tasks.filter(t => t.id !== data.taskId) 
        }));
      } else if (data.type === 'DOC_UPDATED') {
        if (data.docType === 'backlog') {
            状態設定(前状態 => ({ ...前状態, backlog: data.content }));
        }
    } else if (data.type === 'ROLLED') {

    } else if (data.type === 'CURSOR_MOVED') {
        状態設定(前状態 => {
            // Remove old cursor for this member and add new one
            // Also clean up old cursors (> 30s?) - implementing simple filter here
            const now = Date.now();
            const filtered = 前状態.cursors.filter(c => c.memberId !== data.memberId && now - c.timestamp < 10000);
            if (data.memberId === 前状態.members.find(m => m.name === memberName)?.id) return 前状態; // Skip self if echoed
            return {
                ...前状態,
                cursors: [...filtered, { memberId: data.memberId, cursor: data.cursor, memberName: data.memberName, timestamp: now }]
            };
        });
    }
  };

    ws.onclose = () => {
        接続済み設定(false);
    };

    ソケット設定(ws);

    return () => {
      ws.close();
    };
  }, [sessionId, memberName]);

  const ダイスを振る = useCallback((rollType: 'progress'|'process_improvement', taskId?: string, usedBonus: boolean = false) => {
    if (!ソケット) return;
    
    // Logic: If usedBonus is true, we roll twice and sum?
    // Or just send one big value? 
    // Slide says "Roll 2 dice". 
    // Let's roll twice here for simulation accuracy.
    const val1 = Math.floor(Math.random() * 6) + 1;
    const val2 = usedBonus ? Math.floor(Math.random() * 6) + 1 : 0;
    const value = val1 + val2;

    const roll = {
        id: crypto.randomUUID(),
        value,
        timestamp: Date.now(),
        type: rollType,
        taskId,
        usedBonus,
        memberId: 自身のメンバーID,
        memberName
    };
    ソケット.send(JSON.stringify({ type: 'ROLL', roll }));
    return value;
  }, [ソケット, 自身のメンバーID, memberName]);

  const バックログ更新 = useCallback((content: any) => {
    if (!ソケット) return;
    ソケット.send(JSON.stringify({ type: 'UPDATE_DOC', docType: 'backlog', content }));
  }, [ソケット]);

  const タスク追加 = useCallback((title: string, type: 'product'|'sprint' = 'sprint') => {

      if(!ソケット) {
          console.error("Socket is null");
          return;
      }
      if(ソケット.readyState !== WebSocket.OPEN) {
          console.error("Socket not open", ソケット.readyState);
          return;
      }
      ソケット.send(JSON.stringify({ type: 'ADD_TASK', title, payload: { type } }));

  }, [ソケット]);

  const タスク更新 = useCallback((task: タスク) => {
      if(!ソケット) return;
      ソケット.send(JSON.stringify({ type: 'UPDATE_TASK', task }));
  }, [ソケット]);

  const タスク削除 = useCallback((taskId: string) => {
      if(!ソケット) return;
      ソケット.send(JSON.stringify({ type: 'DELETE_TASK', taskId }));
  }, [ソケット]);

  const フェーズ進行 = useCallback(() => {
      if(!ソケット) return;
      ソケット.send(JSON.stringify({ type: 'ADVANCE_PHASE' }));
  }, [ソケット]);

  const 役職変更 = useCallback((memberId: string, role: string) => {
      if(!ソケット) return;
      ソケット.send(JSON.stringify({ type: 'CHANGE_ROLE', memberId, role }));
  }, [ソケット]);

  const カーソル送信 = useCallback((memberId: string, cursor: number, memberName: string) => {
      if(!ソケット) return;
      ソケット.send(JSON.stringify({ type: 'CURSOR', memberId, cursor, memberName }));
  }, [ソケット]);

  return { 接続済み, 状態, 自身のメンバーID, ダイスを振る, バックログ更新, タスク追加, タスク更新, タスク削除, フェーズ進行, 役職変更, カーソル送信 };
}
