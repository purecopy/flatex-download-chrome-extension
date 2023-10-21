import JSZip from 'jszip';
import { Credentials, getCredentials, getDocumentLink, getDocumentRows, getFormData } from '../lib/flatex';
import { getPdf } from '../lib/utils';
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
      const docRows = getDocumentRows();
      const data = getFormData();

      // TODO: Improve error handling
      // - Display failed downloads
      getCredentialsWithCache()
        .then((credentials) => Promise.all(docRows.map((row) => getDocumentLink(data, row, { credentials }))))
        .then((docLinks) => Promise.all(docLinks.map((link) => getPdf(link))))
        .then((pdfs) => {
          const zip = new JSZip();

          pdfs.forEach((pdf) => {
            zip.file(pdf.name, pdf.data);
          });

          return zip;
        })
        .then((zip) => zip.generateAsync({ type: 'blob' }))
        .then((blob) => saveAs(blob, `flatex-downloader-export.zip`))
        .then((_links) => {
          sendResponse({ success: true, count: docRows.length });
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
