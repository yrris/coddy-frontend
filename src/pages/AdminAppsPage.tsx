import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  adminDeleteAppById,
  adminFeatureApp,
  adminListAppVoByPage,
  adminUnfeatureApp,
} from "../lib/api";
import { ApiError } from "../lib/http";
import type { AppVO, CodeGenType } from "../types/app";

function AdminAppsPage() {
  const navigate = useNavigate();
  const { loginUser } = useAuth();

  const [apps, setApps] = useState<AppVO[]>([]);
  const [page, setPage] = useState({ current: 1, pageSize: 10, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [appName, setAppName] = useState("");
  const [userId, setUserId] = useState("");
  const [deployKey, setDeployKey] = useState("");
  const [priority, setPriority] = useState("");
  const [codeGenType, setCodeGenType] = useState<"" | CodeGenType>("");

  const isAdmin = loginUser?.userRole === "ADMIN";
  const totalPages = Math.max(1, Math.ceil(page.total / page.pageSize));

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const response = await adminListAppVoByPage({
          pageNum: page.current,
          pageSize: page.pageSize,
          appName: appName || undefined,
          userId: userId || undefined,
          deployKey: deployKey || undefined,
          priority: priority ? Number(priority) : undefined,
          codeGenType: codeGenType || undefined,
          sortField: "createTime",
          sortOrder: "desc",
        });
        setApps(response.data.records || []);
        setPage((prev) => ({ ...prev, total: response.data.totalRow || 0 }));
        setError(null);
      } catch (loadError) {
        if (loadError instanceof ApiError) {
          setError(loadError.message);
        } else {
          setError("Failed to load apps");
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [
    appName,
    codeGenType,
    deployKey,
    isAdmin,
    page.current,
    page.pageSize,
    priority,
    reloadToken,
    userId,
  ]);

  const handleFilterSubmit = (event: FormEvent) => {
    event.preventDefault();
    setPage((prev) => ({ ...prev, current: 1 }));
    setReloadToken((token) => token + 1);
  };

  const handleDelete = async (app: AppVO) => {
    const confirmed = window.confirm(`Delete app ${app.appName}?`);
    if (!confirmed) {
      return;
    }
    try {
      await adminDeleteAppById(app.id);
      setReloadToken((token) => token + 1);
    } catch (deleteError) {
      if (deleteError instanceof ApiError) {
        setError(deleteError.message);
      } else {
        setError("Failed to delete app");
      }
    }
  };

  const handleToggleFeature = async (app: AppVO) => {
    try {
      if (app.isFeatured) {
        await adminUnfeatureApp(app.id);
      } else {
        await adminFeatureApp(app.id);
      }
      setReloadToken((token) => token + 1);
    } catch (updateError) {
      if (updateError instanceof ApiError) {
        setError(updateError.message);
      } else {
        setError("Failed to toggle feature");
      }
    }
  };

  if (!loginUser) {
    return (
      <section className="panel status loading">Please login first.</section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="panel status error">Admin role required.</section>
    );
  }

  return (
    <section className="panel admin-page">
      <h1>App Administration</h1>
      <p className="panel-subtitle">
        Manage all apps, update featured priority, and moderate content.
      </p>

      <form className="admin-filter-form" onSubmit={handleFilterSubmit}>
        <input
          placeholder="App name"
          value={appName}
          onChange={(event) => setAppName(event.target.value)}
        />
        <input
          placeholder="User id"
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
        />
        <input
          placeholder="Deploy key"
          value={deployKey}
          onChange={(event) => setDeployKey(event.target.value)}
        />
        <input
          placeholder="Priority"
          value={priority}
          onChange={(event) => setPriority(event.target.value)}
        />

        <select
          value={codeGenType}
          onChange={(event) =>
            setCodeGenType(event.target.value as "" | CodeGenType)
          }
        >
          <option value="">All Types</option>
          <option value="HTML_SINGLE">HTML_SINGLE</option>
          <option value="HTML_MULTI">HTML_MULTI</option>
        </select>

        <button type="submit" className="primary-btn">
          Search
        </button>
      </form>

      {error ? <p className="status error">{error}</p> : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Owner</th>
              <th>Type</th>
              <th>Public</th>
              <th>Featured</th>
              <th>Deploy Key</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`sk-${i}`}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <td key={j}>
                      <div className="skeleton-row-cell" />
                    </td>
                  ))}
                </tr>
              ))
            ) : apps.length === 0 ? (
              <tr>
                <td colSpan={8} className="admin-empty-cell">No data</td>
              </tr>
            ) : (
              apps.map((app) => (
                <tr key={String(app.id)}>
                  <td>{String(app.id)}</td>
                  <td>{app.appName}</td>
                  <td>{app.user?.displayName || app.userId}</td>
                  <td>{app.codeGenType}</td>
                  <td>{app.isPublic ? "Yes" : "No"}</td>
                  <td>{app.isFeatured ? "Yes" : "No"}</td>
                  <td>{app.deployKey || "-"}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() => navigate(`/app/chat/${app.id}?view=1`)}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() => navigate(`/app/edit/${app.id}`)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={app.isFeatured ? "primary-btn" : "ghost-btn"}
                        onClick={() => void handleToggleFeature(app)}
                        disabled={!app.isPublic}
                        title={
                          !app.isPublic ? "App must be public to feature" : ""
                        }
                      >
                        {app.isFeatured ? "Unfeature" : "Feature"}
                      </button>
                      <button
                        type="button"
                        className="ghost-btn danger-btn"
                        onClick={() => void handleDelete(app)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination-row">
        <button
          className="ghost-btn"
          type="button"
          disabled={page.current <= 1}
          onClick={() =>
            setPage((prev) => ({ ...prev, current: prev.current - 1 }))
          }
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
          onClick={() =>
            setPage((prev) => ({ ...prev, current: prev.current + 1 }))
          }
        >
          Next
        </button>
      </div>
    </section>
  );
}

export default AdminAppsPage;
