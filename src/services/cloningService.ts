export interface ClonedItem {
  id: string;
  originalTitle: string;
  improvedTitle: string;
  timestamp: number;
  type: 'wan' | 'gemini' | 'unknown';
}

const STORAGE_KEY = 'yt_cloner_history';

export function getClonedHistory(): ClonedItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addToClonedHistory(item: Omit<ClonedItem, 'timestamp'>) {
  const history = getClonedHistory();
  // Avoid exact duplicates
  if (history.some(h => h.originalTitle === item.originalTitle && h.type === item.type)) {
    return;
  }
  const newItem = { ...item, timestamp: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...history, newItem]));
}

export function isCloned(originalTitle: string): { wan: boolean; gemini: boolean } {
  const history = getClonedHistory();
  return {
    wan: history.some(h => h.originalTitle === originalTitle && h.type === 'wan'),
    gemini: history.some(h => h.originalTitle === originalTitle && h.type === 'gemini'),
  };
}
