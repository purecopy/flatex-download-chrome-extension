export type DOMMessageType = 'GET_DOCUMENTS' | 'POST_DOWNLOAD';

export type DOMMessage = { type: DOMMessageType };

export type DOMMessageResponse = { documents: number } | { success: boolean; count: number; reason?: string };
