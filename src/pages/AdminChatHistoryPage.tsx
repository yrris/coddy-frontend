import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminDeleteChatHistory, adminListChatHistoryByPage } from '../lib/api';
import { ApiError } from '../lib/http';
import type { ChatHistoryVO } from '../types/app';

function AdminChatHistoryPage() {
  const navigate = useNavigate();
  const { loginUser } = useAuth();

  const [items, setItems] = useState<ChatHistoryVO[]>([]);
  const [page, setPage] = useState({ current: 1, pageSize: 10, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [projectId, setProjectId] = useState('');
  const [senderType, setSenderType] = useState<'' | 'USER' | 'ASSISTANT'>('');
  const [content, setContent] = useState('');

  const isAdmin = loginUser?.userRole === 'ADMIN';
  const totalPages = Math.max(1, Math.ceil(page.total / page.pageSize));

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const response = await adminListChatHistoryByPage({
          pageNum: page.current,
          pageSize: page.pageSize,
          projectId: projectId ? Number(projectId) : undefined,
          senderType: senderType || undefined,
          content: content || undefined,
          sortField: 'createdAt',
          sortOrder: 'desc'
        });
        setItems(response.data.records || []);
        setPage((prev) => ({ ...prev, total: response.data.totalRow || 0 }));
        setError(null);
      } catch (loadError) {
        if (loadError instanceof ApiError) {
          setError(loadError.message);
        } else {
          setError('Failed to load chat history');
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [content, isAdmin, page.current, page.pageSize, projectId, reloadToken, senderType]);

  const handleFilterSubmit = (event: FormEvent) => {
    event.preventDefault();
    setPage((prev) => ({ ...prev, current: 1 }));
    setReloadToken((token) => token + 1);
  };

  const handleDelete = async (item: ChatHistoryVO) => {
    const confirmed = window.confirm(`Delete chat message #${item.id}?`);
    if (!confirmed) {
      return;
    }
    try {
      await adminDeleteChatHistory(item.id);
      setReloadToken((token) => token + 1);
    } catch (deleteError) {
      if (deleteError instanceof ApiError) {
        setError(deleteError.message);
      } else {
        setError('Failed to delete message');
      }
    }
  };

  const truncate = (text: string, maxLen = 100) => {
    if (text.length <= maxLen) {
      return text;
    }
    return text.slice(0, maxLen) + '...';
  };

  if (!loginUser) {
    return <section className="panel status loading">Please login first.</section>;
  }

  if (!isAdmin) {
    return <section className="panel status error">Admin role required.</section>;
  }

  return (
    <section className="panel admin-page">
      <h1>Chat History Administration</h1>
      <p className="panel-subtitle">View and manage conversation history across all apps.</p>

      <form className="admin-filter-form" onSubmit={handleFilterSubmit}>
        <input placeholder="App ID" value={projectId} onChange={(event) => setProjectId(event.target.value)} />

        <select
          value={senderType}
          onChange={(event) => setSenderType(event.target.value as '' | 'USER' | 'ASSISTANT')}
        >
          <option value="">All Senders</option>
          <option value="USER">USER</option>
          <option value="ASSISTANT">ASSISTANT</option>
        </select>

        <input placeholder="Content keyword" value={content} onChange={(event) => setContent(event.target.value)} />

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
              <th>App ID</th>
              <th>Sender</th>
              <th>Content</th>
              <th>Status</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}>Loading...</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7}>No data</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.projectId}</td>
                  <td>{item.senderType}</td>
                  <td title={item.content}>{truncate(item.content)}</td>
                  <td>{item.messageStatus}</td>
                  <td>{new Date(item.createdAt).toLocaleString()}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() => navigate(`/app/chat/${item.projectId}?view=1`)}
                      >
                        View App
                      </button>
                      <button
                        type="button"
                        className="ghost-btn danger-btn"
                        onClick={() => void handleDelete(item)}
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
  );
}

export default AdminChatHistoryPage;
