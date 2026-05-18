import type { ErrorCode } from './lib/errors';

export type DOMMessageType = 'GET_DOCUMENTS' | 'START_DOWNLOAD' | 'RETRY_FAILED';

export type DOMMessage = { type: DOMMessageType };

export type DocumentsCountResponse = { documents: number };

export type PageStatus = 'unknown' | 'wrong-host' | 'no-response' | 'ready';

export type ItemStatus = 'pending' | 'fetching-link' | 'downloading' | 'success' | 'failed';

export type DocumentItem = {
  rowIndex: number;
  displayName: string;
  fileName: string;
  status: ItemStatus;
  errorCode?: ErrorCode;
  attempts: number;
};

export type DownloadPhase = 'idle' | 'running' | 'zipping' | 'completed';

export type DownloadState = {
  phase: DownloadPhase;
  startedAt: number;
  totalCount: number;
  successCount: number;
  failedCount: number;
  items: DocumentItem[];
  finalError?: ErrorCode;
};

export type PdfFile = {
  data: Blob;
  url: string;
  name: string;
};
