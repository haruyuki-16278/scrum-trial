import { useState } from 'react';

interface ヘッダーProps {
    セッションID: string;
    メンバー名: string;
    接続済み: boolean;
    フェーズ表示: string;
    次のアクションラベル: string;
    フェーズ進行処理: () => void;
    ログアウト処理: () => void;
    アクション無効化: boolean;
    アクション無効化タイトル: string;
    読み取り専用: boolean;
}

export function ヘッダー({ 
    セッションID, メンバー名, 接続済み, 
    フェーズ表示, 次のアクションラベル, 
    フェーズ進行処理, ログアウト処理,
    アクション無効化, アクション無効化タイトル,
    読み取り専用
}: ヘッダーProps) {
    const [コピー済み, コピー済み設定] = useState(false);

    return (
      <div className="glass" style={{ padding: '0.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Scrum Trial</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
            ID: {セッションID}
          </span>
          <div style={{ position: 'relative' }}>
            <button 
              className="btn-secondary" 
              style={{ padding: '0.1rem 0.5rem', fontSize: '0.7rem' }}
              onClick={() => {
                  navigator.clipboard.writeText(セッションID);
                  コピー済み設定(true);
                  setTimeout(() => コピー済み設定(false), 2000);
              }}
            >
              Copy
            </button>
            {コピー済み && (
              <div style={{
                position: 'absolute',
                top: '120%',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#4ade80',
                color: '#000',
                padding: '0.2rem 0.6rem',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                zIndex: 100
              }}>
                Copied!
              </div>
            )}
          </div>
          <span style={{ color: 接続済み ? '#4ade80' : '#f87171' }}>●</span>
          
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:'rgba(0,0,0,0.3)', padding:'0.2rem 0.8rem', borderRadius:'4px', marginLeft: '0.5rem' }}>
             <span style={{ fontWeight:'bold', color:'var(--secondary)' }}>{フェーズ表示}</span>
             {!読み取り専用 && (
                 <button 
                  className="btn" 
                  style={{ fontSize: '0.9rem', padding: '0.5rem 1rem', opacity: アクション無効化 ? 0.5 : 1, pointerEvents: アクション無効化 ? 'none' : 'auto' }} 
                  onClick={フェーズ進行処理}
                  title={アクション無効化タイトル}
                 >
                    {次のアクションラベル}
                 </button>
             )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span>{メンバー名}</span>
          <button className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }} onClick={ログアウト処理}>Exit</button>
        </div>
      </div>
    );
}
