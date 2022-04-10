import { getCredentials, getDocumentLink, getDocumentRows, getFormData } from '../lib/flatex';
import { asyncMapSerial, download } from '../lib/utils';
import { DOMMessage, DOMMessageResponse } from '../types';

const handleMessages = (
  msg: DOMMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: DOMMessageResponse) => void,
) => {
  let response: DOMMessageResponse | undefined = undefined;

  switch (msg.type) {
    case 'GET_DOCUMENTS':
      response = {
        documents: getDocumentRows().length,
      };

      break;
    case 'POST_DOWNLOAD':
      const docs = getDocumentRows();
      const data = getFormData();

      getCredentials()
        .then((creds) => {
          return asyncMapSerial(docs, async (doc) => {
            const link = await getDocumentLink(data, doc, { creds });
            await download(link);
            return link;
          });
        })
        .then((links) => {
          sendResponse({ success: true, count: links.length });
        })
        .catch((error) => {
          sendResponse({ success: false, count: 0, reason: error.message });
        });

      // keep message channel open
      return true;
  }

  if (response) {
    sendResponse(response);
  }
};

/**
 * Fired when a message is sent from either an extension process or a content script.
 */
chrome.runtime?.onMessage.addListener(handleMessages);
