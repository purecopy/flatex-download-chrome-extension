import { COMMAND_PATTERN, SELECTOR, TOKEN_ID_PATTERN, WINDOW_ID_PATTERN } from '../constants';
import { getCurrentDay, getCurrentMonth, getCurrentYear, padDate, getNodeIndex, getVersionedMatch } from './utils';

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

export function getDocumentRows(): Element[] {
  return [...Array.from(document.querySelectorAll('tr[data-wt-click="dokument_download"]'))];
}

export async function getCredentials(): Promise<Credentials> {
  const res = await fetch('https://konto.flatex.at/banking-flatex.at/documentArchiveListFormAction.do');
  const html = await res.text();

  const tokenId = [...html.matchAll(TOKEN_ID_PATTERN)][0]?.[1].replaceAll('\\', '');
  const windowId = [...html.matchAll(WINDOW_ID_PATTERN)][0]?.[1]?.replaceAll('\\', '');

  if (!tokenId || !windowId) {
    throw Error('credentials-missing');
  }

  return {
    tokenId,
    windowId,
  };
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
  // refs
  const startDatePickerRef = document.querySelector<HTMLInputElement>(SELECTOR.START_DATE_PICKER);
  const endDatePickerRef = document.querySelector<HTMLInputElement>(SELECTOR.END_DATE_PICKER);
  const documentCategorySelectRef = document.querySelector<HTMLDivElement>(SELECTOR.DOCUMENT_CATEGORY_SELECT);
  const periodSelectRef = document.querySelector<HTMLDivElement>(SELECTOR.PERIOD_SELECT);
  const accountSelectRef = document.querySelector<HTMLDivElement>(SELECTOR.ACCOUNT_SELECT);
  const readStateSelectRef = document.querySelector<HTMLDivElement>(SELECTOR.READ_STATE_SELECT);

  const formData = createFormData(
    startDatePickerRef?.value ?? `01.01.${getCurrentYear() - 5}`,
    endDatePickerRef?.value ?? `${padDate(getCurrentDay())}.${padDate(getCurrentMonth())}.${getCurrentYear()}`,
    accountSelectRef?.dataset.valueSelecteditemindex ?? '0', // Primary Account
    documentCategorySelectRef?.dataset.valueSelecteditemindex ?? '0', // All Documents
    readStateSelectRef?.dataset.valueSelecteditemindex ?? '0', // All,
    periodSelectRef?.dataset.valueSelecteditemindex ?? '0', // Today
  );

  return formData;
}

export async function getDocumentLink(formData: FormData, row: Element, options: { creds: Credentials }) {
  const index = getNodeIndex(row);

  formData.set('documentArchiveListTable.selectedrowidx', String(index));

  const res = await fetch('https://konto.flatex.at/banking-flatex.at/documentArchiveListFormAction.do', {
    method: 'POST',
    headers: {
      'x-ajax': 'true',
      'x-requested-with': 'XMLHttpRequest',
      'x-tokenid': options.creds.tokenId,
      'x-windowid': options.creds.windowId,
    },
    body: formData,
  });
  const data: { commands: Command[] } = await res.json();

  const executeCmd = data.commands.find((cmd) => cmd.command === 'execute');

  // FIXME: detect & gracefully handle intermediate waiting state

  if (!executeCmd?.script) {
    throw Error('command-missing');
  }

  // first capture group contains the pdf link
  const link = getVersionedMatch(executeCmd.script, COMMAND_PATTERN)?.[0];

  if (!link) {
    throw Error('command-invalid');
  }

  return link;
}
