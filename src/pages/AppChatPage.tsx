import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getDeployUrl, getStaticPreviewUrl } from "../config/env";
import { useAuth } from "../context/AuthContext";
import MarkdownRenderer from "../components/MarkdownRenderer";
import {
  deleteAppById,
  deployApp,
  fetchChatHistory,
  generateScreenshot,
  getAppVoById,
  getDownloadUrl,
  publishApp,
  streamAppChatToGenCode,
  unpublishApp,
} from "../lib/api";
import { ApiError } from "../lib/http";
import { VisualEditor, type ElementInfo } from "../lib/visualEditor";
import type { AppVO, ChatHistoryVO, StreamMessage } from "../types/app";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
};

function mapHistoryToMessages(history: ChatHistoryVO[]): ChatMessage[] {
  return history.map((h) => ({
    id: `db_${h.id}`,
    role: h.senderType === "USER" ? ("user" as const) : ("assistant" as const),
    content: h.content,
    loading: false,
  }));
}

function AppChatPage() {
  const navigate = useNavigate();
  const { appId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const { loginUser } = useAuth();

  const [app, setApp] = useState<AppVO | null>(null);
  const [loadingApp, setLoadingApp] = useState(true);
  const [appError, setAppError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  const [showInfo, setShowInfo] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(Date.now());
  const [deployUrl, setDeployUrl] = useState<string | null>(null);

  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const streamCloserRef = useRef<(() => void) | null>(null);
  const autoStartedRef = useRef(false);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const visualEditorRef = useRef<VisualEditor | null>(null);
  const selectedElementRef = useRef<ElementInfo | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<ElementInfo | null>(
    null,
  );

  // const isViewMode = searchParams.get('view') === '1';
  const shouldAutoStart = searchParams.get("autoStart") === "1";
  const isOwner = !!(
    loginUser &&
    app &&
    String(loginUser.id) === String(app.userId)
  );
  const isAdmin = loginUser?.userRole === "ADMIN";
  const canManage = isOwner || isAdmin;
  const canChat = isOwner;

  const previewUrl = useMemo(() => {
    if (!app) {
      return "";
    }
    const previewKey =
      app.previewKey || `${app.codeGenType.toLowerCase()}_${appId}`;
    const base = getStaticPreviewUrl(previewKey);
    // React projects serve from dist/ after build
    if (app.codeGenType === "REACT_VITE") {
      return `${base}dist/index.html?t=${previewVersion}`;
    }
    return `${base}?t=${previewVersion}`;
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
        setAppError("Failed to load app");
      }
    } finally {
      setLoadingApp(false);
    }
  }, [appId]);

  // Load chat history on mount — returns the loaded messages count
  const loadHistory = useCallback(async (): Promise<number> => {
    if (!appId) {
      return 0;
    }
    try {
      const response = await fetchChatHistory(appId);
      const historyMessages = mapHistoryToMessages(response.data);
      // API returns newest first, reverse to show oldest at top
      historyMessages.reverse();
      // Use functional update to avoid wiping any in-flight messages
      setMessages((prev) => (prev.length > 0 ? prev : historyMessages));
      setHasMoreHistory(response.data.length >= 20);
      setHistoryLoaded(true);

      // Scroll to bottom after loading history
      if (historyMessages.length > 0) {
        setTimeout(() => {
          chatMessagesRef.current?.scrollTo({
            top: chatMessagesRef.current.scrollHeight,
          });
        }, 50);
      }
      return historyMessages.length;
    } catch {
      // If history fetch fails, still allow chatting
      setHistoryLoaded(true);
      return 0;
    }
  }, [appId]);

  useEffect(() => {
    void fetchAppInfo();
  }, [fetchAppInfo]);

  // Load history after app info is loaded
  useEffect(() => {
    if (app && !historyLoaded) {
      void loadHistory();
    }
  }, [app, historyLoaded, loadHistory]);

  useEffect(() => {
    return () => {
      streamCloserRef.current?.();
    };
  }, []);

  // Initialize VisualEditor
  useEffect(() => {
    const editor = new VisualEditor();
    editor.on("elementSelected", (info) => {
      setSelectedElement(info);
    });
    visualEditorRef.current = editor;
    // Eagerly attach if iframe already rendered
    if (iframeRef.current) {
      editor.attach(iframeRef.current);
    }
    return () => {
      editor.detach();
      visualEditorRef.current = null;
    };
  }, []);

  // Keep selectedElementRef in sync to avoid sendMessage dependency churn
  useEffect(() => {
    selectedElementRef.current = selectedElement;
  }, [selectedElement]);

  const loadMoreHistory = useCallback(async () => {
    if (!appId || loadingHistory || !hasMoreHistory || messages.length === 0) {
      return;
    }

    // Find the smallest database id in current messages
    const dbMessages = messages.filter((m) => m.id.startsWith("db_"));
    if (dbMessages.length === 0) {
      return;
    }
    const smallestId = Math.min(
      ...dbMessages.map((m) => Number(m.id.replace("db_", ""))),
    );

    try {
      setLoadingHistory(true);
      const prevScrollHeight = chatMessagesRef.current?.scrollHeight ?? 0;
      const response = await fetchChatHistory(appId, smallestId);
      const olderMessages = mapHistoryToMessages(response.data);
      olderMessages.reverse();
      setMessages((prev) => [...olderMessages, ...prev]);
      setHasMoreHistory(response.data.length >= 20);

      // Maintain scroll position after prepending older messages
      setTimeout(() => {
        if (chatMessagesRef.current) {
          const newScrollHeight = chatMessagesRef.current.scrollHeight;
          chatMessagesRef.current.scrollTop =
            newScrollHeight - prevScrollHeight;
        }
      }, 50);
    } catch {
      // Silently fail
    } finally {
      setLoadingHistory(false);
    }
  }, [appId, hasMoreHistory, loadingHistory, messages]);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!appId || !message.trim()) {
        return;
      }
      if (!loginUser) {
        navigate("/login");
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

      // Build enriched message with element context if an element is selected
      let apiMessage = userMessage;
      const elemInfo = selectedElementRef.current;
      if (elemInfo) {
        const ctx = [
          "[Visual Edit Target]",
          `Tag: <${elemInfo.tagName.toLowerCase()}>`,
          elemInfo.id ? `ID: #${elemInfo.id}` : null,
          elemInfo.className
            ? `Class: .${elemInfo.className.split(" ").join(".")}`
            : null,
          elemInfo.textContent ? `Text: "${elemInfo.textContent}"` : null,
          `Selector: ${elemInfo.selector}`,
          `Page: ${elemInfo.pagePath}`,
        ]
          .filter(Boolean)
          .join("\n");
        apiMessage = `${ctx}\n\nUser request: ${userMessage}`;
      }

      setMessages((prev) => [
        ...prev,
        { id: userMessageId, role: "user", content: userMessage },
        { id: aiMessageId, role: "assistant", content: "", loading: true },
      ]);

      setInputMessage("");
      setIsGenerating(true);
      setStreamError(null);

      // Auto-scroll to bottom
      setTimeout(() => {
        chatMessagesRef.current?.scrollTo({
          top: chatMessagesRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 50);

      streamCloserRef.current?.();
      const isReactVite = app?.codeGenType === "REACT_VITE";

      streamCloserRef.current = streamAppChatToGenCode(appId, apiMessage, {
        onChunk: (chunk) => {
          let textToAppend = chunk;

          if (isReactVite) {
            try {
              const msg = JSON.parse(chunk) as StreamMessage;
              if (msg.type === "AI_RESPONSE") {
                textToAppend = String(msg.data);
              } else if (msg.type === "TOOL_EXECUTED") {
                const toolData = msg.data as {
                  toolName: string;
                  result: string;
                };
                textToAppend = `\n> ${toolData.result}\n`;
              } else {
                // COMPLETE, ERROR — handled by SSE done/error events
                return;
              }
            } catch {
              // Not valid JSON, treat as plain text
            }
          }

          setMessages((prev) =>
            prev.map((item) =>
              item.id === aiMessageId
                ? {
                    ...item,
                    content: `${item.content}${textToAppend}`,
                    loading: false,
                  }
                : item,
            ),
          );
        },
        onDone: () => {
          setIsGenerating(false);
          setSelectedElement(null);
          visualEditorRef.current?.clearSelection();
          setMessages((prev) =>
            prev.map((item) =>
              item.id === aiMessageId ? { ...item, loading: false } : item,
            ),
          );
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
                    content: item.content || "Generation failed, please retry.",
                  }
                : item,
            ),
          );
        },
      });
    },
    [appId, canChat, fetchAppInfo, isGenerating, loginUser, navigate],
  );

  // Auto-start: only when ?autoStart=1 param is present (set by homepage on new app creation)
  useEffect(() => {
    if (!shouldAutoStart || !app || !canChat || autoStartedRef.current) {
      return;
    }
    if (!app.initPrompt) {
      return;
    }
    if (!historyLoaded) {
      return;
    }

    autoStartedRef.current = true;
    // Clear the autoStart param from URL to prevent re-triggering on refresh
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("autoStart");
        return next;
      },
      { replace: true },
    );
    void sendMessage(app.initPrompt);
  }, [
    shouldAutoStart,
    app,
    canChat,
    sendMessage,
    historyLoaded,
    setSearchParams,
  ]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await sendMessage(inputMessage);
  };

  const handleDeploy = async () => {
    if (!app) {
      return;
    }
    if (!loginUser) {
      navigate("/login");
      return;
    }

    try {
      const response = await deployApp({ appId: app.id });
      setDeployUrl(response.data);
      window.open(response.data, "_blank");
      await fetchAppInfo();
    } catch (error) {
      if (error instanceof ApiError) {
        setStreamError(error.message);
      } else {
        setStreamError("Failed to deploy app");
      }
    }
  };

  const handleDelete = async () => {
    if (!app || !canManage) {
      return;
    }
    const shouldDelete = window.confirm("Delete this app?");
    if (!shouldDelete) {
      return;
    }

    try {
      await deleteAppById(app.id);
      navigate("/");
    } catch (error) {
      if (error instanceof ApiError) {
        setStreamError(error.message);
      } else {
        setStreamError("Failed to delete app");
      }
    }
  };

  const handleScreenshot = async () => {
    if (!app) {
      return;
    }
    try {
      await generateScreenshot(app.id);
      await fetchAppInfo();
    } catch (error) {
      if (error instanceof ApiError) {
        setStreamError(error.message);
      } else {
        setStreamError("Failed to take screenshot");
      }
    }
  };

  const handleDownload = () => {
    if (!app) {
      return;
    }
    window.open(getDownloadUrl(app.id), "_blank");
  };

  const handleTogglePublish = async () => {
    if (!app) {
      return;
    }
    try {
      if (app.isPublic) {
        await unpublishApp(app.id);
        setApp((prev) =>
          prev ? { ...prev, isPublic: false, isFeatured: false } : prev,
        );
      } else {
        await publishApp(app.id);
        setApp((prev) => (prev ? { ...prev, isPublic: true } : prev));
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setStreamError(error.message);
      } else {
        setStreamError("Failed to update publish status");
      }
    }
  };

  const toggleEditMode = useCallback(() => {
    const editor = visualEditorRef.current;
    if (!editor) return;
    if (editMode) {
      editor.disable();
      setEditMode(false);
      setSelectedElement(null);
    } else {
      // Ensure iframe is attached before enabling
      if (iframeRef.current) {
        editor.attach(iframeRef.current);
      }
      editor.enable();
      setEditMode(true);
    }
  }, [editMode]);

  if (loadingApp) {
    return <section className="panel">Loading app...</section>;
  }

  if (appError || !app) {
    return (
      <section className="panel status error">
        {appError || "App not found"}
      </section>
    );
  }

  return (
    <div className="chat-page">
      <section className="panel chat-topbar">
        <div>
          <h1>{app.appName}</h1>
          <p className="panel-subtitle">{app.codeGenType}</p>
        </div>
        <div className="chat-topbar-actions">
          <button
            type="button"
            className="ghost-btn"
            onClick={() => setShowInfo(true)}
          >
            App Details
          </button>
          <button
            type="button"
            className="primary-btn"
            onClick={() => void handleDeploy()}
            disabled={!isOwner}
          >
            Deploy
          </button>
          {isOwner ? (
            <button
              type="button"
              className="ghost-btn"
              onClick={() => void handleScreenshot()}
              disabled={!app.deployKey}
              title={
                app.deployKey
                  ? "Capture screenshot as cover image"
                  : "Deploy first to take screenshot"
              }
            >
              Screenshot
            </button>
          ) : null}
          {isOwner ? (
            <button
              type="button"
              className="ghost-btn"
              onClick={() => handleDownload()}
            >
              Download
            </button>
          ) : null}
          {isOwner && app.deployKey ? (
            <button
              type="button"
              className={app.isPublic ? "ghost-btn" : "primary-btn"}
              onClick={() => void handleTogglePublish()}
              title={
                app.isPublic
                  ? "Remove from gallery"
                  : "Publish to gallery for others to see"
              }
            >
              {app.isPublic ? "Unpublish" : "Publish"}
            </button>
          ) : null}
          {deployUrl ? (
            <button
              type="button"
              className="ghost-btn"
              onClick={() => window.open(deployUrl, "_blank")}
            >
              Open Site
            </button>
          ) : null}
        </div>
      </section>

      <section className="chat-layout">
        <div className="panel chat-panel">
          <div
            className="chat-messages"
            id="chatMessages"
            ref={chatMessagesRef}
          >
            {hasMoreHistory ? (
              <button
                type="button"
                className="ghost-btn load-more-btn"
                onClick={() => void loadMoreHistory()}
                disabled={loadingHistory}
              >
                {loadingHistory ? "Loading..." : "Load older messages"}
              </button>
            ) : null}
            {messages.length === 0 && historyLoaded ? (
              <p className="panel-subtitle">No conversation yet.</p>
            ) : null}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chat-message chat-message-${message.role}`}
              >
                <div className="chat-bubble">
                  {message.role === "assistant" && message.content ? (
                    <MarkdownRenderer content={message.content} />
                  ) : (
                    message.content || (message.loading ? "Generating..." : "")
                  )}
                </div>
              </div>
            ))}
          </div>

          {selectedElement && editMode ? (
            <div className="element-info-banner">
              <div className="element-info-content">
                <span className="element-info-tag">
                  &lt;{selectedElement.tagName.toLowerCase()}&gt;
                </span>
                {selectedElement.id ? (
                  <span className="element-info-detail">
                    #{selectedElement.id}
                  </span>
                ) : null}
                {selectedElement.className ? (
                  <span className="element-info-detail">
                    .{selectedElement.className.split(" ")[0]}
                  </span>
                ) : null}
                {selectedElement.textContent ? (
                  <span className="element-info-text">
                    &quot;{selectedElement.textContent}&quot;
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                className="ghost-btn element-info-clear"
                onClick={() => {
                  setSelectedElement(null);
                  visualEditorRef.current?.clearSelection();
                }}
              >
                Clear
              </button>
            </div>
          ) : null}

          <form className="chat-input-row" onSubmit={handleSubmit}>
            <input
              className="chat-input"
              value={inputMessage}
              onChange={(event) => setInputMessage(event.target.value)}
              placeholder={
                canChat
                  ? selectedElement
                    ? `Describe changes for <${selectedElement.tagName.toLowerCase()}>...`
                    : "Please describe the website you want to generate"
                  : "You cannot chat inside another user's app."
              }
              disabled={!canChat || isGenerating}
              title={
                !canChat
                  ? "You cannot chat inside another user's app."
                  : undefined
              }
            />
            <button
              className="primary-btn"
              type="submit"
              disabled={!canChat || isGenerating || !inputMessage.trim()}
            >
              {isGenerating ? "Generating..." : "Send"}
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
                onClick={() => window.open(previewUrl, "_blank")}
                title="Open in new window"
              >
                Open in new window
              </button>
              <button
                type="button"
                className={`ghost-btn${editMode ? " edit-mode-active" : ""}`}
                onClick={toggleEditMode}
                disabled={!canChat}
                title={
                  editMode
                    ? "Exit edit mode"
                    : "Click elements in preview to target AI edits"
                }
              >
                {editMode ? "Exit Edit Mode" : "Edit Mode"}
              </button>
            </div>
          </div>
          <iframe
            ref={iframeRef}
            title="App Preview"
            className="preview-frame"
            src={previewUrl}
            sandbox="allow-scripts allow-same-origin allow-popups"
            onLoad={() => {
              if (iframeRef.current && visualEditorRef.current) {
                visualEditorRef.current.attach(iframeRef.current);
                if (editMode) {
                  visualEditorRef.current.reinject();
                }
              }
            }}
          />
        </div>
      </section>

      {showInfo ? (
        <div className="modal-mask" onClick={() => setShowInfo(false)}>
          <section
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>App Details</h3>
            <div className="modal-info-grid">
              <span>Creator</span>
              <span>{app.user?.displayName || "Unknown"}</span>
              <span>Created At</span>
              <span>{new Date(app.createTime).toLocaleString()}</span>
              <span>Priority</span>
              <span>{app.priority}</span>
            </div>

            {canManage ? (
              <div className="modal-actions">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => navigate(`/app/edit/${app.id}`)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="ghost-btn danger-btn"
                  onClick={() => void handleDelete()}
                >
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
