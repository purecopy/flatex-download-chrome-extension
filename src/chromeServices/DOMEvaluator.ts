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

      // TODO: Improve error handling
      // - Display failed downloads
      getCredentials(msg.message)
        .then((creds) =>
          asyncMapSerial(
            docs,
            async (doc) => {
              const link = await getDocumentLink(data, doc, { creds });
			
			              // get file date from table
              const elements: Element[] = Array.from(doc.getElementsByClassName("C2"));
              let collection = elements[0];
              let datetext = (collection as HTMLElement).innerText;
              let dateFormated = datetext.replace(/(.*)\.(.*)\.(.*)/, '$3$2$1') + '_'; //convert to YYYYMMDD

              await download(link, dateFormated);		  
              return link;
            },
            true,
          ),
        )
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
