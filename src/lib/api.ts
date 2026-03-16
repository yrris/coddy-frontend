const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export type HealthPingResponse = {
  code: number;
  message: string;
  data: {
    service: string;
    status: string;
  };
  timestamp: string;
};

export async function fetchHealthPing(): Promise<HealthPingResponse> {
  const response = await fetch(`${API_BASE_URL}/health/ping`, {
    method: 'GET',
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`Health ping failed: ${response.status}`);
  }

  return response.json() as Promise<HealthPingResponse>;
}
