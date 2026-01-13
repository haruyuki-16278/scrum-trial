import { useState, useEffect } from 'react';
import { チーム選択画面 } from './components/チーム選択画面';
import { ワークスペース画面 } from './components/ワークスペース画面';

function App() {
  const [セッションID, セッションID設定] = useState<string | null>(null);
  const [メンバー名, メンバー名設定] = useState<string | null>(null);
  const [initialSessionId, setInitialSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Check URL for session ID
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('sessionId');
    
    if (sid) {
      setInitialSessionId(sid);
      const savedName = localStorage.getItem('SCRUM_USER_NAME');
      if (savedName) {
        セッションID設定(sid);
        メンバー名設定(savedName);
      }
    }
  }, []);

  useEffect(() => {
    // Sync Session ID to URL
    const url = new URL(window.location.href);
    if (セッションID) {
      url.searchParams.set('sessionId', セッションID);
    } else {
      url.searchParams.delete('sessionId');
    }
    window.history.replaceState({}, '', url);
  }, [セッションID]);

  if (!セッションID || !メンバー名) {
    return (
      <チーム選択画面 
        参加時={(sid, name) => {
          セッションID設定(sid);
          メンバー名設定(name);
        }}
        initialSessionId={initialSessionId}
      />
    );
  }

  return (
    <ワークスペース画面 
      セッションID={セッションID} 
      メンバー名={メンバー名}
      ログアウト時={() => {
        セッションID設定(null);
        メンバー名設定(null);
      }}
    />
  );
}

export default App;
