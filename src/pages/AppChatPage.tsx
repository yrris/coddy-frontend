import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getDeployUrl, getStaticPreviewUrl } from '../config/env';
import { useAuth } from '../context/AuthContext';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { deleteAppById, deployApp, getAppVoById, streamAppChatToGenCode } from '../lib/api';
import { ApiError } from '../lib/http';
import type { AppVO } from '../types/app';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  loading?: boolean;
};

function AppChatPage() {
  const navigate = useNavigate();
  const { appId = '' } = useParams();
  const [searchParams] = useSearchParams();

  const { loginUser } = useAuth();

  const [app, setApp] = useState<AppVO | null>(null);
  const [loadingApp, setLoadingApp] = useState(true);
  const [appError, setAppError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  const [showInfo, setShowInfo] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(Date.now());
  const [deployUrl, setDeployUrl] = useState<string | null>(null);

  const streamCloserRef = useRef<(() => void) | null>(null);
  const autoStartedRef = useRef(false);

  const isViewMode = searchParams.get('view') === '1';
  const isOwner = !!(loginUser && app && String(loginUser.id) === String(app.userId));
  const isAdmin = loginUser?.userRole === 'ADMIN';
  const canManage = isOwner || isAdmin;
  const canChat = isOwner;

  const previewUrl = useMemo(() => {
    if (!app) {
      return '';
    }
    const previewKey = app.previewKey || `${app.codeGenType.toLowerCase()}_${appId}`;
    return `${getStaticPreviewUrl(previewKey)}?t=${previewVersion}`;
  }, [app, appId, previewVersion]);

  const fetchAppInfo = useCallback(async () => {
    if (!appId) {
      return;
    }
    try {
      setLoadingApp(true);
      const response = await getAppVoById(appId);
      setApp(response.data);
      setAppError(null);
      if (response.data.deployKey) {
        setDeployUrl(getDeployUrl(response.data.deployKey));
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setAppError(error.message);
      } else {
        setAppError('Failed to load app');
      }
    } finally {
      setLoadingApp(false);
    }
  }, [appId]);

  useEffect(() => {
    void fetchAppInfo();
  }, [fetchAppInfo]);

  useEffect(() => {
    return () => {
      streamCloserRef.current?.();
    };
  }, []);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!appId || !message.trim()) {
        return;
      }
      if (!loginUser) {
        navigate('/login');
        return;
      }
      if (!canChat) {
        setStreamError("You cannot chat inside another user's app.");
        return;
      }
      if (isGenerating) {
        return;
      }

      const userMessage = message.trim();
      const userMessageId = `u_${Date.now()}`;
      const aiMessageId = `a_${Date.now()}`;

      setMessages((prev) => [
        ...prev,
        { id: userMessageId, role: 'user', content: userMessage },
        { id: aiMessageId, role: 'assistant', content: '', loading: true }
      ]);

      setInputMessage('');
      setIsGenerating(true);
      setStreamError(null);

      streamCloserRef.current?.();
      streamCloserRef.current = streamAppChatToGenCode(appId, userMessage, {
        onChunk: (chunk) => {
          setMessages((prev) =>
            prev.map((item) =>
              item.id === aiMessageId
                ? {
                    ...item,
                    content: `${item.content}${chunk}`,
                    loading: false
                  }
                : item
            )
          );
        },
        onDone: () => {
          setIsGenerating(false);
          setMessages((prev) => prev.map((item) => (item.id === aiMessageId ? { ...item, loading: false } : item)));
          setPreviewVersion(Date.now());
          void fetchAppInfo();
        },
        onError: (messageText) => {
          setIsGenerating(false);
          setStreamError(messageText);
          setMessages((prev) =>
            prev.map((item) =>
              item.id === aiMessageId
                ? {
                    ...item,
                    loading: false,
                    content: item.content || 'Generation failed, please retry.'
                  }
                : item
            )
          );
        }
      });
    },
    [appId, canChat, fetchAppInfo, isGenerating, loginUser, navigate]
  );

  useEffect(() => {
    if (!app || !canChat || isViewMode || autoStartedRef.current) {
      return;
    }
    if (!app.initPrompt) {
      return;
    }

    autoStartedRef.current = true;
    void sendMessage(app.initPrompt);
  }, [app, canChat, isViewMode, sendMessage]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await sendMessage(inputMessage);
  };

  const handleDeploy = async () => {
    if (!app) {
      return;
    }
    if (!loginUser) {
      navigate('/login');
      return;
    }

    try {
      const response = await deployApp({ appId: app.id });
      setDeployUrl(response.data);
      window.open(response.data, '_blank');
      await fetchAppInfo();
    } catch (error) {
      if (error instanceof ApiError) {
        setStreamError(error.message);
      } else {
        setStreamError('Failed to deploy app');
      }
    }
  };

  const handleDelete = async () => {
    if (!app || !canManage) {
      return;
    }
    const shouldDelete = window.confirm('Delete this app?');
    if (!shouldDelete) {
      return;
    }

    try {
      await deleteAppById(app.id);
      navigate('/');
    } catch (error) {
      if (error instanceof ApiError) {
        setStreamError(error.message);
      } else {
        setStreamError('Failed to delete app');
      }
    }
  };

  if (loadingApp) {
    return <section className="panel">Loading app...</section>;
  }

  if (appError || !app) {
    return <section className="panel status error">{appError || 'App not found'}</section>;
  }

  return (
    <div className="chat-page">
      <section className="panel chat-topbar">
        <div>
          <h1>{app.appName}</h1>
          <p className="panel-subtitle">{app.codeGenType}</p>
        </div>
        <div className="chat-topbar-actions">
          <button type="button" className="ghost-btn" onClick={() => setShowInfo(true)}>
            App Details
          </button>
          <button type="button" className="primary-btn" onClick={() => void handleDeploy()} disabled={!isOwner}>
            Deploy
          </button>
          {deployUrl ? (
            <button type="button" className="ghost-btn" onClick={() => window.open(deployUrl, '_blank')}>
              Open Site
            </button>
          ) : null}
        </div>
      </section>

      <section className="chat-layout">
        <div className="panel chat-panel">
          <div className="chat-messages" id="chatMessages">
            {messages.length === 0 ? <p className="panel-subtitle">No conversation yet.</p> : null}
            {messages.map((message) => (
              <div key={message.id} className={`chat-message chat-message-${message.role}`}>
                <div className="chat-bubble">
                  {message.role === 'assistant' && message.content ? (
                    <MarkdownRenderer content={message.content} />
                  ) : (
                    message.content || (message.loading ? 'Generating...' : '')
                  )}
                </div>
              </div>
            ))}
          </div>

          <form className="chat-input-row" onSubmit={handleSubmit}>
            <input
              className="chat-input"
              value={inputMessage}
              onChange={(event) => setInputMessage(event.target.value)}
              placeholder={
                canChat
                  ? 'Please describe the website you want to generate'
                  : "You cannot chat inside another user's app."
              }
              disabled={!canChat || isGenerating}
              title={!canChat ? "You cannot chat inside another user's app." : undefined}
            />
            <button className="primary-btn" type="submit" disabled={!canChat || isGenerating || !inputMessage.trim()}>
              {isGenerating ? 'Generating...' : 'Send'}
            </button>
          </form>

          {streamError ? <p className="status error">{streamError}</p> : null}
        </div>

        <div className="panel preview-panel">
          <div className="preview-panel-header">
            <h2>Preview</h2>
            <div className="preview-panel-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => window.open(previewUrl, '_blank')}
                title="Open in new window"
              >
                Open in new window
              </button>
              <button type="button" className="ghost-btn" disabled title="Edit mode (coming soon)">
                Edit mode
              </button>
            </div>
          </div>
          <iframe title="App Preview" className="preview-frame" src={previewUrl} sandbox="allow-scripts allow-same-origin allow-popups" />
        </div>
      </section>

      {showInfo ? (
        <div className="modal-mask" onClick={() => setShowInfo(false)}>
          <section className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>App Details</h3>
            <div className="modal-info-grid">
              <span>Creator</span>
              <span>{app.user?.displayName || 'Unknown'}</span>
              <span>Created At</span>
              <span>{new Date(app.createTime).toLocaleString()}</span>
              <span>Priority</span>
              <span>{app.priority}</span>
            </div>

            {canManage ? (
              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={() => navigate(`/app/edit/${app.id}`)}>
                  Edit
                </button>
                <button type="button" className="ghost-btn danger-btn" onClick={() => void handleDelete()}>
                  Delete
                </button>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}

export default AppChatPage;
