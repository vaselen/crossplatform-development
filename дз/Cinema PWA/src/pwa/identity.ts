export function browserKey(): string {
  try {
    const storageKey = 'cinema-pwa-client';
    const existing = localStorage.getItem(storageKey);
    if (existing && /^[a-f0-9]{64}$/.test(existing)) return existing;
    const key = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(storageKey, key);
    return key;
  } catch {
    throw new Error('Разрешите хранение данных сайта, чтобы оформлять и просматривать свои билеты.');
  }
}
