import { useState } from 'react';

// 仮の型定義 (本来は共有型定義ファイルを使うべき)
interface Task {
    id: string;
    title: string;
    status: string;
    [key: string]: any;
}

interface プロダクトバックログProps {
    タスク一覧: Task[];
    新規追加処理: (title: string) => void;
    削除処理: (id: string) => void;
    移動処理: (task: Task, dest: 'sprint') => void;
    並び替え処理: (task: Task, direction: 'up' | 'down') => void;
    読み取り専用: boolean;
    isAddingTask?: boolean;
    processingTaskId?: string | null;
}

export function プロダクトバックログ({ タスク一覧, 新規追加処理, 削除処理, 移動処理, 並び替え処理, 読み取り専用, isAddingTask = false, processingTaskId = null }: プロダクトバックログProps) {
    const [新規タイトル, 新規タイトル設定] = useState('');

    const 追加 = () => {
        if (!新規タイトル.trim()) return;
        新規追加処理(新規タイトル);
        新規タイトル設定('');
    };

    return (
        <div className="glass" style={{ borderRadius: '1rem', padding: '1rem', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <h3 style={{fontSize: '1rem', display:'flex', justifyContent:'space-between'}}>
            Product Backlog 
            <span style={{fontSize:'0.8rem', color:'var(--text-dim)'}}>{タスク一覧.length}</span>
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input 
                className="input" 
                style={{ padding: '0.4rem', fontSize:'0.9rem' }} 
                placeholder="New Requirement..." 
                value={新規タイトル}
                onChange={e => 新規タイトル設定(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !isAddingTask && 追加()}
                disabled={読み取り専用 || isAddingTask}
              />
              {!読み取り専用 && (
                <button 
                    className="btn" 
                    style={{ padding: '0.4rem 0.8rem', minWidth: '40px' }} 
                    onClick={追加}
                    disabled={isAddingTask}
                >
                    {isAddingTask ? <span className="spinner"></span> : '+'}
                </button>
              )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY:'auto', flex: 1, minHeight: 0 }}>
            {タスク一覧.map((task) => (
              <div key={task.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '0.5rem', borderLeft: '4px solid var(--text-dim)' }}>
                <div style={{ fontWeight: 600, fontSize:'0.9rem', marginBottom:'0.5rem' }}>{task.title}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {!読み取り専用 && (
                    <>
                    <div style={{ display:'flex', gap:'0.2rem' }}>
                        <button className="btn-secondary" style={{padding:'0.4rem 0.6rem', fontSize:'0.9rem'}} onClick={() => 並び替え処理(task, 'up')}>↑</button>
                        <button className="btn-secondary" style={{padding:'0.4rem 0.6rem', fontSize:'0.9rem'}} onClick={() => 並び替え処理(task, 'down')}>↓</button>
                    </div>
                    <div style={{ display:'flex', gap:'0.5rem' }}>
                        <button className="btn-secondary" style={{padding:'0.4rem 0.8rem', fontSize:'0.9rem', color:'#f87171', borderColor:'#f87171'}} onClick={() => 削除処理(task.id)}>×</button>
                        <button className="btn" style={{padding:'0.4rem 0.8rem', fontSize:'0.9rem', background:'#6366f1', minWidth: '80px'}} onClick={() => 移動処理(task, 'sprint')} disabled={!!processingTaskId}>
                            {processingTaskId === task.id ? <span className="spinner"></span> : '→ Sprint'}
                        </button>
                    </div>
                    </>
                    )}
                </div>
              </div>
            ))}
          </div>
        </div>
    );
}
