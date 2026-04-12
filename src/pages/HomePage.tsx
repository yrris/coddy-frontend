import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppCard from '../components/AppCard';
import { getDeployUrl } from '../config/env';
import { useAuth } from '../context/AuthContext';
import { addApp, likeApp, listMyAppVoByPage, listMyLikedAppVoByPage, unlikeApp } from '../lib/api';
import { ApiError } from '../lib/http';
import type { AppVO, CodeGenType } from '../types/app';

const modeOptions: Array<{ label: string; value: CodeGenType }> = [
  { label: 'Native Single HTML', value: 'HTML_SINGLE' },
  { label: 'Native Multi HTML', value: 'HTML_MULTI' },
  { label: 'React + Vite', value: 'REACT_VITE' }
];

const quickPromptExamples = [
  'Create a Memphis Design-style website for a creative agency. High-saturation, contrasting color scheme: Coral Red #FF5252, Royal Blue #1A237E, Bright Yellow #FFD600, and Pink Green #69F0AE. The background is covered with hand-drawn geometric patterns: jagged edges, polka dots, diagonal lines, and triangles randomly scattered. Use an extra-bold round font. Elements have thick black outlines and are randomly rotated 2-5 degrees. Color blocks are directly joined without any white space. The overall effect is chaotic and fun, with a different color scheme for each screen. Mouse hover triggers element bouncing and color flashing.',
  'Create a startup landing page for an AI productivity product with pricing cards, feature grid, customer quotes, and a clean call-to-action flow for trial signup.',
  'Create a Glassmorphism-style landing page for your SaaS product. The dark gradient background uses large, blurred, colored light spheres (blue, purple, pink) as the underlying light source. All cards and panels use `backdrop-filter: blur(20px)`, a semi-transparent white background `rgba(255,255,255,0.12)`, and a thin white border `rgba(255,255,255,0.2)`. UI hierarchy is distinguished by differences in transparency. The blur value changes dynamically during interaction. Light colors are used for text to ensure readability. The overall effect is an icy, crystal-like texture.',
  'Design an event registration website with agenda overview, speaker list, countdown timer, and a simple registration form with validation feedback.'
];

