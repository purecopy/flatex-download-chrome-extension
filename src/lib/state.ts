import type { DocumentItem, DownloadState } from '../types';

const STORAGE_KEY = 'flatex-downloader-state';

export const INITIAL_STATE: DownloadState = {
  phase: 'idle',
  startedAt: 0,
  totalCount: 0,
  successCount: 0,
  failedCount: 0,
  items: [],
};

function storage(): chrome.storage.StorageArea {
  // content scripts can't access chrome.storage.session by default — use local and rely on
  // the content script clearing stale state on page load.
  return chrome.storage.local;
}

export async function getState(): Promise<DownloadState> {
  const result = await storage().get(STORAGE_KEY);
  return (result[STORAGE_KEY] as DownloadState | undefined) ?? INITIAL_STATE;
}

export async function setState(patch: Partial<DownloadState>): Promise<DownloadState> {
  const current = await getState();
  const next: DownloadState = { ...current, ...patch };
  await storage().set({ [STORAGE_KEY]: next });
  return next;
}

export async function replaceState(state: DownloadState): Promise<void> {
  await storage().set({ [STORAGE_KEY]: state });
}

export async function updateItem(rowIndex: number, patch: Partial<DocumentItem>): Promise<void> {
  const current = await getState();
  const items = current.items.map((item) => (item.rowIndex === rowIndex ? { ...item, ...patch } : item));
  await storage().set({ [STORAGE_KEY]: { ...current, items } });
}

export async function bumpCounter(key: 'successCount' | 'failedCount'): Promise<void> {
  const current = await getState();
  await storage().set({ [STORAGE_KEY]: { ...current, [key]: current[key] + 1 } });
}

export function subscribe(callback: (state: DownloadState) => void): () => void {
  const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
    if (areaName !== 'local') return;
    if (!(STORAGE_KEY in changes)) return;
    const next = (changes[STORAGE_KEY].newValue as DownloadState | undefined) ?? INITIAL_STATE;
    callback(next);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
