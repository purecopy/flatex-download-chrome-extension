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

async function getPdfWithVerification(docLink: string) {
  try {
    return await getPdf(docLink);
  } catch (error) {
    if (error instanceof Response && error.status === 503) {
      await verifyPdfLink(docLink);
      return await getPdf(docLink);
    }

    throw error;
  }
}

function toggleLoader(show: boolean) {
  const prevLoader = document.getElementById('flatex-downloader-loader');

  // create html element
  if (show && !prevLoader) {
    const loader = document.createElement('div');
    loader.id = 'flatex-downloader-loader';
    loader.style.position = 'fixed';
    loader.style.bottom = '32px';
    loader.style.left = '32px';
    loader.style.backgroundColor = '#282c34';
    loader.style.zIndex = '99999';
    loader.style.padding = '12px 32px';
    loader.style.color = '#90caf9';

    const headline = document.createElement('div');
    headline.innerText = 'Flatex Downloader (Community Edition)';
    headline.style.fontSize = '12px';
    headline.style.marginBottom = '6px';

    const subHeadline = document.createElement('div');
    subHeadline.innerText = 'Preparing Download...';
    subHeadline.style.fontSize = '24px';
    subHeadline.style.fontWeight = 'bold';

    loader.appendChild(headline);
    loader.appendChild(subHeadline);

    document.body.appendChild(loader);
  } else if (!show && prevLoader) {
    prevLoader.remove();
  }
}

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
      toggleLoader(true);

      // TODO: Improve error handling
      // - Display failed downloads
      getCredentialsWithCache()
        .then((credentials) =>
          asyncMapSerial(rows, (row) =>
            withRetry(() => getDocumentLink(data, row, { credentials })).then((docLink) =>
              withRetry(() => getPdfWithVerification(docLink)),
            ),
          ),
        )
        .then((pdfs) => createZip(pdfs))
        .then((blob) => saveAs(blob, `flatex-downloader-export.zip`))
        .then((_links) => {
          sendResponse({ success: true, count: rows.length });
        })
        .catch((error) => {
          console.log(error);
          sendResponse({ success: false, count: 0, reason: error.message });
        })
        .finally(() => {
          toggleLoader(false);
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
