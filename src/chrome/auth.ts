import { AUTH_EVENT } from '../constants';

export type AuthEventPayload = {
  credentials: {
    tokenId: string;
    windowId: string;
  };
};

declare global {
  interface Window {
    webcore: {
      getTokenId: () => string;
      getWindowManagement: () => {
        getCurrentWindowId: () => string;
      };
    };
  }
}

const tokenId = window.webcore.getTokenId();
const windowId = window.webcore.getWindowManagement().getCurrentWindowId();

if (!tokenId || !windowId) {
  throw Error('credentials-missing');
}

document.dispatchEvent(
  new CustomEvent<AuthEventPayload>(AUTH_EVENT, {
    detail: {
      credentials: {
        tokenId,
        windowId,
      },
    },
  }),
);
