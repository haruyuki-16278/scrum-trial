/// <reference lib="deno.unstable" />

const KVストア = await Deno.openKv();

export interface セッション {
  id: string;
  name: string;
  createdAt: number;
  phase: "planning" | "sprint" | "review" | "retrospective" | "finished";
  sprintCount: number; // 1-3
  day: number; // 0 (Planning/Retro), 1-4 (Sprint)
  bonusAvailable: boolean;
  dailyDoneMembers: string[]; // List of member IDs who rolled today
}

export interface メンバー {
  id: string;
  name: string;
  role: "member" | "sm" | "po";
  joinedAt: number;
}

export interface タスク {
  id: string;
  title: string;
  status: "todo" | "doing" | "done";
  assigneeId?: string;
  progress: number;
  type: "product" | "sprint";
  order: number;
}

export interface ダイスロール {
  id: string;
  memberId: string;
  memberName: string;
  value: number; // 1-6
  timestamp: number;
  taskId?: string; // If rolling for a task
  type: "progress" | "process_improvement";
  usedBonus?: boolean;
}

// キー生成ヘルパー
const キー生成 = {
  セッション: (id: string) => ["sessions", id],
  メンバー一覧: (sid: string) => ["sessions", sid, "members"],
  メンバー: (sid: string, mid: string) => ["sessions", sid, "members", mid],
  タスク一覧: (sid: string) => ["sessions", sid, "tasks"],
  タスク: (sid: string, tid: string) => ["sessions", sid, "tasks", tid],
  バックログ: (sid: string) => ["sessions", sid, "backlog"], // JSON text or structured
  KPT: (sid: string) => ["sessions", sid, "kpt"], // JSON text
  ロール一覧: (sid: string) => ["sessions", sid, "rolls"], // List of rolls
};

export async function セッション作成(name: string): Promise<セッション> {
  const id = crypto.randomUUID();
  const session: セッション = { 
    id, 
    name, 
    createdAt: Date.now(),
    phase: "planning",
    sprintCount: 1,
    day: 0,
    bonusAvailable: false,
    dailyDoneMembers: []
  };
  await KVストア.set(キー生成.セッション(id), session);
  return session;
}

export async function セッション状態更新(session: セッション) {
  await KVストア.set(キー生成.セッション(session.id), session);
}

export async function セッション取得(id: string): Promise<セッション | null> {
  const res = await KVストア.get<セッション>(キー生成.セッション(id));
  return res.value;
}

export async function セッション参加(sessionId: string, name: string): Promise<メンバー> {
  // Check for existing member with same name to support reconnection
  const existingMembers = await セッションメンバー取得(sessionId);
  const matched = existingMembers.find(m => m.name === name);
  if (matched) {
      return matched;
  }

  const id = crypto.randomUUID();
  // Simple role assignment logic: First is SM, others Members? Or just Member for now.
  // Let's default to Member.
  const member: メンバー = { id, name, role: "member", joinedAt: Date.now() };
  await KVストア.set(キー生成.メンバー(sessionId, id), member);
  return member;
}

export async function メンバー役職更新(sessionId: string, memberId: string, role: "member" | "sm" | "po"): Promise<メンバー | null> {
  const key = キー生成.メンバー(sessionId, memberId);
  const res = await KVストア.get<メンバー>(key);
  if (!res.value) return null;
  const member = { ...res.value, role };
  await KVストア.set(key, member);
  return member;
}

export async function セッションメンバー取得(sessionId: string): Promise<メンバー[]> {
  const iter = KVストア.list<メンバー>({ prefix: キー生成.メンバー一覧(sessionId) });
  const members: メンバー[] = [];
  for await (const entry of iter) {
    members.push(entry.value);
  }
  return members;
}

export async function ダイスロール追加(sessionId: string, roll: ダイスロール) {
  // Store roll (append to a list or just emit? Persistence is good for history)
  // For simplicity, we might just store last N rolls or rely on client logs.
  // Let's store individual keys by timestamp/id to list them.
  await KVストア.set([...キー生成.ロール一覧(sessionId), roll.id], roll);
  
  await KVストア.set([...キー生成.ロール一覧(sessionId), roll.id], roll);
  
  // Handle Side Effects
  const session = await セッション取得(sessionId);
  if (session) {
      let sessionChanged = false;

      // 1. Process Improvement Bonus
      if (roll.type === "process_improvement" && roll.value % 2 === 0) {
          if (!session.bonusAvailable) {
              session.bonusAvailable = true;
              sessionChanged = true;
          }
      }

      // 2. Consume Bonus
      if (roll.usedBonus && session.bonusAvailable) {
          session.bonusAvailable = false;
          sessionChanged = true;
      }

      // 3. Daily Limit (Add member to done list)
      if (roll.type === "progress") {
          if (!session.dailyDoneMembers) session.dailyDoneMembers = [];
          if (!session.dailyDoneMembers.includes(roll.memberId)) {
              session.dailyDoneMembers.push(roll.memberId);
              sessionChanged = true;
          }
      }

      if (sessionChanged) {
          await セッション状態更新(session);
      }
  }

  // If task, update task progress
  if (roll.taskId && roll.type === "progress") {
    const taskKey = キー生成.タスク(sessionId, roll.taskId);
    const taskRes = await KVストア.get<タスク>(taskKey);
    if (taskRes.value) {
      const task = taskRes.value;
      task.progress += roll.value;
      if (task.progress >= 12 && task.status !== "done") {
        task.status = "done";
      }
      await KVストア.set(taskKey, task);
    }
  }
}

export async function タスク更新(sessionId: string, task: タスク) {
  await KVストア.set(キー生成.タスク(sessionId, task.id), task);
}

export async function タスク削除(sessionId: string, taskId: string) {
  await KVストア.delete(キー生成.タスク(sessionId, taskId));
}

export async function タスク一覧取得(sessionId: string): Promise<タスク[]> {
  const iter = KVストア.list<タスク>({ prefix: キー生成.タスク一覧(sessionId) });
  const tasks: タスク[] = [];
  for await (const entry of iter) {
    tasks.push(entry.value);
  }
  return tasks;
}

export async function ドキュメント更新(sessionId: string, docType: "backlog" | "kpt" | "vision", content: any) {
  // Generic doc update
  await KVストア.set(["sessions", sessionId, "docs", docType], content);
}

export async function ドキュメント取得(sessionId: string, docType: "backlog" | "kpt" | "vision") {
  const res = await KVストア.get(["sessions", sessionId, "docs", docType]);
  return res.value;
}

// Yjs Persistence
export async function Yjs更新保存(docName: string, state: Uint8Array) {
  await KVストア.set(["yjs", docName, "state"], state);
}

export async function Yjs状態取得(docName: string): Promise<Uint8Array | null> {
  const res = await KVストア.get<Uint8Array>(["yjs", docName, "state"]);
  return res.value;
}

