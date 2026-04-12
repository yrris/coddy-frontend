import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import env from './config/env';
import { useAuth } from './context/AuthContext';
import AdminAppsPage from './pages/AdminAppsPage';
import AdminChatHistoryPage from './pages/AdminChatHistoryPage';
import AppChatPage from './pages/AppChatPage';
import AppEditPage from './pages/AppEditPage';
import GalleryPage from './pages/GalleryPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';

function App() {
  const { loginUser, logout, loading } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-brand">{env.appName}</div>
        <nav className="header-nav">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/gallery">Gallery</NavLink>
          {loginUser ? (
            <NavLink
              to="/"
              onClick={() => {
                setTimeout(() => {
                  document.getElementById('my-apps')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
            >
              My Apps
            </NavLink>
          ) : null}
          {loginUser?.userRole === 'ADMIN' ? (
            <>
              <NavLink to="/admin/apps">Admin Apps</NavLink>
              <NavLink to="/admin/chat-history">Chat History</NavLink>
            </>
          ) : null}
          <NavLink to="/login">Auth</NavLink>
        </nav>

        <div className="header-user">
          {!loading && loginUser ? (
            <>
              <span>{loginUser.displayName}</span>
              <button className="ghost-btn" type="button" onClick={() => void logout()}>
                Logout
              </button>
            </>
          ) : null}
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/app/chat/:appId" element={<AppChatPage />} />
          <Route path="/app/edit/:appId" element={<AppEditPage />} />
          <Route path="/admin/apps" element={<AdminAppsPage />} />
          <Route path="/admin/chat-history" element={<AdminChatHistoryPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
