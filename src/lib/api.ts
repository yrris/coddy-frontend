import env from "../config/env";
import type { HealthPingData } from "../types/api";
import type {
  AiCodeGenerateRequest,
  AiCodeGenerateResponse,
} from "../types/codegen";
import type {
  LoginUser,
  UserLoginRequest,
  UserRegisterRequest,
} from "../types/user";
import { ApiError, request } from "./http";

export async function fetchHealthPing() {
  return request<HealthPingData>("/health/ping");
}

export async function registerUser(payload: UserRegisterRequest) {
  return request<number>("/user/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginUser(payload: UserLoginRequest) {
  return request<LoginUser>("/user/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchCurrentUser() {
  return request<LoginUser>("/user/current");
}

export async function logoutUser() {
  return request<boolean>("/user/logout", {
    method: "POST",
  });
}

export async function generateCode(payload: AiCodeGenerateRequest) {
  return request<AiCodeGenerateResponse>("/ai/codegen/generate", {
    method: "POST",
    body: JSON.stringify(payload),
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

export async function streamGenerateCode(
  payload: AiCodeGenerateRequest,
  handlers: StreamHandlers,
) {
  const response = await fetch(`${env.apiBaseUrl}/ai/codegen/stream`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Stream request failed";
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
    throw new ApiError("Stream response body is empty", response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  let isNormalEnd = false; // whether 'done' or 'error' received

  // wrap handlers to intercept the signal
  const wrappedHandlers: StreamHandlers = {
    ...handlers,
    onDone: () => {
      isNormalEnd = true;
      if (handlers.onDone) handlers.onDone();
    },
    onError: (msg) => {
      isNormalEnd = true; // clear error msg, normal end
      handlers.onError(msg);
    },
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    let delimiterIndex = buffer.indexOf("\n\n");

    while (delimiterIndex !== -1) {
      const rawEvent = buffer.slice(0, delimiterIndex);
      buffer = buffer.slice(delimiterIndex + 2);
      const parsedEvent = parseSseEvent(rawEvent);
      // handleSseEvent(parsedEvent, handlers);
      handleSseEvent(parsedEvent, wrappedHandlers);
      delimiterIndex = buffer.indexOf("\n\n");
    }
  }
  if (!isNormalEnd) {
    // no done or error,may be timeout
    handlers.onError(
      "The connection timed out or was unexpectedly disconnected. Please check your network and try again.",
    );
  }

  if (buffer.trim()) {
    const parsedEvent = parseSseEvent(buffer.trim());
    handleSseEvent(parsedEvent, handlers);
  }
}

function parseSseEvent(rawEvent: string): SseEvent {
  const lines = rawEvent.split("\n");
  let eventName = "message";
  const dataLines: string[] = [];

  lines.forEach((line) => {
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
      return;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  });

  return {
    eventName,
    data: dataLines.join("\n"),
  };
}

function handleSseEvent(event: SseEvent, handlers: StreamHandlers) {
  if (event.eventName === "chunk") {
    handlers.onChunk(event.data);
    return;
  }

  if (event.eventName === "result") {
    const parsed = JSON.parse(event.data) as AiCodeGenerateResponse;
    handlers.onResult(parsed);
    return;
  }

  if (event.eventName === "done") {
    if (handlers.onDone) handlers.onDone();
    return;
  }

  if (event.eventName === "error") {
    // throw new ApiError(event.data || 'Stream generation failed', 500);
    handlers.onError(
      event.data || "Something wrong during generating, please retry",
    );
    return;
  }
}
