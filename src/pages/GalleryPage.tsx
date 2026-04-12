import { useCallback, useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppCard from '../components/AppCard';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { Skeleton } from '../components/ui/skeleton';
import { getDeployUrl } from '../config/env';
import { useAuth } from '../context/AuthContext';
import { likeApp, listFeaturedAppVoByPage, listPublicAppVoByPage, unlikeApp } from '../lib/api';
import { ApiError } from '../lib/http';
import type { AppVO, CodeGenType } from '../types/app';

type GalleryTab = 'public' | 'featured';
type SortMode = 'newest' | 'mostLiked';

function GalleryPage() {
  const navigate = useNavigate();
  const { loginUser } = useAuth();

  const [tab, setTab] = useState<GalleryTab>('public');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [keyword, setKeyword] = useState('');
  const [codeGenFilter, setCodeGenFilter] = useState<CodeGenType | ''>('');
  const [apps, setApps] = useState<AppVO[]>([]);
  const [page, setPage] = useState({ current: 1, pageSize: 12, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(page.total / page.pageSize)),
    [page.pageSize, page.total]
  );

  const loadApps = useCallback(async () => {
    setLoading(true);
    try {
      const fetchFn = tab === 'featured' ? listFeaturedAppVoByPage : listPublicAppVoByPage;
      const response = await fetchFn({
        pageNum: page.current,
        pageSize: page.pageSize,
        appName: keyword || undefined,
        codeGenType: codeGenFilter || undefined,
        sortField: sortMode === 'mostLiked' ? 'likeCount' : 'createTime',
        sortOrder: 'desc'
      });
      setApps(response.data.records || []);
      setPage((prev) => ({ ...prev, total: response.data.totalRow || 0 }));
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load apps');
      }
    } finally {
      setLoading(false);
    }
  }, [tab, sortMode, keyword, codeGenFilter, page.current, page.pageSize]);

  useEffect(() => {
    void loadApps();
  }, [loadApps]);

  const handleLike = async (appId: string | number) => {
    if (!loginUser) {
      navigate('/login');
      return;
    }
    try {
      await likeApp(appId);
      setApps((prev) =>
        prev.map((a) =>
          String(a.id) === String(appId) ? { ...a, hasLiked: true, likeCount: (a.likeCount || 0) + 1 } : a
        )
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      }
    }
  };

  const handleUnlike = async (appId: string | number) => {
    try {
      await unlikeApp(appId);
      setApps((prev) =>
        prev.map((a) =>
          String(a.id) === String(appId)
            ? { ...a, hasLiked: false, likeCount: Math.max(0, (a.likeCount || 0) - 1) }
            : a
        )
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      }
    }
  };

  return (
    <div className="gallery-page">
      <section className="panel gallery-panel">
        <div className="gallery-header">
          <h1>App Gallery</h1>
          <p className="panel-subtitle">Discover apps created by the community</p>
        </div>

        <div className="gallery-controls">
          <div className="gallery-tabs">
            <button
              type="button"
              className={tab === 'public' ? 'primary-btn' : 'ghost-btn'}
              onClick={() => {
                setTab('public');
                setPage((prev) => ({ ...prev, current: 1 }));
              }}
            >
              All Public
            </button>
            <button
              type="button"
              className={tab === 'featured' ? 'primary-btn' : 'ghost-btn'}
              onClick={() => {
                setTab('featured');
                setPage((prev) => ({ ...prev, current: 1 }));
              }}
            >
              Featured
            </button>
          </div>

          <div className="gallery-filters">
            <input
              className="search-input"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage((prev) => ({ ...prev, current: 1 }));
              }}
              placeholder="Search by name"
            />
            <select
              className="filter-select"
              value={codeGenFilter}
              onChange={(e) => {
                setCodeGenFilter(e.target.value as CodeGenType | '');
                setPage((prev) => ({ ...prev, current: 1 }));
              }}
            >
              <option value="">All Types</option>
              <option value="HTML_SINGLE">HTML Single</option>
              <option value="HTML_MULTI">HTML Multi</option>
              <option value="REACT_VITE">React + Vite</option>
            </select>
            <select
              className="filter-select"
              value={sortMode}
              onChange={(e) => {
                setSortMode(e.target.value as SortMode);
                setPage((prev) => ({ ...prev, current: 1 }));
              }}
            >
              <option value="newest">Newest</option>
              <option value="mostLiked">Most Liked</option>
            </select>
          </div>
        </div>

        {error ? (
          <ErrorState
            title="Failed to load gallery"
            description={error}
            onRetry={() => void loadApps()}
            className="mt-4"
          />
        ) : loading && apps.length === 0 ? (
          <div className="app-card-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[220px] w-full" />
            ))}
          </div>
        ) : apps.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="h-5 w-5" />}
            title="No apps yet"
            description={
              keyword || codeGenFilter
                ? 'Try clearing filters to see more results.'
                : 'Featured community creations will appear here once available.'
            }
            className="mt-4"
          />
        ) : (
          <div className="app-card-grid">
            {apps.map((app) => (
              <AppCard
                key={String(app.id)}
                app={app}
                onViewChat={() => navigate(`/app/chat/${app.id}?view=1`)}
                onViewSite={
                  app.deployKey ? () => window.open(getDeployUrl(app.deployKey || ''), '_blank') : undefined
                }
                onLike={loginUser && !app.hasLiked ? () => void handleLike(app.id) : undefined}
                onUnlike={loginUser && app.hasLiked ? () => void handleUnlike(app.id) : undefined}
              />
            ))}
          </div>
        )}

        <div className="pagination-row">
          <button
            className="ghost-btn"
            type="button"
            disabled={page.current <= 1}
            onClick={() => setPage((prev) => ({ ...prev, current: prev.current - 1 }))}
          >
            Prev
          </button>
          <span>
            {page.current} / {totalPages}
          </span>
          <button
            className="ghost-btn"
            type="button"
            disabled={page.current >= totalPages}
            onClick={() => setPage((prev) => ({ ...prev, current: prev.current + 1 }))}
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}

export default GalleryPage;
