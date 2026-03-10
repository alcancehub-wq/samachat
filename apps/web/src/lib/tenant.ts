const TENANT_KEY = 'samachat:tenant';
const TENANT_COOKIE = 'samachat-tenant';

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=604800; samesite=lax`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

export function getTenantId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem(TENANT_KEY);
}

export function setTenantId(tenantId: string) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(TENANT_KEY, tenantId);
  setCookie(TENANT_COOKIE, tenantId);
}

export function clearTenantId() {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(TENANT_KEY);
  clearCookie(TENANT_COOKIE);
}
