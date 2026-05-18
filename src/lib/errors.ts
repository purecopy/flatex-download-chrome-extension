export type ErrorCode =
  | 'command-missing'
  | 'command-invalid'
  | 'command-pending'
  | 'credentials-missing'
  | 'http-401'
  | 'http-403'
  | 'http-503'
  | 'http-error'
  | 'network'
  | 'unknown';

export class DownloadError extends Error {
  code: ErrorCode;
  context?: unknown;

  constructor(code: ErrorCode, message?: string, context?: unknown) {
    super(message ?? code);
    this.name = 'DownloadError';
    this.code = code;
    this.context = context;
  }
}

const MESSAGES: Record<ErrorCode, string> = {
  'command-missing': 'flatex hat für diese Zeile kein Dokument zurückgegeben – die Sitzung ist möglicherweise abgelaufen.',
  'command-invalid': 'Der PDF-Link konnte aus der flatex-Antwort nicht gelesen werden (die flatex-API hat sich möglicherweise geändert).',
  'command-pending': 'flatex hat dieses Dokument zu lange im Wartezustand belassen.',
  'credentials-missing': 'Deine flatex-Sitzung konnte nicht gelesen werden. Lade die Seite neu und versuche es erneut.',
  'http-401': 'Deine flatex-Sitzung ist abgelaufen – bitte melde dich erneut an.',
  'http-403': 'flatex hat den Zugriff auf dieses Dokument verweigert.',
  'http-503': 'flatex hat den Download begrenzt – versuche es in einer Minute erneut.',
  'http-error': 'flatex hat für dieses Dokument einen unerwarteten Fehler zurückgegeben.',
  network: 'Netzwerkfehler – flatex konnte nicht erreicht werden.',
  unknown: 'Beim Herunterladen dieses Dokuments ist etwas schiefgelaufen.',
};

export function errorMessage(code: ErrorCode): string {
  return MESSAGES[code] ?? MESSAGES.unknown;
}

export function toErrorCode(err: unknown): ErrorCode {
  if (err instanceof DownloadError) {
    return err.code;
  }

  if (err instanceof Response) {
    if (err.status === 401) return 'http-401';
    if (err.status === 403) return 'http-403';
    if (err.status === 503) return 'http-503';
    return 'http-error';
  }

  if (err instanceof TypeError) {
    // fetch() throws TypeError on network failure
    return 'network';
  }

  if (err instanceof Error) {
    const legacy = err.message as ErrorCode;
    if (legacy in MESSAGES) {
      return legacy;
    }
  }

  return 'unknown';
}

export function isRetryable(err: unknown): boolean {
  const code = toErrorCode(err);
  switch (code) {
    case 'command-invalid':
    case 'credentials-missing':
    case 'http-401':
    case 'http-403':
      return false;
    default:
      return true;
  }
}
