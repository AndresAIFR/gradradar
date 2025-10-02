import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { APP_CONSTANTS } from "@/constants/app";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    const err: any = new Error(text);
    err.status = res.status;
    err.url = res.url;
    throw err;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
) {
  
  let fetchPromise: Promise<any>;
  let res: any;
  
  try {
    fetchPromise = fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include", // Critical for auth
    });
    
    
    res = await fetchPromise;
    
    
    
  } catch (fetchError) {
    throw new Error(`Network request failed: ${fetchError}`);
  }

  if (!res || res.ok === false) {
    // Surface the best server message we can
    let msg = res?.statusText ?? "Request failed";
    try {
      if (typeof res?.json === "function") {
        const j = await res.json();
        msg = j?.message || j?.error || JSON.stringify(j);
      } else if (typeof res?.text === "function") {
        const t = await res.text();
        msg = t || msg;
      }
    } catch (parseError) {
    }
    const err: any = new Error(msg);
    err.status = res?.status;
    err.url = url;
    throw err;
  }

  if (res.status === 204) return null;
  
  // Be defensive: not every successful response will have json()
  
  if (typeof res.json === "function") {
    try {
      const jsonResult = await res.json();
      return jsonResult;
    } catch (jsonError) {
    }
  } else {
  }
  
  // Fallback to text parsing
  const text = typeof res.text === "function" ? await res.text() : "";
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return text ? { message: text } : {};
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Construct API URL from query key array
    let url: string;
    if (Array.isArray(queryKey)) {
      if (queryKey[0] === 'alumni' && queryKey.length === 2) {
        // Handle alumni by ID: ['alumni', id] -> '/api/alumni/id'
        url = `/api/alumni/${queryKey[1]}`;
      } else if (queryKey[0] === 'alumni' && queryKey.length === 3 && queryKey[2] === 'interactions') {
        // Handle alumni interactions: ['alumni', id, 'interactions'] -> '/api/alumni/id/interactions'
        url = `/api/alumni/${queryKey[1]}/interactions`;
      } else if (queryKey[0] === 'alumni' && queryKey.length === 1) {
        // Handle alumni list: ['alumni'] -> '/api/alumni'
        url = '/api/alumni';
      } else if (typeof queryKey[0] === 'string' && queryKey[0].startsWith('/api/')) {
        // Legacy format: ['/api/alumni', id] -> use as-is for backwards compatibility
        url = queryKey.length > 1 ? `${queryKey[0]}/${queryKey[1]}` : queryKey[0];
      } else {
        // Fallback: treat first element as complete URL
        url = queryKey[0] as string;
      }
    } else {
      url = queryKey as unknown as string;
    }
    
    const res: any = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    if (typeof res.json === "function") {
      return res.json();
    }
    const text = typeof res.text === "function" ? await res.text() : "";
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return text || {};
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      retry(failureCount, error: any) {       // don't retry 401/429
        if (error?.status === 401 || error?.status === 429) return false;
        return failureCount < APP_CONSTANTS.QUERY.MAX_RETRIES;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      staleTime: APP_CONSTANTS.QUERY.STALE_TIME,
      gcTime: APP_CONSTANTS.QUERY.GC_TIME,
    },
    mutations: {
      retry: false,
    },
  },
});
