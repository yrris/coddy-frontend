import env from '../config/env';
import type { HealthPingData } from '../types/api';
import type { AiCodeGenerateRequest, AiCodeGenerateResponse } from '../types/codegen';
import type {
  AppAddRequest,
  AppAdminUpdateRequest,
  AppDeployRequest,
  AppId,
  AppQueryRequest,
  AppUpdateRequest,
  AppVO,
  PageVO
} from '../types/app';
import type { LoginUser, UserLoginRequest, UserRegisterRequest } from '../types/user';
import { ApiError, request } from './http';

export async function fetchHealthPing() {
  return request<HealthPingData>('/health/ping');
}

export async function registerUser(payload: UserRegisterRequest) {
  return request<number>('/user/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function loginUser(payload: UserLoginRequest) {
  return request<LoginUser>('/user/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchCurrentUser() {
  return request<LoginUser>('/user/current');
}

export async function logoutUser() {
  return request<boolean>('/user/logout', {
    method: 'POST'
  });
}

export async function generateCode(payload: AiCodeGenerateRequest) {
  return request<AiCodeGenerateResponse>('/ai/codegen/generate', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

type StreamHandlers = {
  onChunk: (chunk: string) => void;
  onResult: (result: AiCodeGenerateResponse) => void;
  onError: (errorMessage: string) => void;
  onDone?: () => void;
};

type SseEvent = {
  eventName: string;
  data: string;
};

export async function streamGenerateCode(payload: AiCodeGenerateRequest, handlers: StreamHandlers) {
  const response = await fetch(`${env.apiBaseUrl}/ai/codegen/stream`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let message = 'Stream request failed';
    let code = -1;
    try {
      const jsonPayload = await response.json();
      message = jsonPayload?.message ?? message;
      code = jsonPayload?.code ?? code;
    } catch {
      message = response.statusText || message;
    }
    throw new ApiError(message, response.status, code);
  }

  if (!response.body) {
    throw new ApiError('Stream response body is empty', response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let isNormalEnd = false;

  const wrappedHandlers: StreamHandlers = {
    ...handlers,
    onDone: () => {
      isNormalEnd = true;
      handlers.onDone?.();
    },
    onError: (message) => {
      isNormalEnd = true;
      handlers.onError(message);
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    let delimiterIndex = buffer.indexOf('\n\n');

    while (delimiterIndex !== -1) {
      const rawEvent = buffer.slice(0, delimiterIndex);
      buffer = buffer.slice(delimiterIndex + 2);
      const parsedEvent = parseSseEvent(rawEvent);
      handleSseEvent(parsedEvent, wrappedHandlers);
      delimiterIndex = buffer.indexOf('\n\n');
    }
  }

  if (!isNormalEnd) {
    handlers.onError(
      'The connection timed out or was unexpectedly disconnected. Please check your network and try again.'
    );
  }

  if (buffer.trim()) {
    const parsedEvent = parseSseEvent(buffer.trim());
    handleSseEvent(parsedEvent, handlers);
  }
}

function parseSseEvent(rawEvent: string): SseEvent {
  const lines = rawEvent.split('\n');
  let eventName = 'message';
  const dataLines: string[] = [];

  lines.forEach((line) => {
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim();
      return;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
    }
  });

  return {
    eventName,
    data: dataLines.join('\n')
  };
}

function handleSseEvent(event: SseEvent, handlers: StreamHandlers) {
  if (event.eventName === 'chunk') {
    handlers.onChunk(event.data);
    return;
  }

  if (event.eventName === 'result') {
    const parsed = JSON.parse(event.data) as AiCodeGenerateResponse;
    handlers.onResult(parsed);
    return;
  }

  if (event.eventName === 'done') {
    handlers.onDone?.();
    return;
  }

  if (event.eventName === 'error') {
    handlers.onError(event.data || 'Something wrong during generating, please retry');
  }
}

export async function addApp(payload: AppAddRequest) {
  return request<AppId>('/app/add', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateApp(payload: AppUpdateRequest) {
  return request<boolean>('/app/update', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function deleteAppById(id: AppId) {
  return request<boolean>('/app/delete', {
    method: 'POST',
    body: JSON.stringify({ id })
  });
}

export async function getAppVoById(id: AppId) {
  const params = new URLSearchParams({ id: String(id) });
  return request<AppVO>(`/app/get/vo?${params.toString()}`);
}

export async function listMyAppVoByPage(payload: AppQueryRequest = {}) {
  return request<PageVO<AppVO>>('/app/my/list/page/vo', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function listGoodAppVoByPage(payload: AppQueryRequest = {}) {
  return request<PageVO<AppVO>>('/app/good/list/page/vo', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function deployApp(payload: AppDeployRequest) {
  return request<string>('/app/deploy', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function adminDeleteAppById(id: AppId) {
  return request<boolean>('/app/admin/delete', {
    method: 'POST',
    body: JSON.stringify({ id })
  });
}

export async function adminUpdateApp(payload: AppAdminUpdateRequest) {
  return request<boolean>('/app/admin/update', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function adminListAppVoByPage(payload: AppQueryRequest = {}) {
  return request<PageVO<AppVO>>('/app/admin/list/page/vo', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function adminGetAppVoById(id: AppId) {
  const params = new URLSearchParams({ id: String(id) });
  return request<AppVO>(`/app/admin/get/vo?${params.toString()}`);
}

type AppChatStreamHandlers = {
  onChunk: (chunk: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
};

export function streamAppChatToGenCode(
  appId: AppId,
  message: string,
  handlers: AppChatStreamHandlers
) {
  const params = new URLSearchParams({
    appId: String(appId),
    message
  });
  const streamUrl = `${env.apiBaseUrl}/app/chat/gen/code?${params.toString()}`;
  const eventSource = new EventSource(streamUrl, {
    withCredentials: true
  });

  let closed = false;

  const close = () => {
    if (closed) {
      return;
    }
    closed = true;
    eventSource.close();
  };

  eventSource.onmessage = (event) => {
    if (closed) {
      return;
    }
    try {
      const parsed = JSON.parse(event.data) as { d?: string };
      handlers.onChunk(parsed.d ?? '');
    } catch {
      handlers.onError('Failed to parse SSE payload');
      close();
    }
  };

  eventSource.addEventListener('done', () => {
    if (closed) {
      return;
    }
    handlers.onDone();
    close();
  });

  eventSource.onerror = () => {
    if (closed) {
      return;
    }
    handlers.onError('SSE connection failed');
    close();
  };

  return close;
}
