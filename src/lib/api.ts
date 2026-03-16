import { request } from './http';
import type { HealthPingData } from '../types/api';
import type { LoginUser, UserLoginRequest, UserRegisterRequest } from '../types/user';

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
