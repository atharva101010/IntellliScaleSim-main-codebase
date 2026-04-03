const envApiBase = (import.meta as any).env?.VITE_API_URL as string | undefined;
const envGrafanaBase = (import.meta as any).env?.VITE_GRAFANA_URL as string | undefined;

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '');
}

function isLocalLoopbackUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function resolveCodespacesUrl(port: number): string | null {
  if (typeof window === 'undefined' || !window.location.hostname.includes('.app.github.dev')) {
    return null;
  }

  const hostname = window.location.hostname.replace(/-\d+\.app\.github\.dev$/, `-${port}.app.github.dev`);
  return `${window.location.protocol}//${hostname}`;
}

function resolveLocalhostUrl(port: number): string {
  return `http://127.0.0.1:${port}`;
}

function resolveFallbackUrl(port: number): string {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:${port}`;
  }

  return resolveLocalhostUrl(port);
}

export function getServiceBaseUrl(port: number): string {
  if (port === 8001 && envApiBase) {
    if (isLocalLoopbackUrl(envApiBase)) {
      return '/api';
    }

    return normalizeBaseUrl(envApiBase);
  }

  if (port === 3500 && envGrafanaBase) {
    if (isLocalLoopbackUrl(envGrafanaBase)) {
      const codespacesGrafana = resolveCodespacesUrl(3500);
      if (codespacesGrafana) {
        return codespacesGrafana;
      }
    }

    return normalizeBaseUrl(envGrafanaBase);
  }

  const codespacesUrl = resolveCodespacesUrl(port);
  if (codespacesUrl) {
    return codespacesUrl;
  }

  const isLocalDev = typeof window !== 'undefined' && (
    window.location.port === '5173' ||
    window.location.port === '5174' ||
    window.location.port === '5175' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );

  if (isLocalDev) {
    return resolveLocalhostUrl(port);
  }

  return resolveFallbackUrl(port);
}

export function getApiBaseUrl(): string {
  return getServiceBaseUrl(8001);
}

export function getGrafanaBaseUrl(): string {
  return getServiceBaseUrl(3500);
}

export function getReachableServiceUrl(rawUrl?: string | null, fallbackPort?: number): string | null {
  let parsed: URL | null = null;

  if (rawUrl) {
    try {
      parsed = new URL(rawUrl);
    } catch {
      parsed = null;
    }
  }

  const candidatePort = parsed?.port ? Number(parsed.port) : fallbackPort;
  if (!candidatePort) {
    return rawUrl || null;
  }

  const localHost = parsed ? (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') : false;
  if (localHost) {
    const protocol = (parsed?.protocol === 'https:' || candidatePort === 443 || candidatePort === 8443 || candidatePort === 9443)
      ? 'https:'
      : 'http:';

    const base = getServiceBaseUrl(candidatePort);
    if (base.startsWith('/')) {
      return rawUrl || `${protocol}//127.0.0.1:${candidatePort}`;
    }

    return `${base.replace(/^https?:/, protocol)}`;
  }

  if (!parsed && fallbackPort) {
    return getServiceBaseUrl(fallbackPort);
  }

  return rawUrl || null;
}