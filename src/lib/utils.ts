import { DOWNLOAD_OFFSET_MS } from '../constants';

export function sleep(ms: number): Promise<void> {
  return new Promise((res) => {
    window.setTimeout(res, ms);
  });
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

export async function download(url: string): Promise<void> {
  const a = document.createElement('a');
  const name = getName(url);
  a.href = url;
  a.download = name;
  a.click();

  if (DOWNLOAD_OFFSET_MS) {
    await sleep(DOWNLOAD_OFFSET_MS);
  }
}

export function asyncMapSerial<T, U>(arr: T[], fn: (item: T, index: number) => Promise<U>): Promise<U[]> {
  return arr.reduce(async (res, cur, index) => {
    const prev = await res;

    try {
      const val = await fn(cur, index);
      return [...prev, val];
    } catch (e) {}

    return prev;
  }, Promise.resolve([] as U[]));
}
