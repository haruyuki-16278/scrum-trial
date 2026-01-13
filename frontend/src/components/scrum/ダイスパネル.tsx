interface ダイスパネルProps {
    ダイス結果: number | null;
    ロール中: boolean;
    フェーズ: string;
    自身の役職: string;
    作業済みフラグ: boolean;
    ボーナス有効: boolean;
    改善ロール処理: () => void;
}

export function ダイスパネル({ ダイス結果, ロール中, フェーズ, 自身の役職, 作業済みフラグ, ボーナス有効, 改善ロール処理 }: ダイスパネルProps) {
    return (
            <div className="glass" style={{ borderRadius: '1rem', padding: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: (フェーズ === 'sprint' || (フェーズ === 'retrospective' && 自身の役職 === 'sm')) ? 1 : 0.5, pointerEvents: (フェーズ === 'sprint' || (フェーズ === 'retrospective' && 自身の役職 === 'sm')) ? 'auto' : 'none' }}>
                <h3 style={{fontSize: '1rem', margin:0}}>Dice</h3>
                
                {/* Dice Result Display */}
                <div style={{ 
                    width: '80px', height: '80px', 
                    background: ダイス結果 ? (ダイス結果 >= 12 ? '#4ade80' : 'var(--primary)') : 'rgba(255,255,255,0.1)', 
                    borderRadius: '1rem', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '2.5rem', fontWeight: 'bold',
                    boxShadow: ダイス結果 ? 'var(--shadow-glow)' : 'none',
                    margin: '1rem 0',
                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    transform: ロール中 ? 'rotate(360deg)' : 'none'
                }}>
                    {ダイス結果 ?? '?'}
                </div>

                {/* Controls based on Phase */}
                {フェーズ === 'sprint' ? (
                  <div style={{ width: '100%', display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                    
                    {作業済みフラグ ? (
                       <div style={{ padding: '0.5rem', color: '#f87171', fontSize:'0.9rem', border: '1px solid #f87171', borderRadius:'0.5rem' }}>
                           ✅ Work Done Today
                       </div>
                    ) : (
                        <div style={{ color:'var(--text-dim)', fontSize:'0.8rem' }}>
                            Roll from your Task
                        </div>
                    )}
                    
                  </div>
                ) : フェーズ === 'retrospective' ? (
                   自身の役職 === 'sm' ? (
                       <div style={{ width: '100%' }}>
                           <button className="btn" style={{ width: '100%', fontSize:'0.9rem' }} onClick={改善ロール処理}>
                               Impv. Roll
                           </button>
                           <div style={{fontSize:'0.7rem', color:'var(--text-dim)', marginTop:'0.5rem'}}>
                               Even = Next Sprint Bonus
                           </div>
                       </div>
                   ) : (
                       <div style={{ padding: '1rem 0', color: 'var(--text-dim)', fontSize:'0.8rem' }}>
                         SM rolls for<br/>Improvement
                       </div>
                   )
                ) : (
                  <div style={{ padding: '2rem 0', color: 'var(--text-dim)', fontSize:'0.9rem' }}>
                    Dice Locked
                  </div>
                )}
                
                {/* Bonus Indicator */}
                {ボーナス有効 && (
                    <div style={{ marginTop:'1rem', color:'#fbbf24', fontSize:'0.8rem', fontWeight:'bold', display:'flex', alignItems:'center', gap:'0.2rem' }}>
                        <span>⚡ Bonus Active</span>
                    </div>
                )}
            </div>
    );
}
