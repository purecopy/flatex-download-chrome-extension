export type DOMMessageType = 'GET_DOCUMENTS' | 'POST_DOWNLOAD';

export type DOMMessage = { type: DOMMessageType };

export type DOMMessageResponse = { documents: number } | { success: boolean; count: number; reason?: string };

export type PdfFile = {
  data: Blob;
  url: string;
  name: string;
};
