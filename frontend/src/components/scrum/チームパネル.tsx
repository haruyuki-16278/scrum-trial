interface User {
    id: string;
    name: string;
    role: string;
    [key: string]: any;
}

interface チームパネルProps {
    メンバー一覧: User[];
    役職変更処理: (id: string, role: string) => void;
    読み取り専用: boolean;
    processingUserId?: string | null;
}

export function チームパネル({ メンバー一覧, 役職変更処理, 読み取り専用, processingUserId = null }: チームパネルProps) {
    return (
            <div className="glass" style={{ borderRadius: '1rem', padding: '1rem', flex: 1, overflowY:'auto' }}>
                <h3 style={{fontSize: '1rem'}}>Team</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {メンバー一覧.map((m) => (
                        <li key={m.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div 
                              style={{ 
                                width: '28px', height: '28px', 
                                background: m.role === 'sm' ? '#f59e0b' : m.role === 'po' ? '#ec4899' : '#3b82f6', 
                                borderRadius: '50%', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                fontSize: '0.7rem',
                                cursor: 読み取り専用 ? 'default' : 'pointer',
                                userSelect: 'none'
                              }}
                              onClick={() => {
                                if (読み取り専用 || processingUserId) return;
                                const nextVal = m.role === 'member' ? 'sm' : m.role === 'sm' ? 'po' : 'member';
                                役職変更処理(m.id, nextVal);
                              }}
                              title="Click to change role"
                            >
                                {processingUserId === m.id ? (
                                    <span className="spinner" style={{ fontSize: '0.6em' }}></span>
                                ) : (
                                    m.role === 'sm' ? 'SM' : m.role === 'po' ? 'PO' : m.name.charAt(0).toUpperCase()
                                )}
                            </div>
                            <div style={{ display:'flex', flexDirection:'column' }}>
                                <span style={{fontSize:'0.9rem'}}>{m.name}</span>
                                <span style={{fontSize:'0.7rem', color:'var(--text-dim)'}}>{m.role.toUpperCase()}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
    );
}
