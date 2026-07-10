export type Fetcher<T> = () => Promise<T>;

export const api = {
  async getJson<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, { ...init, headers: { ...(init?.headers || {}), 'content-type': 'application/json' } });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json() as Promise<T>;
  },
};


