import manifest from './catalog-assets-manifest.json';

const assets: Record<string, string> = manifest;
const ownedHosts = new Set(['arata.co.kr', 'www.arata.co.kr', 'cdn.arata.co.kr', 'api.arata.co.kr']);

export function getBundledCatalogImage(source: string): string | undefined {
  let pathname = source.split(/[?#]/, 1)[0];
  if (/^(https?:)?\/\//i.test(source)) {
    try {
      const url = new URL(source, 'https://arata.co.kr');
      if (!ownedHosts.has(url.hostname)) return undefined;
      pathname = url.pathname;
    } catch {
      return undefined;
    }
  }
  pathname = pathname.replace(/^\/cdn-cgi\/image\/[^/]+\//, '/');
  if (pathname.startsWith('uploads/')) pathname = `/${pathname}`;
  try {
    return assets[decodeURIComponent(pathname).normalize('NFC')];
  } catch {
    return undefined;
  }
}
