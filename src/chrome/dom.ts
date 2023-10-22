import {
  Credentials,
  getCredentials,
  getDocumentLink,
  getDocumentRows,
  getFormData,
  verifyPdfLink,
} from '../lib/flatex';
import { asyncMapSerial, createZip, getPdf, withRetry } from '../lib/utils';
import { DOMMessage, DOMMessageResponse } from '../types';
import { saveAs } from 'file-saver';

function getCredentialsWithCacheFn() {
  let credentials: Credentials | null = null;

  return async () => {
    if (credentials) {
      return credentials;
    }

    credentials = await getCredentials();
    return credentials;
  };
}

const getCredentialsWithCache = getCredentialsWithCacheFn();

const handleMessages = (
  msg: DOMMessage,
  _sender: chrome.runtime.MessageSender,
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
      const rows = getDocumentRows();
      const data = getFormData();

      // TODO: Improve error handling
      // - Display failed downloads
      getCredentialsWithCache()
        .then((credentials) =>
          asyncMapSerial(rows, (row) => withRetry(() => getDocumentLink(data, row, { credentials }))),
        )
        .then((docLinks) =>
          asyncMapSerial(docLinks, async (docLink) => {
            try {
              return await getPdf(docLink);
            } catch (error) {
              if (error instanceof Response && error.status === 503) {
                await verifyPdfLink(docLink);
                return await getPdf(docLink);
              }

              throw error;
            }
          }),
        )
        .then((pdfs) => createZip(pdfs))
        .then((blob) => saveAs(blob, `flatex-downloader-export.zip`))
        .then((_links) => {
          sendResponse({ success: true, count: rows.length });
        })
        .catch((error) => {
          console.log(error);
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
