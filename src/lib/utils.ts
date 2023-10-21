export function sleep(ms: number): Promise<void> {
  return new Promise((res) => {
    setTimeout(res, ms);
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

export async function getPdf(url: string): Promise<{
  data: Blob;
  url: string;
  name: string;
}> {
  const res = await fetch(url);

  return {
    url,
    data: await res.blob(),
    name: getName(url),
  };
}
