/**
 * Logging utility for debugging college mapping issues
 */
export function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 8);
}

export function logWithContext(prefix: string, requestId: string, email: string, data: any) {
  console.log(`${prefix} [${requestId}] [${email}]:`, JSON.stringify(data, null, 2));
}

/**
 * Request parsing utilities to reduce boilerplate across routes
 */
export const toStr = (v: any) => (v == null ? undefined : String(v));

export const toNum = (v: any) => {
  const n = Number(v); 
  return Number.isFinite(n) ? n : undefined;
};

export function multi(q: any, key: string): string[] | undefined {
  const v = q?.[key];
  if (v == null) return undefined;
  return Array.isArray(v) ? v.map(String) : [String(v)];
}

export function multiNum(q: any, key: string): number[] | undefined {
  const arr = multi(q, key); 
  if (!arr) return undefined;
  const nums = arr.map((x) => Number(x)).filter((n) => Number.isFinite(n));
  return nums.length ? nums : undefined;
}

export function bool(q: any, key: string): boolean | undefined {
  if (!(key in q)) return undefined;
  return String(q[key]) === "true";
}

export function parsePagination(q: any) {
  const page = toNum(q?.page) ?? 1;
  const limit = toNum(q?.limit) ?? 25;
  return { page, limit };
}

export function parseSort(q: any) {
  const field = toStr(q?.sortField);
  const dir = toStr(q?.sortDirection);
  if (!field || !dir) return undefined;
  const direction = dir === "asc" ? "asc" : "desc";
  return { field, direction } as const;
}

export const idFrom = (p: any) => {
  const n = Number(p); 
  if (!Number.isInteger(n)) return undefined; 
  return n;
};