function HomePage() {
  const navigate = useNavigate();
  const { loginUser } = useAuth();

  const [createPrompt, setCreatePrompt] = useState(quickPromptExamples[0]);
  const [createMode, setCreateMode] = useState<CodeGenType>('HTML_MULTI');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [myKeyword, setMyKeyword] = useState('');
  const [myApps, setMyApps] = useState<AppVO[]>([]);
  const [myPage, setMyPage] = useState({ current: 1, pageSize: 6, total: 0 });

  const [likedKeyword, setLikedKeyword] = useState('');
  const [likedApps, setLikedApps] = useState<AppVO[]>([]);
  const [likedPage, setLikedPage] = useState({ current: 1, pageSize: 6, total: 0 });

  const [listError, setListError] = useState<string | null>(null);

  const myTotalPages = useMemo(
    () => Math.max(1, Math.ceil(myPage.total / myPage.pageSize)),
    [myPage.pageSize, myPage.total]
  );

  const likedTotalPages = useMemo(
    () => Math.max(1, Math.ceil(likedPage.total / likedPage.pageSize)),
    [likedPage.pageSize, likedPage.total]
  );

  const loadMyApps = useCallback(async () => {
    if (!loginUser) {
      setMyApps([]);
      setMyPage((prev) => ({ ...prev, total: 0 }));
      return;
    }
    try {
      const response = await listMyAppVoByPage({
        pageNum: myPage.current,
        pageSize: myPage.pageSize,
        appName: myKeyword || undefined,
        sortField: 'createTime',
        sortOrder: 'desc'
      });
      setMyApps(response.data.records || []);
      setMyPage((prev) => ({ ...prev, total: response.data.totalRow || 0 }));
      setListError(null);
    } catch (error) {
      if (error instanceof ApiError) {
        setListError(error.message);
      } else {
        setListError('Failed to load my apps');
      }
    }
  }, [loginUser, myKeyword, myPage.current, myPage.pageSize]);

  const loadLikedApps = useCallback(async () => {
    if (!loginUser) {
      setLikedApps([]);
      setLikedPage((prev) => ({ ...prev, total: 0 }));
      return;
    }
    try {
      const response = await listMyLikedAppVoByPage({
        pageNum: likedPage.current,
        pageSize: likedPage.pageSize,
        appName: likedKeyword || undefined,
        sortField: 'createTime',
        sortOrder: 'desc'
      });
      setLikedApps(response.data.records || []);
      setLikedPage((prev) => ({ ...prev, total: response.data.totalRow || 0 }));
      setListError(null);
    } catch (error) {
      if (error instanceof ApiError) {
        setListError(error.message);
      } else {
        setListError('Failed to load liked apps');
      }
    }
  }, [loginUser, likedKeyword, likedPage.current, likedPage.pageSize]);

  useEffect(() => {
    void loadMyApps();
  }, [loadMyApps]);

  useEffect(() => {
    void loadLikedApps();
  }, [loadLikedApps]);

  const handleCreateApp = async (event: FormEvent) => {
    event.preventDefault();

    if (!loginUser) {
      navigate('/login');
      return;
    }
    if (!createPrompt.trim()) {
      setCreateError('Prompt is required');
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);
      const response = await addApp({
        initPrompt: createPrompt.trim(),
        codeGenType: createMode
      });
      const appId = String(response.data);
      navigate(`/app/chat/${appId}?autoStart=1`);
    } catch (error) {
      if (error instanceof ApiError) {
        setCreateError(error.message);
      } else {
        setCreateError('Failed to create app');
      }
    } finally {
      setCreating(false);
    }
  };

  const toAppPath = (app: AppVO) => {
    const appId = String(app.id);
    const isOwner = loginUser && String(loginUser.id) === String(app.userId);
    return isOwner ? `/app/chat/${appId}` : `/app/chat/${appId}?view=1`;
  };

  return (
    <div className="home-page">
      <section className="panel create-panel">
        <div className="create-panel-header">
          <h1>Build Your App</h1>
        </div>

        <p className="panel-subtitle">Create an app first, then continue generation in the chat workspace.</p>

        <form className="create-form" onSubmit={handleCreateApp}>
          <div className="mode-switch generator-mode-switch">
            {modeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={createMode === option.value ? 'primary-btn' : 'ghost-btn'}
                onClick={() => setCreateMode(option.value)}
                disabled={creating}
              >
                {option.label}
              </button>
            ))}
          </div>

          <textarea
            className="prompt-textarea"
            value={createPrompt}
            onChange={(event) => setCreatePrompt(event.target.value)}
            placeholder="Describe the app you want to build"
            rows={6}
            disabled={creating}
          />

          <div className="quick-prompts">
            {quickPromptExamples.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="ghost-btn"
                onClick={() => setCreatePrompt(prompt)}
                disabled={creating}
              >
                Use Sample Prompt
              </button>
            ))}
          </div>

          <div className="create-form-footer">
            <button className="primary-btn" type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create App'}
            </button>
            {loginUser ? (
              <span className="panel-subtitle">Logged in as {loginUser.displayName}</span>
            ) : (
              <span className="panel-subtitle">Login required for app creation</span>
            )}
          </div>
          {createError ? <p className="status error">{createError}</p> : null}
        </form>
      </section>

      {listError ? <p className="status error">{listError}</p> : null}

      <section id="my-apps" className="panel list-panel">
        <div className="list-header">
          <h2>My Apps</h2>
          <input
            className="search-input"
            value={myKeyword}
            onChange={(event) => {
              setMyKeyword(event.target.value);
              setMyPage((prev) => ({ ...prev, current: 1 }));
            }}
            placeholder="Search by app name"
            disabled={!loginUser}
          />
        </div>

        {!loginUser ? (
          <p className="panel-subtitle">Login first to view your apps.</p>
        ) : myApps.length === 0 ? (
          <p className="panel-subtitle">No apps yet.</p>
        ) : (
          <div className="app-card-grid">
            {myApps.map((app) => (
              <AppCard
                key={String(app.id)}
                app={app}
                onViewChat={() => navigate(toAppPath(app))}
                onViewSite={app.deployKey ? () => window.open(getDeployUrl(app.deployKey || ''), '_blank') : undefined}
              />
            ))}
          </div>
        )}

        <div className="pagination-row">
          <button
            className="ghost-btn"
            type="button"
            disabled={myPage.current <= 1 || !loginUser}
            onClick={() => setMyPage((prev) => ({ ...prev, current: prev.current - 1 }))}
          >
            Prev
          </button>
          <span>
            {myPage.current} / {myTotalPages}
          </span>
          <button
            className="ghost-btn"
            type="button"
            disabled={myPage.current >= myTotalPages || !loginUser}
            onClick={() => setMyPage((prev) => ({ ...prev, current: prev.current + 1 }))}
          >
            Next
          </button>
        </div>
      </section>

      <section className="panel list-panel">
        <div className="list-header">
          <h2>Liked Apps</h2>
          <input
            className="search-input"
            value={likedKeyword}
            onChange={(event) => {
              setLikedKeyword(event.target.value);
              setLikedPage((prev) => ({ ...prev, current: 1 }));
            }}
            placeholder="Search liked apps"
            disabled={!loginUser}
          />
        </div>

        {!loginUser ? (
          <p className="panel-subtitle">Login first to view your liked apps.</p>
        ) : likedApps.length === 0 ? (
          <p className="panel-subtitle">No liked apps yet. Like apps in the Gallery!</p>
        ) : (
          <div className="app-card-grid">
            {likedApps.map((app) => (
              <AppCard
                key={String(app.id)}
                app={app}
                onViewChat={() => navigate(toAppPath(app))}
                onViewSite={app.deployKey ? () => window.open(getDeployUrl(app.deployKey || ''), '_blank') : undefined}
                onLike={
                  !app.hasLiked
                    ? async () => {
                        await likeApp(app.id);
                        void loadLikedApps();
                      }
                    : undefined
                }
                onUnlike={
                  app.hasLiked
                    ? async () => {
                        await unlikeApp(app.id);
                        void loadLikedApps();
                      }
                    : undefined
                }
              />
            ))}
          </div>
        )}

        <div className="pagination-row">
          <button
            className="ghost-btn"
            type="button"
            disabled={likedPage.current <= 1 || !loginUser}
            onClick={() => setLikedPage((prev) => ({ ...prev, current: prev.current - 1 }))}
          >
            Prev
          </button>
          <span>
            {likedPage.current} / {likedTotalPages}
          </span>
          <button
            className="ghost-btn"
            type="button"
            disabled={likedPage.current >= likedTotalPages || !loginUser}
            onClick={() => setLikedPage((prev) => ({ ...prev, current: prev.current + 1 }))}
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
