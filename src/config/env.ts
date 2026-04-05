const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api';
const deployDomain = import.meta.env.VITE_DEPLOY_DOMAIN ?? 'http://localhost';
const staticBaseUrl = `${trimTailSlash(apiBaseUrl)}/static`;

const env = {
  apiBaseUrl,
  deployDomain,
  staticBaseUrl,
  appName: import.meta.env.VITE_APP_NAME ?? 'Coddy',
  appEnv: import.meta.env.VITE_APP_ENV ?? 'local',
  googleAuthEnabled: import.meta.env.VITE_GOOGLE_AUTH_ENABLED === 'true'
} as const;

export function getDeployUrl(deployKey: string) {
  return `${trimTailSlash(env.apiBaseUrl)}/deployed/${deployKey}/`;
}

export function getStaticPreviewUrl(previewKey: string) {
  return `${trimTailSlash(env.staticBaseUrl)}/${previewKey}/`;
}

function trimTailSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export default env;
