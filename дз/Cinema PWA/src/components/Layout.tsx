import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function Loading() {
  return <div role="status" className="min-h-[50vh] flex items-center justify-center"><div className="text-center"><div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" /><p className="text-[var(--text-muted)]">Загрузка…</p></div></div>;
}
export function ErrorPanel({ message, retry }: { message: string; retry?: () => void }) {
  return <div role="alert" className="max-w-2xl mx-auto my-12 p-6 border border-red-500/40 rounded-xl bg-[var(--surface)]"><p className="mb-4">{message}</p>{retry && <button onClick={retry} className="action-button">Повторить</button>}<Link to="/" className="ml-4 text-sm underline">На главную</Link></div>;
}
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Ошибка интерфейса:', error, info.componentStack); }
  render() {
    if (this.state.failed) return <ErrorPanel message="Не удалось показать страницу. Обновите её и попробуйте снова." retry={() => window.location.reload()} />;
    return this.props.children;
  }
}
