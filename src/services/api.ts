export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === 'AbortError') ||
    (typeof err === 'object' && err !== null && 'name' in err && (err as { name?: string }).name === 'AbortError')
  );
}

export interface RawApiResponseInput {
  path: string;
  status: number;
  ok: boolean;
  contentType: string;
  rawText: string;
}

export function parseApiResponsePayload<T>(input: RawApiResponseInput): T {
  const { path, status, ok, contentType, rawText } = input;
  const normalizedType = (contentType || '').toLowerCase();
  const trimmed = (rawText || '').trim();
  const isApiPath = path === '/api' || path.startsWith('/api/');
  const looksLikeJsonContentType =
    normalizedType.includes('application/json') || normalizedType.includes('+json');
  const looksLikeHtml =
    normalizedType.includes('text/html') ||
    trimmed.startsWith('<!doctype') ||
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html');

  // If the server returned HTML or non-JSON content for an /api/* endpoint
  if (!looksLikeJsonContentType || looksLikeHtml) {
    // Some reverse proxies return JSON without Content-Type only when status is JSON-shaped
    if (!looksLikeHtml && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
      try {
        const parsedFallback = JSON.parse(trimmed) as {
          ok?: boolean;
          code?: string;
          error?: string;
          message?: string;
          details?: unknown;
        };
        if (!ok || parsedFallback.ok === false) {
          throw new ApiError(
            status,
            parsedFallback.code || 'API_ERROR',
            parsedFallback.error || parsedFallback.message || `Request failed (${status}).`,
            parsedFallback.details,
          );
        }
        return parsedFallback as unknown as T;
      } catch (err) {
        if (err instanceof ApiError) throw err;
      }
    }

    if (!ok) {
      const hint =
        status === 502 || status === 503 || status === 504
          ? 'Backend catalog service is temporarily unreachable or starting up.'
          : looksLikeHtml
            ? `API endpoint returned an HTML error page (HTTP ${status}).`
            : `Request failed with status ${status}.`;
      throw new ApiError(status, 'HTTP_ERROR', hint);
    }

    if (isApiPath) {
      throw new ApiError(
        502,
        'INVALID_API_RESPONSE',
        looksLikeHtml
          ? 'Backend API returned an HTML page instead of JSON. Ensure the Express API server is running and handling /api/* routes.'
          : 'Server returned an unexpected non-JSON response.',
      );
    }

    return rawText as unknown as T;
  }

  if (!trimmed) {
    if (!ok) {
      throw new ApiError(status, 'EMPTY_ERROR_RESPONSE', `Server returned an empty error response (HTTP ${status}).`);
    }
    if (isApiPath) {
      throw new ApiError(502, 'EMPTY_API_RESPONSE', 'Server returned an empty JSON response.');
    }
    return {} as T;
  }

  let data: {
    ok?: boolean;
    code?: string;
    error?: string;
    message?: string;
    details?: unknown;
  };

  try {
    data = JSON.parse(trimmed) as typeof data;
  } catch {
    throw new ApiError(
      status >= 400 ? status : 502,
      'MALFORMED_JSON_RESPONSE',
      'Server returned malformed JSON data.',
    );
  }

  if (!ok || data.ok === false) {
    throw new ApiError(
      status,
      data.code || 'API_ERROR',
      data.error || data.message || `Request failed (${status})`,
      data.details,
    );
  }

  return data as unknown as T;
}

const AUTH_TOKEN_STORAGE_KEY = 'novara_auth_token';
let inMemoryAuthToken: string | null = null;
let unauthorizedHandler: ((code: string) => void) | null = null;

export function getAuthToken(): string | null {
  if (inMemoryAuthToken) return inMemoryAuthToken;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      if (stored) {
        inMemoryAuthToken = stored;
        return stored;
      }
    }
  } catch {
    // Ignore storage access errors in restricted environments
  }
  return null;
}

export function setAuthToken(token: string | null): void {
  inMemoryAuthToken = token || null;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (token) {
        window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
      } else {
        window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      }
    }
  } catch {
    // Ignore storage access errors in restricted environments
  }
}

export function clearAuthToken(): void {
  setAuthToken(null);
}

export function registerUnauthorizedHandler(handler: ((code: string) => void) | null): void {
  unauthorizedHandler = handler;
}

function buildAuthHeaders(optionsHeaders?: HeadersInit): Record<string, string> {
  const headers: Record<string, string> = {};
  if (optionsHeaders instanceof Headers) {
    optionsHeaders.forEach((value, key) => {
      headers[key] = value;
    });
  } else if (Array.isArray(optionsHeaders)) {
    for (const [key, value] of optionsHeaders) {
      headers[key] = value;
    }
  } else if (optionsHeaders && typeof optionsHeaders === 'object') {
    Object.assign(headers, optionsHeaders);
  }

  const hasAuthHeader = Object.keys(headers).some((k) => k.toLowerCase() === 'authorization');
  if (!hasAuthHeader) {
    const token = getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  return headers;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...buildAuthHeaders(options.headers),
  };

  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      credentials: 'include',
      cache: options.cache ?? 'no-store',
      headers,
    });
  } catch (err) {
    if (isAbortError(err)) {
      throw err;
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'Unable to reach NOVARA servers. Please check your network connection.');
  }

  const rawText = await response.text();
  const contentType = response.headers.get('content-type') || '';

  try {
    return parseApiResponsePayload<T>({
      path,
      status: response.status,
      ok: response.ok,
      contentType,
      rawText,
    });
  } catch (err) {
    if (
      err instanceof ApiError &&
      err.status === 401 &&
      (err.code === 'UNAUTHENTICATED' || err.code === 'INVALID_TOKEN')
    ) {
      clearAuthToken();
      unauthorizedHandler?.(err.code);
    }
    throw err;
  }
}

export async function downloadAuthenticatedFile(path: string, fallbackFilename = 'export.csv'): Promise<void> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: buildAuthHeaders(),
    });
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Unable to reach NOVARA servers to download the file.');
  }

  if (!response.ok) {
    const rawText = await response.text();
    const contentType = response.headers.get('content-type') || '';
    try {
      parseApiResponsePayload({
        path,
        status: response.status,
        ok: response.ok,
        contentType,
        rawText,
      });
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 401 &&
        (err.code === 'UNAUTHENTICATED' || err.code === 'INVALID_TOKEN')
      ) {
        clearAuthToken();
        unauthorizedHandler?.(err.code);
      }
      throw err;
    }
    throw new ApiError(response.status, 'DOWNLOAD_FAILED', `Export failed with status ${response.status}.`);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const match = /filename\*?=(?:UTF-8''|")?([^";\n]+)"?/i.exec(disposition);
  const filename = match?.[1] ? decodeURIComponent(match[1].trim()) : fallbackFilename;

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
