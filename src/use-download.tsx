import { useEffect, useState } from 'react';
import { DOMMessage, DocumentsCountResponse, DownloadState } from './types';
import { getState, INITIAL_STATE, subscribe } from './lib/state';

export function useDownload() {
  const [state, setState] = useState<DownloadState>(INITIAL_STATE);
  const [count, setCount] = useState(0);
  const [tabId, setTabId] = useState(0);

  function downloadAll() {
    if (!tabId) return;
    chrome.tabs?.sendMessage(tabId, { type: 'START_DOWNLOAD' } as DOMMessage);
  }

  function retryFailed() {
    if (!tabId) return;
    chrome.tabs?.sendMessage(tabId, { type: 'RETRY_FAILED' } as DOMMessage);
  }

  // get active tab id once
  useEffect(() => {
    chrome.tabs?.query({ active: true, currentWindow: true }, (tabs) => {
      setTabId(tabs[0]?.id ?? 0);
    });
  }, []);

  // hydrate state from storage + subscribe to changes
  useEffect(() => {
    let cancelled = false;
    getState().then((current) => {
      if (!cancelled) setState(current);
    });

    const unsubscribe = subscribe((next) => {
      setState(next);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // get document count from the page (only when not actively downloading)
  useEffect(() => {
    if (!tabId) return;
    if (state.phase === 'running' || state.phase === 'zipping') return;

    chrome.tabs?.sendMessage(tabId, { type: 'GET_DOCUMENTS' } as DOMMessage, (response: DocumentsCountResponse) => {
      if (chrome.runtime.lastError) return;
      if (response && 'documents' in response) {
        setCount(response.documents);
      }
    });
  }, [tabId, state.phase]);

  return {
    state,
    count,
    downloadAll,
    retryFailed,
  };
}
