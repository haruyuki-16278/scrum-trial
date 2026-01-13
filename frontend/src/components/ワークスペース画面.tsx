import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useスクラムセッション } from '../hooks/useスクラムセッション';
import { ヘッダー } from './scrum/ヘッダー';
import { プロダクトバックログ } from './scrum/プロダクトバックログ';
import { スプリントバックログ } from './scrum/スプリントバックログ';
import { 共有メモ } from './scrum/共有メモ';
import { チームパネル } from './scrum/チームパネル';
import { ダイスパネル } from './scrum/ダイスパネル';

interface Props {
  セッションID: string;
  メンバー名: string;
  ログアウト時: () => void;
}

export function ワークスペース画面({ セッションID, メンバー名, ログアウト時 }: Props) {
  const { 接続済み, 状態, 自身のメンバーID, ダイスを振る, タスク追加, タスク更新, タスク削除, フェーズ進行, 役職変更 } = useスクラムセッション(セッションID, メンバー名);
  const [ダイス結果, ダイス結果設定] = useState<number | null>(null);
  const [ロール中, ロール中設定] = useState(false);
  
  const { session } = 状態;
  const 読み取り専用 = session?.phase === 'finished';

  const 自身の役職 = 状態.members.find((m: any) => m.id === 自身のメンバーID)?.role;
  const 作業済みフラグ = session?.phase === 'sprint' && session?.dailyDoneMembers?.includes(自身のメンバーID || '');
  
  // Derived lists
  const プロダクトバックログタスク = 状態.tasks.filter((t: any) => t.status === 'todo');
  const スプリントバックログタスク = 状態.tasks.filter((t: any) => t.status !== 'todo').sort((a: any, b: any) => {
    if (a.status === 'done' && b.status !== 'done') return 1;
    if (a.status !== 'done' && b.status === 'done') return -1;
    return a.updatedAt - b.updatedAt;
  });

  // Handlers
  const PBL追加処理 = (title: string) => {
    タスク追加(title);
  };

  const ロール処理 = async (taskId?: string, useBonus = false) => {
    if (ロール中) return;
    ロール中設定(true);
    
    // Animate
    let counter = 0;
    const interval = setInterval(() => {
        ダイス結果設定(Math.floor(Math.random() * 6) + 1);
        counter++;
        if (counter > 10) {
            clearInterval(interval);
        }
    }, 50);

    const type = taskId ? 'progress' : 'process_improvement';
    const result = await ダイスを振る(type, taskId, useBonus);
    
    clearInterval(interval);
    ロール中設定(false);
    
    const rollValue = (typeof result === 'object' && result !== null && 'total' in result) ? (result as any).total : result;
    ダイス結果設定(rollValue || null);
    
    if (rollValue && rollValue >= 10) {
       confetti({
         particleCount: 100,
         spread: 70,
         origin: { y: 0.6 }
       });
    }
  };

  const タスク移動 = (task: any, destination: 'product' | 'sprint') => {
      if (destination === 'sprint') {
          タスク更新({ ...task, status: 'doing', assigneeId: null });
      } else {
          タスク更新({ ...task, status: 'todo', assigneeId: null, progress: 0 });
      }
  };

    // Phase Change Effect
  useEffect(() => {
    if (session?.phase === 'finished') {
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function() {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) {
                return clearInterval(interval);
            }
            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
    }
  }, [session?.phase]);

  const フェーズ表示 = (() => {
      if (!session) return 'Loading...';
      if (session.phase === 'planning') return `Sprint ${session.sprintCount} : Planning`;
      if (session.phase === 'sprint') return `Sprint ${session.sprintCount} : Day ${session.day}`;
      if (session.phase === 'review') return `Sprint ${session.sprintCount} : Review`;
      if (session.phase === 'retrospective') return `Sprint ${session.sprintCount} : Retrospective`;
      if (session.phase === 'finished') return `Game Finished`;
      return 'Unknown';
  })();

  const 次のアクションラベル = (() => {
    if (!session) return '';
    if (session.phase === 'planning') return 'Start Sprint ▶';
    if (session.phase === 'sprint') return session.day < 4 ? 'Next Day ▶' : 'To Review ▶';
    if (session.phase === 'review') return 'To Retrospective ▶';
    if (session.phase === 'retrospective') return session.sprintCount < 3 ? 'Next Sprint ▶' : 'Finish Game 🏁';
    return '';
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <ヘッダー 
        セッションID={セッションID}
        メンバー名={メンバー名}
        接続済み={接続済み}
        フェーズ表示={フェーズ表示}
        次のアクションラベル={次のアクションラベル}
        フェーズ進行処理={フェーズ進行}
        ログアウト処理={ログアウト時}
        アクション無効化={session?.phase === 'planning' && スプリントバックログタスク.length === 0}
        アクション無効化タイトル={(session?.phase === 'planning' && スプリントバックログタスク.length === 0) ? "Add tasks to Sprint Backlog first" : ""}
        読み取り専用={読み取り専用}
      />

      {/* Main Content: 4 Columns */}
      <div style={{ flex: 1, padding: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 250px', gap: '1rem', overflow: 'hidden' }}>
         <プロダクトバックログ 
            タスク一覧={プロダクトバックログタスク}
            新規追加処理={PBL追加処理}
            削除処理={タスク削除}
            移動処理={タスク移動}
            並び替え処理={() => {}} // Not implemented
            読み取り専用={読み取り専用}
         />
         
         <スプリントバックログ 
            タスク一覧={スプリントバックログタスク}
            メンバー一覧={状態.members}
            自身のメンバーID={自身のメンバーID}
            タスク更新処理={タスク更新}
            移動処理={タスク移動}
            ロール処理={ロール処理}
            読み取り専用={読み取り専用}
            作業済みフラグ={作業済みフラグ}
            ロール中フラグ={ロール中}
            ボーナス有効={session?.bonusAvailable}
         />

         <共有メモ 
            セッションID={セッションID}
            メンバー名={メンバー名}
            自身のメンバーID={自身のメンバーID}
            読み取り専用={読み取り専用}
         />

         <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <ダイスパネル 
                ダイス結果={ダイス結果}
                ロール中={ロール中}
                フェーズ={session?.phase}
                自身の役職={自身の役職}
                作業済みフラグ={作業済みフラグ}
                ボーナス有効={session?.bonusAvailable}
                改善ロール処理={() => ロール処理()}
            />
            <チームパネル 
                メンバー一覧={状態.members}
                役職変更処理={役職変更}
                読み取り専用={読み取り専用}
            />
         </div>
      </div>
    </div>
  );
}
