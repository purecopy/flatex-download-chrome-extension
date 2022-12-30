export type DOMMessageType = 'GET_DOCUMENTS' | 'POST_DOWNLOAD';
export type DOMMessageUrl = 'https://konto.flatex.at/banking-flatex.at/documentArchiveListFormAction.do' | 'https://konto.flatex.de/banking-flatex/documentArchiveListFormAction.do';

export type DOMMessage = { type: DOMMessageType; message: DOMMessageUrl };

export type DOMMessageResponse = { documents: number } | { success: boolean; count: number; reason?: string };
