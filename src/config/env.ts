const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  appName: import.meta.env.VITE_APP_NAME ?? 'Coddy',
  appEnv: import.meta.env.VITE_APP_ENV ?? 'local',
  googleAuthEnabled: import.meta.env.VITE_GOOGLE_AUTH_ENABLED === 'true'
} as const;

export default env;
