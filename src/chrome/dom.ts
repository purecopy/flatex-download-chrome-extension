import {
  Credentials,
  DocumentRow,
  getCredentials,
  getDocumentLink,
  getDocumentRows,
  getFormData,
  verifyPdfLink,
} from '../lib/flatex';
import { asyncForEachSerial, createZip, getPdf, getZipFileName, jitteredDelay, sleep, withRetry } from '../lib/utils';
import { DownloadError, toErrorCode } from '../lib/errors';
import { bumpCounter, getState, INITIAL_STATE, replaceState, setState, updateItem } from '../lib/state';
import type { DocumentItem, DOMMessage, DocumentsCountResponse, PdfFile } from '../types';
import { saveAs } from 'file-saver';

const INTER_ITEM_BASE_MS = 2500;
const INTER_ITEM_SPREAD_MS = 3000;

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

async function getPdfWithVerification(docLink: string): Promise<PdfFile> {
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

function buildItem(row: DocumentRow, seq: number): DocumentItem {
  return {
    rowIndex: row.rowIndex,
    displayName: row.displayName,
    fileName: getZipFileName(seq, row.displayName, ''),
    status: 'pending',
    attempts: 0,
  };
}

async function processItem(
  row: DocumentRow,
  item: DocumentItem,
  formData: FormData,
  credentials: Credentials,
): Promise<PdfFile | null> {
  try {
    await updateItem(row.rowIndex, { status: 'fetching-link', attempts: item.attempts + 1, errorCode: undefined });
    const link = await withRetry(() => getDocumentLink(formData, row, { credentials }));

    await updateItem(row.rowIndex, { status: 'downloading' });
    const pdf = await withRetry(() => getPdfWithVerification(link));
    pdf.name = item.fileName;

    await updateItem(row.rowIndex, { status: 'success' });
    await bumpCounter('successCount');
    return pdf;
  } catch (err) {
    const code = toErrorCode(err);
    console.error('[flatex-downloader] item failed', { rowIndex: row.rowIndex, code, err });
    await updateItem(row.rowIndex, { status: 'failed', errorCode: code });
    await bumpCounter('failedCount');
    return null;
  }
}

async function deliverZip(pdfs: PdfFile[], suffix = ''): Promise<void> {
  if (pdfs.length === 0) return;

  await setState({ phase: 'zipping' });
  const blob = await createZip(pdfs);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  saveAs(blob, `flatex-downloader-${timestamp}${suffix}.zip`);
}

async function runDownload(rowsToProcess: DocumentRow[], items: DocumentItem[]): Promise<void> {
  let credentials: Credentials;

  try {
    credentials = await getCredentialsWithCache();
  } catch (err) {
    const code = err instanceof DownloadError ? err.code : toErrorCode(err);
    console.error('[flatex-downloader] credentials failed', err);
    await setState({ phase: 'completed', finalError: code });
    return;
  }

  const formData = getFormData();
  const successes: PdfFile[] = [];

  await asyncForEachSerial(rowsToProcess, async (row, index) => {
    if (index > 0) {
      // jittered pause so flatex doesn't rate-limit us after ~40 rapid requests
      await sleep(jitteredDelay(INTER_ITEM_BASE_MS, INTER_ITEM_SPREAD_MS));
    }
    const item = items.find((i) => i.rowIndex === row.rowIndex);
    if (!item) return;
    const pdf = await processItem(row, item, formData, credentials);
    if (pdf) successes.push(pdf);
  });

  await deliverZip(successes);
  await setState({ phase: 'completed' });
}

async function handleStartDownload(): Promise<void> {
  const rows = getDocumentRows();

  if (rows.length === 0) {
    await replaceState({ ...INITIAL_STATE, phase: 'completed', finalError: 'unknown' });
    return;
  }

  const items = rows.map((row, seq) => buildItem(row, seq + 1));

  await replaceState({
    phase: 'running',
    startedAt: Date.now(),
    totalCount: items.length,
    successCount: 0,
    failedCount: 0,
    items,
  });

  await runDownload(rows, items);
}

async function handleRetryFailed(): Promise<void> {
  const current = await getState();
  const failedIndices = new Set(current.items.filter((i) => i.status === 'failed').map((i) => i.rowIndex));

  if (failedIndices.size === 0) return;

  const allRows = getDocumentRows();
  const rowsToProcess = allRows.filter((row) => failedIndices.has(row.rowIndex));

  if (rowsToProcess.length === 0) {
    // rows no longer present in the DOM (filters changed, page reloaded) — nothing to retry
    return;
  }

  const resetItems = current.items.map((item) =>
    failedIndices.has(item.rowIndex) ? { ...item, status: 'pending' as const, errorCode: undefined } : item,
  );

  await replaceState({
    ...current,
    phase: 'running',
    failedCount: current.failedCount - failedIndices.size,
    items: resetItems,
    finalError: undefined,
  });

  await runDownload(rowsToProcess, resetItems);
}

const handleMessages = (
  msg: DOMMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: DocumentsCountResponse) => void,
) => {
  switch (msg.type) {
    case 'GET_DOCUMENTS':
      sendResponse({ documents: getDocumentRows().length });
      return;
    case 'START_DOWNLOAD':
      handleStartDownload();
      return;
    case 'RETRY_FAILED':
      handleRetryFailed();
      return;
  }
};

chrome.runtime?.onMessage.addListener(handleMessages);

// chrome.storage.local persists across browser restarts; a fresh content script load (new page,
// reload, new tab) should start with a clean slate so the popup doesn't show last week's results.
replaceState({ ...INITIAL_STATE });
