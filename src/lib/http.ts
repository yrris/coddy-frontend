import env from '../config/env';
import type { ApiResponse } from '../types/api';

export class ApiError extends Error {
  status: number;
  code: number;

  constructor(message: string, status: number, code = -1) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    },
    ...init
  });

  let payload: ApiResponse<T> | null = null;

  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError('Invalid response payload', response.status);
  }

  if (!response.ok) {
    throw new ApiError(payload.message || 'Request failed', response.status, payload.code);
  }

  if (payload.code !== 0) {
    throw new ApiError(payload.message || 'Business error', response.status, payload.code);
  }

  return payload;
}
