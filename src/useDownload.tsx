import React from 'react';
import { DOMMessage, DOMMessageResponse } from './types';

export function useDownload() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [count, setCount] = React.useState(0);
  const [tabId, setTabId] = React.useState(0);

  async function downloadAll(): Promise<{ success: boolean; count?: number }> {
    if (!tabId) {
      throw Error('missing-tab-id');
    }

    setIsLoading(true);

    return new Promise((res, rej) => {
      chrome.tabs?.sendMessage(tabId, { type: 'POST_DOWNLOAD' } as DOMMessage, (response: DOMMessageResponse) => {
        setIsLoading(false);

        if ('success' in response && response.success === true) {
          res(response);
        } else {
          if ('reason' in response && response.reason) {
            rej(response.reason);
          }

          rej('Download failed');
        }
      });
    });
  }

  // get count
  React.useEffect(() => {
    if (!tabId) {
      return;
    }

    chrome.tabs?.sendMessage(tabId, { type: 'GET_DOCUMENTS' } as DOMMessage, (response: DOMMessageResponse) => {
      if ('documents' in response) {
        setCount(response.documents);
      }
    });
  });

  // get tab
  React.useEffect(() => {
    chrome.tabs?.query(
      {
        active: true,
        currentWindow: true,
      },
      (tabs) => {
        const tabId = tabs[0].id || 0;
        setTabId(tabId);
      },
    );
  });

  return {
    count,
    isLoading,
    downloadAll,
  };
}
