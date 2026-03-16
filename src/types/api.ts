export type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
  timestamp: string;
};

export type HealthPingData = {
  service: string;
  status: string;
};
