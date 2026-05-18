import { AUTH_EVENT, COMMAND_PATTERN, SELECTOR } from '../constants';
import {
  getCurrentDay,
  getCurrentMonth,
  getCurrentYear,
  padDate,
  getVersionedMatch,
  runExternalScript,
  sleep,
} from './utils';
import { DownloadError } from './errors';
import type { AuthEventPayload } from '../chrome/auth';
// @ts-expect-error
import auth from '../chrome/auth?script&module';

export type Command = {
  command: string;
  deltasToApply: unknown;
  script: string;
  size?: number;
  url: string;
};

export type Credentials = {
  tokenId: string;
  windowId: string;
};

export type DocumentRow = {
  element: Element;
  rowIndex: number;
  displayName: string;
};

function cellText(element: Element, selector: string): string {
  return (element.querySelector(selector)?.textContent ?? '').trim().replace(/\s+/g, ' ');
}

function toIsoDate(input: string): string {
  // flatex shows dates as DD.MM.YYYY — reformat so filenames sort chronologically
  const match = input.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return input;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function extractDisplayName(element: Element, rowIndex: number): string {
  // table columns: C1 account, C2 date, C3 document type, C4 description, C5 read date
  const date = toIsoDate(cellText(element, 'td.C2'));
  const type = cellText(element, 'td.C3');
  const description = cellText(element, 'td.C4');

  const parts = [date, type, description].filter((part) => part.length > 0);

  if (parts.length === 0) {
    return `Dokument ${rowIndex + 1}`;
  }

  return parts.join(' - ');
}

export function getDocumentRows(): DocumentRow[] {
  return [...document.querySelectorAll('tr[onclick^="DocumentViewer.openPopupIfRequired"]')].map((element, index) => ({
    element,
    rowIndex: index,
    displayName: extractDisplayName(element, index),
  }));
}

export function getCredentials(): Promise<Credentials> {
  return new Promise((res, rej) => {
    function handleSetup(event: CustomEvent<AuthEventPayload>) {
      res(event.detail.credentials);
    }

    (document as any).addEventListener(AUTH_EVENT, handleSetup, { once: true });

    // bail if the injected script never dispatches (e.g. webcore unavailable)
    window.setTimeout(() => {
      (document as any).removeEventListener(AUTH_EVENT, handleSetup);
      rej(new DownloadError('credentials-missing'));
    }, 10_000);

    const url = chrome.runtime.getURL(auth);
    runExternalScript(url);
  });
}

function createFormData(
  startDate: string,
  endDate: string,
  accountIndex: string,
  documentCategory: string,
  readState: string,
  retrievalPeriodSelection: string,
) {
  const formData = new FormData();
  formData.set('dateRangeComponent.startDate.text', startDate);
  formData.set('dateRangeComponent.endDate.text', endDate);
  formData.set('accountSelection.account.selecteditemindex', accountIndex);
  formData.set('documentCategory.selecteditemindex', documentCategory);
  formData.set('readState.selecteditemindex', readState);
  formData.set('dateRangeComponent.retrievalPeriodSelection.selecteditemindex', retrievalPeriodSelection);
  formData.set('storeSettings.checked', 'off');

  return formData;
}

export function getFormData() {
  const startDatePickerRef = document.querySelector<HTMLInputElement>(SELECTOR.START_DATE_PICKER);
  const endDatePickerRef = document.querySelector<HTMLInputElement>(SELECTOR.END_DATE_PICKER);
  const documentCategorySelectRef = document.querySelector<HTMLDivElement>(SELECTOR.DOCUMENT_CATEGORY_SELECT);
  const periodSelectRef = document.querySelector<HTMLDivElement>(SELECTOR.PERIOD_SELECT);
  const accountSelectRef = document.querySelector<HTMLDivElement>(SELECTOR.ACCOUNT_SELECT);
  const readStateSelectRef = document.querySelector<HTMLDivElement>(SELECTOR.READ_STATE_SELECT);

  const formData = createFormData(
    startDatePickerRef?.value ?? `01.01.${getCurrentYear() - 5}`,
    endDatePickerRef?.value ?? `${padDate(getCurrentDay())}.${padDate(getCurrentMonth())}.${getCurrentYear()}`,
    accountSelectRef?.dataset.valueSelecteditemindex ?? '0',
    documentCategorySelectRef?.dataset.valueSelecteditemindex ?? '0',
    readStateSelectRef?.dataset.valueSelecteditemindex ?? '0',
    periodSelectRef?.dataset.valueSelecteditemindex ?? '0',
  );

  return formData;
}

const WAIT_COMMAND_NAMES = new Set(['wait', 'waiting', 'pending', 'delay']);
const MAX_INLINE_WAITS = 3;
const INLINE_WAIT_MS = 2_000;

async function postDocumentRequest(formData: FormData, credentials: Credentials): Promise<Command[]> {
  const res = await fetch('', {
    method: 'POST',
    headers: {
      'x-ajax': 'true',
      'x-requested-with': 'XMLHttpRequest',
      'x-tokenid': credentials.tokenId,
      'x-windowid': credentials.windowId,
    },
    body: formData,
  });

  if (!res.ok) {
    throw res;
  }

  const data: { commands: Command[] } = await res.json();
  return data.commands ?? [];
}

export async function getDocumentLink(formData: FormData, row: DocumentRow, options: { credentials: Credentials }) {
  formData.set('documentArchiveListTable.selectedrowidx', String(row.rowIndex));

  for (let waitAttempt = 0; waitAttempt <= MAX_INLINE_WAITS; waitAttempt++) {
    const commands = await postDocumentRequest(formData, options.credentials);

    const executeCmd = commands.find((cmd) => cmd.command === 'execute');

    if (executeCmd?.script) {
      const link = getVersionedMatch(executeCmd.script, COMMAND_PATTERN)?.[0];

      if (!link) {
        throw new DownloadError('command-invalid', undefined, { commands });
      }

      return link;
    }

    // flatex sometimes returns a transient "wait" command before the document is ready
    const waitCmd = commands.find((cmd) => WAIT_COMMAND_NAMES.has(cmd.command));

    if (waitCmd && waitAttempt < MAX_INLINE_WAITS) {
      await sleep(INLINE_WAIT_MS);
      continue;
    }

    if (waitCmd) {
      throw new DownloadError('command-pending', undefined, { commands });
    }

    throw new DownloadError('command-missing', undefined, { commands });
  }

  // unreachable — loop always returns or throws
  throw new DownloadError('command-missing');
}

export async function verifyPdfLink(link: string) {
  // myracloud serves a JS proof-of-work challenge that, once solved, navigates the page to
  // /x-myracloud-proof-result/... to claim the cookie. We let an iframe run that flow and resolve
  // once it has navigated past the challenge page — the first `load` event fires on the challenge
  // itself, long before findNonce() finishes, so waiting on it alone is not enough.
  const targetPath = new URL(link, location.href).pathname;
  const verificationFrame = document.createElement('iframe');
  verificationFrame.style.setProperty('visibility', 'hidden');
  verificationFrame.style.setProperty('opacity', '0');
  verificationFrame.style.setProperty('width', '0');
  verificationFrame.style.setProperty('height', '0');

  const done = new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('challenge-timeout')), 30_000);

    verificationFrame.addEventListener('load', () => {
      let path: string | null = null;
      try {
        path = verificationFrame.contentWindow?.location.pathname ?? null;
      } catch {
        // cross-origin during a transient navigation — ignore and wait for the next load
        return;
      }

      if (path === null || path === targetPath || path.startsWith('/x-myracloud-proof-result/')) {
        // still on the challenge page or mid-proof — keep waiting for the next load
        return;
      }

      window.clearTimeout(timer);
      resolve();
    });
  });

  verificationFrame.setAttribute('src', link);
  document.body.appendChild(verificationFrame);

  try {
    await done;
    // brief grace period so the cookie write from the proof-result hop settles before we refetch
    await sleep(2000);
  } finally {
    verificationFrame.remove();
  }
}
