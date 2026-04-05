import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppCard from '../components/AppCard';
import { getDeployUrl } from '../config/env';
import { useAuth } from '../context/AuthContext';
import { addApp, listGoodAppVoByPage, listMyAppVoByPage } from '../lib/api';
import { ApiError } from '../lib/http';
import type { AppVO, CodeGenType } from '../types/app';

const modeOptions: Array<{ label: string; value: CodeGenType }> = [
  { label: 'Native Single HTML', value: 'HTML_SINGLE' },
  { label: 'Native Multi HTML', value: 'HTML_MULTI' },
  { label: 'React + Vite', value: 'REACT_VITE' }
];

const quickPromptExamples = [
  'Build a personal backend engineer portfolio website with a dark hero section, project timeline, internship highlights, and a contact form optimized for recruiter review.',
  'Create a startup landing page for an AI productivity product with pricing cards, feature grid, customer quotes, and a clean call-to-action flow for trial signup.',
  'Generate a modern documentation website with sticky navigation, searchable sections, release highlights, and mobile-first layout for engineering teams.',
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

  const [featuredKeyword, setFeaturedKeyword] = useState('');
  const [featuredApps, setFeaturedApps] = useState<AppVO[]>([]);
  const [featuredPage, setFeaturedPage] = useState({ current: 1, pageSize: 6, total: 0 });

  const [listError, setListError] = useState<string | null>(null);

  const myTotalPages = useMemo(
    () => Math.max(1, Math.ceil(myPage.total / myPage.pageSize)),
    [myPage.pageSize, myPage.total]
  );

  const featuredTotalPages = useMemo(
    () => Math.max(1, Math.ceil(featuredPage.total / featuredPage.pageSize)),
    [featuredPage.pageSize, featuredPage.total]
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

  const loadFeaturedApps = useCallback(async () => {
    try {
      const response = await listGoodAppVoByPage({
        pageNum: featuredPage.current,
        pageSize: featuredPage.pageSize,
        appName: featuredKeyword || undefined,
        sortField: 'createTime',
        sortOrder: 'desc'
      });
      setFeaturedApps(response.data.records || []);
      setFeaturedPage((prev) => ({ ...prev, total: response.data.totalRow || 0 }));
      setListError(null);
    } catch (error) {
      if (error instanceof ApiError) {
        setListError(error.message);
      } else {
        setListError('Failed to load featured apps');
      }
    }
  }, [featuredKeyword, featuredPage.current, featuredPage.pageSize]);

  useEffect(() => {
    void loadMyApps();
  }, [loadMyApps]);

  useEffect(() => {
    void loadFeaturedApps();
  }, [loadFeaturedApps]);

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
          <span className="generator-badge">P4</span>
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
          <h2>Featured Apps</h2>
          <input
            className="search-input"
            value={featuredKeyword}
            onChange={(event) => {
              setFeaturedKeyword(event.target.value);
              setFeaturedPage((prev) => ({ ...prev, current: 1 }));
            }}
            placeholder="Search featured"
          />
        </div>

        {featuredApps.length === 0 ? (
          <p className="panel-subtitle">No featured apps yet.</p>
        ) : (
          <div className="app-card-grid">
            {featuredApps.map((app) => (
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
            disabled={featuredPage.current <= 1}
            onClick={() => setFeaturedPage((prev) => ({ ...prev, current: prev.current - 1 }))}
          >
            Prev
          </button>
          <span>
            {featuredPage.current} / {featuredTotalPages}
          </span>
          <button
            className="ghost-btn"
            type="button"
            disabled={featuredPage.current >= featuredTotalPages}
            onClick={() => setFeaturedPage((prev) => ({ ...prev, current: prev.current + 1 }))}
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
