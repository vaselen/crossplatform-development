import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
const InstallContext = createContext<{ available: boolean; installed: boolean; install: () => Promise<void> }>({ available: false, installed: false, install: async () => {} });

export function InstallProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
  useEffect(() => {
    const onPrompt = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);
  async function install() {
    if (!prompt) return;
    setPrompt(null);
    await prompt.prompt();
    if ((await prompt.userChoice).outcome === 'accepted') setInstalled(true);
  }
  return <InstallContext.Provider value={{ available: !!prompt, installed, install }}>{children}</InstallContext.Provider>;
}

export function InstallButton() {
  const { available, installed, install } = useContext(InstallContext);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [ios] = useState(() => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
  if (installed || (!available && !ios)) return null;
  return <>
    <button type="button" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors" onClick={() => { if (available) void install(); else dialog.current?.showModal(); }}>Установить</button>
    <dialog ref={dialog} aria-labelledby={titleId} className="m-auto w-[90vw] max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--text)] backdrop:bg-black/70">
      <h2 id={titleId} className="font-bold text-xl mb-4">Установить КИНО</h2>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-5">В Safari откройте меню «Поделиться», выберите «На экран Домой» и нажмите «Добавить».</p>
      <button type="button" onClick={() => dialog.current?.close()} className="action-button w-full">Понятно</button>
    </dialog>
  </>;
}
