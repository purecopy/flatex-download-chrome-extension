import { useEffect, useState } from 'react';
import { DOMMessage, DocumentsCountResponse, DownloadState, PageStatus } from './types';
import { getState, INITIAL_STATE, subscribe } from './lib/state';

const FLATEX_HOSTS = new Set(['konto.flatex.at', 'konto.flatex.de']);

function isFlatexUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && FLATEX_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function useDownload() {
  const [state, setState] = useState<DownloadState>(INITIAL_STATE);
  const [count, setCount] = useState(0);
  const [pageStatus, setPageStatus] = useState<PageStatus>('unknown');
  const [tabId, setTabId] = useState(0);
  const [tabUrl, setTabUrl] = useState<string | undefined>();

  function downloadAll() {
    if (!tabId) return;
    chrome.tabs?.sendMessage(tabId, { type: 'START_DOWNLOAD' } as DOMMessage);
  }

  function retryFailed() {
    if (!tabId) return;
    chrome.tabs?.sendMessage(tabId, { type: 'RETRY_FAILED' } as DOMMessage);
  }

  // get active tab once
  useEffect(() => {
    chrome.tabs?.query({ active: true, currentWindow: true }, (tabs) => {
      setTabId(tabs[0]?.id ?? 0);
      setTabUrl(tabs[0]?.url);
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

    if (!isFlatexUrl(tabUrl)) {
      setPageStatus('wrong-host');
      setCount(0);
      return;
    }

    chrome.tabs?.sendMessage(tabId, { type: 'GET_DOCUMENTS' } as DOMMessage, (response: DocumentsCountResponse | undefined) => {
      if (chrome.runtime.lastError || !response || !('documents' in response)) {
        // content script not present (page loaded before extension install, or non-archive subpage)
        setPageStatus('no-response');
        setCount(0);
        return;
      }
      setPageStatus('ready');
      setCount(response.documents);
    });
  }, [tabId, tabUrl, state.phase]);

  return {
    state,
    count,
    pageStatus,
    downloadAll,
    retryFailed,
  };
}
