import { AnimatePresence, motion } from 'framer-motion';
import { Menu, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import env from './config/env';
import { useAuth } from './context/AuthContext';
import { ThemeToggle } from './components/ThemeToggle';
import { Button } from './components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './components/ui/sheet';
import { pageTransition, pageVariants } from './lib/motion';
import { useMediaQuery } from './lib/useMediaQuery';
import AdminAppsPage from './pages/AdminAppsPage';
import AdminChatHistoryPage from './pages/AdminChatHistoryPage';
import AppChatPage from './pages/AppChatPage';
import AppEditPage from './pages/AppEditPage';
import GalleryPage from './pages/GalleryPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  onClick?: () => void;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageTransition}
        className="route-motion"
      >
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/app/chat/:appId" element={<AppChatPage />} />
          <Route path="/app/edit/:appId" element={<AppEditPage />} />
          <Route path="/admin/apps" element={<AdminAppsPage />} />
          <Route path="/admin/chat-history" element={<AdminChatHistoryPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  const { loginUser, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [sheetOpen, setSheetOpen] = useState(false);

  // Close mobile sheet on route change
  useEffect(() => {
    setSheetOpen(false);
  }, [location.pathname]);

  const scrollToMyApps = () => {
    if (location.pathname !== '/') navigate('/');
    // HomePage may not be mounted yet when navigating from another route
    // (AnimatePresence mode="wait" waits for the exit animation). Poll with
    // rAF until the anchor exists, then scroll — bail out after ~1.2s.
    const start = performance.now();
    const tryScroll = () => {
      const el = document.getElementById('my-apps');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (performance.now() - start < 1200) requestAnimationFrame(tryScroll);
    };
    requestAnimationFrame(tryScroll);
  };

  const navItems: NavItem[] = [
    { to: '/', label: 'Home', end: true },
    { to: '/gallery', label: 'Gallery' },
    ...(loginUser ? [{ to: '/', label: 'My Apps', onClick: scrollToMyApps }] : []),
    ...(loginUser?.userRole === 'ADMIN'
      ? [
          { to: '/admin/apps', label: 'Admin Apps' },
          { to: '/admin/chat-history', label: 'Chat History' }
        ]
      : []),
    { to: '/login', label: 'Auth' }
  ];

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-brand">
          <Sparkles className="header-brand-icon" />
          <span>{env.appName}</span>
        </div>

        {isDesktop ? (
          <nav className="header-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.end}
                onClick={item.onClick}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        ) : null}

        <div className="header-user">
          {isDesktop ? (
            <>
              {!loading && loginUser ? (
                <>
                  <span className="header-username">{loginUser.displayName}</span>
                  <button className="ghost-btn" type="button" onClick={() => void logout()}>
                    Logout
                  </button>
                </>
              ) : null}
              <ThemeToggle />
            </>
          ) : (
            <>
              <ThemeToggle />
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="icon" size="icon" aria-label="Open menu">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px]">
                  <SheetHeader>
                    <SheetTitle>{env.appName}</SheetTitle>
                    {loginUser ? (
                      <p className="text-sm text-[var(--color-text-muted)]">
                        Signed in as <span className="text-[var(--color-text)]">{loginUser.displayName}</span>
                      </p>
                    ) : null}
                  </SheetHeader>
                  <nav className="mt-2 flex flex-col gap-1">
                    {navItems.map((item) => (
                      <SheetClose asChild key={item.label}>
                        <NavLink
                          to={item.to}
                          end={item.end}
                          onClick={item.onClick}
                          className={({ isActive }) =>
                            `sheet-nav-link${isActive ? ' active' : ''}`
                          }
                        >
                          {item.label}
                        </NavLink>
                      </SheetClose>
                    ))}
                  </nav>
                  {!loading && loginUser ? (
                    <div className="mt-auto pt-4 border-t border-[var(--color-border)]">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => void logout()}
                      >
                        Logout
                      </Button>
                    </div>
                  ) : null}
                </SheetContent>
              </Sheet>
            </>
          )}
        </div>
      </header>

      <main className="app-main">
        <AnimatedRoutes />
      </main>
    </div>
  );
}

export default App;
