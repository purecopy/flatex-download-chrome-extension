import * as zip from '@zip.js/zip.js';
import { PdfFile } from '../types';
import { isRetryable as defaultIsRetryable } from './errors';

export function sleep(ms: number): Promise<void> {
  return new Promise((res) => {
    setTimeout(res, ms);
  });
}

export async function asyncForEachSerial<T>(arr: T[], fn: (item: T, index: number) => Promise<void>): Promise<void> {
  for (let index = 0; index < arr.length; index++) {
    await fn(arr[index], index);
  }
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}

export function getCurrentDay(): number {
  return new Date().getDate();
}

export function padDate(date: number): string {
  return String(date).padStart(2, '0');
}

export function getName(url: string): string {
  const lastTrailing = url.lastIndexOf('/');
  const name = url.slice(lastTrailing + 1);

  if (!name.endsWith('.pdf')) {
    return `unnamed.pdf`;
  }

  return name;
}

function sanitizeFilename(input: string): string {
  return input
    .replace(/[\/\\:*?"<>|\x00-\x1f]/g, '') // strip filesystem-forbidden chars
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 150);
}

export function getZipFileName(seq: number, displayName: string, url: string): string {
  const prefix = String(seq).padStart(3, '0');
  const safe = sanitizeFilename(displayName);

  if (safe) {
    return `${prefix} - ${safe}.pdf`;
  }

  const fallback = getName(url);
  return `${prefix} - ${fallback}`;
}

export function getVersionedMatch(input: string, versionedPattern: Record<string, RegExp>): string[] | null {
  const patterns = Object.values(versionedPattern);

  for (let index = 0; index < patterns.length; index++) {
    const pattern = patterns[index];
    const matches = Array.from(input.matchAll(pattern));

    if (matches.length > 0) {
      return matches.map((match) => match[1]);
    }
  }

  return null;
}

export function runExternalScript(url: string): void {
  const script = document.createElement('script');
  script.setAttribute('type', 'module');
  script.setAttribute('src', url);
  document.body.appendChild(script);
  script.remove();
}

export async function getPdf(url: string): Promise<PdfFile> {
  const res = await fetch(url);

  if (!res.ok) {
    throw res;
  }

  const contentType = (res.headers.get('content-type') ?? '').toLowerCase();
  if (!contentType.startsWith('application/pdf')) {
    // myracloud sometimes serves the challenge page with HTTP 200; treat it like a 503
    // so getPdfWithVerification kicks in and we don't zip HTML as *.pdf
    throw new Response(await res.blob(), { status: 503, headers: res.headers });
  }

  return {
    url,
    data: await res.blob(),
    name: getName(url),
  };
}

export async function createZip(pdfs: PdfFile[]): Promise<Blob> {
  const zipFileWriter = new zip.BlobWriter();
  const zipWriter = new zip.ZipWriter(zipFileWriter);

  pdfs.forEach((pdf) => {
    zipWriter.add(pdf.name, new zip.BlobReader(pdf.data));
  });

  return await zipWriter.close();
}

export type WithRetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterRatio?: number;
  isRetryable?: (err: unknown) => boolean;
};

function retryAfterMs(error: unknown): number | null {
  if (!(error instanceof Response)) return null;
  const header = error.headers.get('retry-after');
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const date = Date.parse(header);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return null;
}

export async function withRetry<T>(fn: () => Promise<T>, options: WithRetryOptions = {}): Promise<T> {
  const {
    retries = 5,
    baseDelayMs = 5000,
    maxDelayMs = 60000,
    jitterRatio = 0.25,
    isRetryable = defaultIsRetryable,
  } = options;

  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= retries || !isRetryable(error)) {
        throw error;
      }

      const exp = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      const jitter = exp * jitterRatio * (Math.random() * 2 - 1);
      const serverDelay = retryAfterMs(error) ?? 0;
      const delay = Math.max(serverDelay, exp + jitter);

      await sleep(delay);
      attempt++;
    }
  }
}

export function jitteredDelay(base: number, spread: number): number {
  return base + Math.random() * spread;
}
