import JSZip from 'jszip';
import { PdfFile } from '../types';

export function sleep(ms: number): Promise<void> {
  return new Promise((res) => {
    setTimeout(res, ms);
  });
}

export async function asyncMapSerial<T, U>(arr: T[], fn: (item: T, index: number) => Promise<U>): Promise<U[]> {
  return arr.reduce(async (res, cur, index) => {
    const prev = await res;
    const value = await fn(cur, index);
    return [...prev, value];
  }, Promise.resolve([] as U[]));
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

export function getNodeIndex(child: Element): number {
  return Array.prototype.indexOf.call(child.parentNode?.children || [], child);
}

export function getName(url: string): string {
  const lastTrailing = url.lastIndexOf('/');
  const name = url.slice(lastTrailing + 1);

  if (!name.endsWith('.pdf')) {
    return `unnamed.pdf`;
  }

  return name;
}

/**
 * Match input string with provided regex and return capture groups.
 */
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

  return {
    url,
    data: await res.blob(),
    name: getName(url),
  };
}

export function createZip(pdfs: PdfFile[]): Promise<Blob> {
  const zip = new JSZip();

  pdfs.forEach((pdf) => {
    zip.file(pdf.name, pdf.data);
  });

  return zip.generateAsync({ type: 'blob' });
}

export async function withRetry<T>(fn: () => Promise<T>, retries = 3, retryOffset = 5000): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await sleep(retryOffset);
      return await withRetry(fn, retries - 1);
    }

    throw error;
  }
}
