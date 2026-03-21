import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminDeleteAppById, adminUpdateApp, deleteAppById, getAppVoById, updateApp } from '../lib/api';
import { ApiError } from '../lib/http';
import type { AppVO } from '../types/app';

function AppEditPage() {
  const navigate = useNavigate();
  const { appId = '' } = useParams();
  const { loginUser } = useAuth();

  const [app, setApp] = useState<AppVO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [appName, setAppName] = useState('');
  const [cover, setCover] = useState('');
  const [priority, setPriority] = useState('0');
  const [saving, setSaving] = useState(false);

  const isAdmin = loginUser?.userRole === 'ADMIN';
  const isOwner = !!(loginUser && app && String(loginUser.id) === String(app.userId));
  const canEdit = !!(loginUser && (isAdmin || isOwner));

  useEffect(() => {
    const load = async () => {
      try {
        const response = await getAppVoById(appId);
        const payload = response.data;
        setApp(payload);
        setAppName(payload.appName || '');
        setCover(payload.cover || '');
        setPriority(String(payload.priority ?? 0));
        setError(null);
      } catch (loadError) {
        if (loadError instanceof ApiError) {
          setError(loadError.message);
        } else {
          setError('Failed to load app');
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [appId]);

  const submitLabel = useMemo(() => {
    if (saving) {
      return 'Saving...';
    }
    return 'Save Changes';
  }, [saving]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!app || !canEdit) {
      return;
    }
    if (!appName.trim()) {
      setError('App name is required');
      return;
    }

    try {
      setSaving(true);
      if (isAdmin) {
        await adminUpdateApp({
          id: app.id,
          appName: appName.trim(),
          cover: cover.trim() || undefined,
          priority: Number(priority)
        });
      } else {
        await updateApp({
          id: app.id,
          appName: appName.trim()
        });
      }
      navigate(`/app/chat/${app.id}?view=1`);
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setError(saveError.message);
      } else {
        setError('Failed to save app');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!app || !canEdit) {
      return;
    }
    const shouldDelete = window.confirm('Delete this app?');
    if (!shouldDelete) {
      return;
    }

    try {
      if (isAdmin) {
        await adminDeleteAppById(app.id);
      } else {
        await deleteAppById(app.id);
      }
      navigate('/');
    } catch (deleteError) {
      if (deleteError instanceof ApiError) {
        setError(deleteError.message);
      } else {
        setError('Failed to delete app');
      }
    }
  };

  if (loading) {
    return <section className="panel">Loading app...</section>;
  }

  if (error && !app) {
    return <section className="panel status error">{error}</section>;
  }

  if (!loginUser) {
    return <section className="panel status loading">Please login first.</section>;
  }

  if (!canEdit) {
    return <section className="panel status error">You do not have permission to edit this app.</section>;
  }

  return (
    <section className="panel edit-page">
      <h1>Edit App</h1>
      <p className="panel-subtitle">{app?.appName}</p>

      <form className="edit-form" onSubmit={handleSubmit}>
        <label>
          App Name
          <input value={appName} onChange={(event) => setAppName(event.target.value)} maxLength={128} required />
        </label>

        {isAdmin ? (
          <>
            <label>
              Cover URL
              <input value={cover} onChange={(event) => setCover(event.target.value)} maxLength={1024} />
            </label>

            <label>
              Priority
              <input
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                type="number"
                min={0}
                max={9999}
              />
            </label>
          </>
        ) : null}

        <div className="edit-actions">
          <button type="submit" className="primary-btn" disabled={saving}>
            {submitLabel}
          </button>
          <button type="button" className="ghost-btn" onClick={() => navigate(`/app/chat/${appId}?view=1`)}>
            Cancel
          </button>
          <button type="button" className="ghost-btn danger-btn" onClick={() => void handleDelete()}>
            Delete
          </button>
        </div>
      </form>

      {error ? <p className="status error">{error}</p> : null}
    </section>
  );
}

export default AppEditPage;
