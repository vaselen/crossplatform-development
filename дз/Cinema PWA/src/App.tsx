import { BrowserRouter, Route, Routes, Link } from 'react-router-dom';
import { ErrorBoundary } from './components/Layout';
import HomePage from './pages/HomePage';
import MoviePage from './pages/MoviePage';
import BookingPage from './pages/BookingPage';
import CheckoutPage from './pages/CheckoutPage';
import MyTicketsPage from './pages/MyTicketsPage';
import FeedbackPage from './pages/FeedbackPage';
import NotificationsPage from './pages/NotificationsPage';
import { ConnectionWatch, OnlineOnly } from './components/OfflineState';
import { InstallProvider } from './pwa/install';

export default function App() {
  return <BrowserRouter><InstallProvider><ConnectionWatch /><ErrorBoundary><Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/movie/:id" element={<MoviePage />} />
    <Route path="/booking/:movieId/:sessionId" element={<OnlineOnly message="Для выбора мест нужно соединение с сервером."><BookingPage /></OnlineOnly>} />
    <Route path="/checkout" element={<OnlineOnly message="Для оформления билетов нужно соединение с сервером."><CheckoutPage /></OnlineOnly>} />
    <Route path="/my-tickets" element={<MyTicketsPage />} />
    <Route path="/feedback" element={<FeedbackPage />} />
    <Route path="/notifications" element={<NotificationsPage />} />
    <Route path="*" element={<div className="max-w-4xl mx-auto px-6 py-20"><h1 className="text-3xl font-bold mb-4">Страница не найдена</h1><Link to="/" className="text-[var(--accent)]">Вернуться к фильмам →</Link></div>} />
  </Routes></ErrorBoundary></InstallProvider></BrowserRouter>;
}
