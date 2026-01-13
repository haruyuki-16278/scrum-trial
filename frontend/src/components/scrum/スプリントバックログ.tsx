import confetti from 'canvas-confetti';

// 仮型定義
interface Task {
    id: string;
    title: string;
    status: string;
    progress: number;
    assigneeId?: string | null;
    [key: string]: any;
}

interface User {
    id: string;
    name: string;
    [key: string]: any;
}

interface スプリントバックログProps {
    タスク一覧: Task[];
    メンバー一覧: User[];
    自身のメンバーID: string | null;
    タスク更新処理: (task: Task) => void;
    移動処理: (task: Task, dest: 'product') => void;
    ロール処理: (taskId: string, useBonus: boolean) => void;
    読み取り専用: boolean;
    作業済みフラグ: boolean;
    ロール中フラグ: boolean;
    ボーナス有効: boolean;
}

export function スプリントバックログ({ 
    タスク一覧, メンバー一覧, 自身のメンバーID, 
    タスク更新処理, 移動処理, ロール処理, 
    読み取り専用, 作業済みフラグ, ロール中フラグ, ボーナス有効 
}: スプリントバックログProps) {

  const 完了切替 = (task: Task) => {
      const next = task.status === 'done' ? 'doing' : 'done';
      タスク更新処理({ ...task, status: next });
      if (next === 'done') {
          confetti({
            particleCount: 30,
            spread: 50,
            origin: { y: 0.6 }
          });
      }
  };

  return (
        <div className="glass" style={{ borderRadius: '1rem', padding: '1rem', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <h3 style={{fontSize: '1rem', display:'flex', justifyContent:'space-between'}}>
            Sprint Backlog
            <span style={{fontSize:'0.8rem', color:'var(--text-dim)'}}>{タスク一覧.length}</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY:'auto', flex: 1, minHeight: 0 }}>
            {タスク一覧.map((task) => (
              <div key={task.id} style={{ 
                background: 'rgba(255,255,255,0.05)', 
                padding: '0.8rem', 
                borderRadius: '0.5rem',
                borderLeft: `4px solid ${task.status === 'done' ? '#4ade80' : task.progress > 0 ? '#6366f1' : '#ec4899'}`
              }}>
                <div style={{ fontWeight: 600, fontSize:'0.9rem', marginBottom:'0.5rem', textDecoration: task.status === 'done' ? 'line-through' : 'none', color: task.status === 'done' ? 'var(--text-dim)' : 'inherit' }}>
                    {task.title}
                </div>
                
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between', marginBottom:'0.5rem' }}>
                  <span>Progress: {task.progress} / 12</span>
                  <span>{task.assigneeId ? (メンバー一覧.find(m => m.id === task.assigneeId)?.name || 'Unknown') : 'Unassigned'}</span>
                </div>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginBottom: '0.8rem', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (task.progress / 12) * 100)}%`, background: task.status === 'done' ? '#4ade80' : '#6366f1', transition: 'width 0.3s ease' }} />
                </div>

                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        {!読み取り専用 && (
                            <>
                            <button className="btn-secondary" style={{padding:'0.4rem 0.8rem', fontSize:'0.8rem'}} onClick={() => 移動処理(task, 'product')}>← PBL</button>

                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                {/* Task Action: Pick or Roll */}
                                {!task.assigneeId ? (
                                    <button className="btn" style={{padding:'0.4rem 0.8rem', fontSize:'0.9rem', background:'var(--secondary)'}} onClick={() => タスク更新処理({ ...task, assigneeId: 自身のメンバーID })}>
                                        ✋ Pick
                                    </button>
                                ) : (
                                    task.assigneeId === 自身のメンバーID && task.status !== 'done' && (
                                        <div style={{ display:'flex', gap:'0.5rem' }}>
                                            <button 
                                            className="btn" 
                                            style={{padding:'0.4rem 0.8rem', fontSize:'1.2rem', opacity: 作業済みフラグ ? 0.5 : 1, cursor: 作業済みフラグ ? 'not-allowed' : 'pointer'}} 
                                            onClick={() => !作業済みフラグ && ロール処理(task.id, false)}
                                            disabled={作業済みフラグ || ロール中フラグ}
                                            title={作業済みフラグ ? "Already rolled today" : ""}
                                            >
                                            🎲
                                            </button>
                                            {ボーナス有効 && (
                                                <button 
                                                className="btn" 
                                                style={{padding:'0.4rem 0.8rem', fontSize:'1rem', background:'var(--secondary)', opacity: 作業済みフラグ ? 0.5 : 1, cursor: 作業済みフラグ ? 'not-allowed' : 'pointer'}} 
                                                onClick={() => !作業済みフラグ && ロール処理(task.id, true)}
                                                disabled={作業済みフラグ || ロール中フラグ}
                                                >
                                                🎲x2
                                                </button>
                                            )}
                                        </div>
                                    )
                                )}

                                <button className="btn-secondary" style={{padding:'0.4rem 0.8rem', fontSize:'0.9rem', color: task.status==='done'?'#fbbf24':'#4ade80', borderColor:'currentColor'}} onClick={() => 完了切替(task)}>
                                    {task.status==='done' ? 'Undo' : 'Done'}
                                </button>
                            </div>
                            </>
                        )}
                     </div>
              </div>
            ))}
            {タスク一覧.length === 0 && <div style={{ color: 'var(--text-dim)', textAlign: 'center', fontSize:'0.9rem' }}>No active tasks</div>}
          </div>
        </div>
  );
}
