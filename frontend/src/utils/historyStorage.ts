
export interface SessionHistoryItem {
  id: string;
  name: string; // Team Name
  memberName: string; // Name used in this session
  lastAccessedAt: number;
}

const HISTORY_KEY = 'SCRUM_SESSION_HISTORY';
const HISTORY_LIMIT = 10;

export const getSessionHistory = (): SessionHistoryItem[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse session history', e);
    return [];
  }
};

export const saveSessionHistory = (item: Omit<SessionHistoryItem, 'lastAccessedAt'>) => {
  try {
    const history = getSessionHistory();
    // Remove existing entry for same ID to push to top
    const filtered = history.filter(h => h.id !== item.id);
    const newItem = { ...item, lastAccessedAt: Date.now() };
    const newHistory = [newItem, ...filtered].slice(0, HISTORY_LIMIT);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  } catch (e) {
    console.warn('Failed to save session history', e);
  }
};
