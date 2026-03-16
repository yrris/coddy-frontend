import { request } from './http';
import type { HealthPingData } from '../types/api';

export async function fetchHealthPing() {
  return request<HealthPingData>('/health/ping');
}
