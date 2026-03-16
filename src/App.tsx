import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import env from './config/env';
import { useAuth } from './context/AuthContext';
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
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
