export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';

export type ApiRequestOptions = RequestInit & {
  idempotencyKey?: string;
};

export type ApiErrorBody = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  code?: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly body?: ApiErrorBody;

  constructor(status: number, body?: ApiErrorBody) {
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : body?.message || body?.error || 'Permintaan API gagal diproses.';

    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body?.code;
    this.body = body;
  }
}

function isJsonBody(body: BodyInit | null | undefined): boolean {
  return body != null && !(body instanceof FormData) && !(body instanceof Blob);
}

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return undefined;
  }

  return response.json().catch(() => undefined);
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (isJsonBody(options.body) && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  if (options.idempotencyKey) {
    headers.set('idempotency-key', options.idempotencyKey);
  }

  const requestOptions = { ...options };
  delete requestOptions.idempotencyKey;
  const response = await fetch(`${apiUrl}${path}`, {
    ...requestOptions,
    credentials: 'include',
    headers,
  });
  const body = await parseResponseBody(response);

  if (!response.ok) {
    throw new ApiError(response.status, (body ?? undefined) as ApiErrorBody | undefined);
  }

  return body as T;
}
