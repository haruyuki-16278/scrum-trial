import { useState, useEffect } from 'react';
import { getSessionHistory, SessionHistoryItem } from '../utils/historyStorage';

interface プロップス {
  参加時: (sessionId: string, memberName: string) => void;
  initialSessionId?: string | null;
}

export function チーム選択画面({ 参加時, initialSessionId }: プロップス) {
  const [名前, 名前設定] = useState('');
  const [セッションID, セッションID設定] = useState(initialSessionId || '');
  const [モード, モード設定] = useState<'join' | 'create' | 'history'>(initialSessionId ? 'join' : 'create');
  const [ローディング中, ローディング中設定] = useState(false);
  const [履歴, 履歴設定] = useState<SessionHistoryItem[]>([]);
  
  useEffect(() => {
    const h = getSessionHistory();
    履歴設定(h);
  }, []);

  useEffect(() => {
    const savedName = localStorage.getItem('SCRUM_USER_NAME');
    if (savedName) 名前設定(savedName);
  }, []);

  const 作成処理 = async () => {
    if (!名前.trim()) return alert("Please enter your name");
    
    ローディング中設定(true);
    try {
      // POST to /api/sessions
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${名前}'s Team` })
      });
      const data = await res.json();
      localStorage.setItem('SCRUM_USER_NAME', 名前);
      localStorage.setItem('SCRUM_LAST_SESSION', data.id);
      参加時(data.id, 名前);
    } catch (e) {
      console.error(e);
      alert("Failed to create session");
    } finally {
      ローディング中設定(false);
    }
  };

  const 参加処理 = () => {
    if (!名前.trim() || !セッションID.trim()) return alert("Please enter name and session ID");
    localStorage.setItem('SCRUM_USER_NAME', 名前);
    localStorage.setItem('SCRUM_LAST_SESSION', セッションID);
    参加時(セッションID, 名前);
  };

  const handleHistoryJoin = (item: SessionHistoryItem) => {
      参加時(item.id, item.memberName);
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '2rem' }}>
      <div className="glass" style={{ padding: '2.5rem', borderRadius: '1.5rem', width: '100%', maxWidth: '400px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '2rem', background: 'linear-gradient(to right, #6366f1, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Scrum Trial
        </h1>
        
        {履歴.length > 0 && モード !== 'history' && (
             <div style={{ marginBottom: '1.5rem', textAlign:'center' }}>
                <button 
                    className="btn-secondary" 
                    style={{ width: '100%', borderColor: 'var(--primary)', color: 'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', padding:'0.8rem' }} 
                    onClick={() => モード設定('history')}
                >
                    <span style={{fontWeight:'bold'}}>📂 Open Recent Session</span>
                </button>
                <div style={{ margin: '1rem 0', display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                    OR
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                </div>
            </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button 
            className={`btn ${モード === 'create' ? '' : 'btn-secondary'}`} 
            style={{ flex: 1 }}
            onClick={() => モード設定('create')}
          >
            Create Team
          </button>
          <button 
            className={`btn ${モード === 'join' ? '' : 'btn-secondary'}`}
            style={{ flex: 1 }}
            onClick={() => モード設定('join')}
          >
            Join Team
          </button>
        </div>

        {モード === 'history' ? (
             <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
                {履歴.map(item => (
                    <div key={item.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap:'0.2rem', overflow: 'hidden' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{item.name}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>as {item.memberName}</span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>{item.id.slice(0,8)}...</span>
                        </div>
                        <button className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleHistoryJoin(item)}>
                            Open
                        </button>
                    </div>
                ))}
                <button className="btn-secondary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => モード設定('create')}>
                    ← Back
                </button>
             </div>
        ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-dim)' }}>Your Name</label>
            <input 
              className="input" 
              value={名前} 
              onChange={e => 名前設定(e.target.value)} 
              placeholder="Enter your name"
            />
          </div>

          {モード === 'join' && (
            <div className="animate-fade-in">
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-dim)' }}>Session ID</label>
              <input 
                className="input" 
                value={セッションID} 
                onChange={e => セッションID設定(e.target.value)}  
                placeholder="Paste Session ID"
              />
            </div>
          )}

          <button 
            className="btn" 
            style={{ marginTop: '1rem', width: '100%' }}
            onClick={モード === 'create' ? 作成処理 : 参加処理}
            disabled={ローディング中}
          >
            {ローディング中 ? 'Creating...' : (モード === 'create' ? 'Start New Session' : 'Join Session')}
          </button>
        </div>
        )}
      </div>
    </div>
  );
}
