import { useMemo, useState } from "react";
import BackendStatusCard from "../components/BackendStatusCard";
import env from "../config/env";
import { useAuth } from "../context/AuthContext";
import { generateCode, streamGenerateCode } from "../lib/api";
import { ApiError } from "../lib/http";
import type { AiCodeGenerateResponse, CodeGenType } from "../types/codegen";

const stackItems = [
  "Java 21 + Spring Boot 3",
  "PostgreSQL + Redis",
  "Parser Strategy + Saver Template + Facade",
  "React 19 + TypeScript + Vite + SSE Stream",
];

const generationModes: Array<{ label: string; value: CodeGenType }> = [
  { label: "Single HTML", value: "HTML_SINGLE" },
  { label: "Multi HTML", value: "HTML_MULTI" },
];

const defaultPrompt =
  "Build a modern startup landing page with hero section, feature cards, pricing, and FAQ in a dark technology style.";

function HomePage() {
  const { loginUser } = useAuth();

  const [prompt, setPrompt] = useState(defaultPrompt);
  const [mode, setMode] = useState<CodeGenType>("HTML_SINGLE");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [streamBuffer, setStreamBuffer] = useState("");
  const [result, setResult] = useState<AiCodeGenerateResponse | null>(null);
  const [activeFile, setActiveFile] = useState("index.html");

  const sortedFiles = useMemo(() => {
    if (!result) {
      return [];
    }
    return Object.keys(result.files);
  }, [result]);

  const activeFileContent = useMemo(() => {
    if (!result || !activeFile) {
      return "";
    }
    return result.files[activeFile] ?? "";
  }, [result, activeFile]);

  const previewHtml = useMemo(() => {
    if (!result) {
      return "";
    }

    const html = result.files["index.html"] ?? "";
    if (result.codeGenType === "HTML_SINGLE") {
      return html;
    }

    const css = result.files["style.css"] ?? "";
    const js = result.files["script.js"] ?? "";
    return injectAssetsForPreview(html, css, js);
  }, [result]);

  const resetStatus = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleGenerate = async () => {
    if (!loginUser) {
      setErrorMessage("Please login first before generating code.");
      return;
    }

    resetStatus();
    setIsGenerating(true);
    setStreamBuffer("");

    try {
      const response = await generateCode({
        prompt,
        codeGenType: mode,
      });
      setResult(response.data);
      setActiveFile("index.html");
      setSuccessMessage("Code generation completed.");
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Code generation failed.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStreamGenerate = async () => {
    if (!loginUser) {
      setErrorMessage("Please login first before generating code.");
      return;
    }

    resetStatus();
    setIsStreaming(true);
    setStreamBuffer("");
    setResult(null);

    try {
      await streamGenerateCode(
        {
          prompt,
          codeGenType: mode,
        },
        {
          onChunk: (chunk) => {
            setStreamBuffer((previous) => previous + chunk);
          },
          onResult: (streamResult) => {
            setResult(streamResult);
            setActiveFile("index.html");
          },
          onError: (errorMessage) => {
            setErrorMessage(errorMessage);
          },
          onDone: () => {
            setSuccessMessage("Stream generation completed.");
          },
        },
      );
      setSuccessMessage("Stream generation completed.");
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Stream generation failed.");
      }
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="generator-page">
      <div className="page-grid">
        <section className="hero panel">
          <span className="eyebrow">AI Website Generator</span>
          <h1>Coddy</h1>
          <p className="env-label">
            Runtime env: <strong>{env.appEnv}</strong>
          </p>

          <ul className="stack-list">
            {stackItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <BackendStatusCard />
      </div>

      <section className="panel generator-workbench">
        <div className="generator-header">
          <div>
            <h2>Generate Website Code</h2>
            <p className="panel-subtitle">
              {loginUser
                ? `Logged in as ${loginUser.displayName} (${loginUser.email})`
                : "Please login in the Auth page to use code generation."}
            </p>
          </div>
          <span className="generator-badge">P3</span>
        </div>

        <div className="mode-switch generator-mode-switch">
          {generationModes.map((modeItem) => (
            <button
              key={modeItem.value}
              type="button"
              className={mode === modeItem.value ? "primary-btn" : "ghost-btn"}
              onClick={() => setMode(modeItem.value)}
              disabled={isGenerating || isStreaming}
            >
              {modeItem.label}
            </button>
          ))}
        </div>

        <label className="prompt-label" htmlFor="promptInput">
          Prompt
        </label>
        <textarea
          id="promptInput"
          className="prompt-textarea"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={7}
          placeholder="Describe the website you want to generate"
          disabled={isGenerating || isStreaming}
        />

        <div className="generator-actions">
          <button
            className="primary-btn"
            type="button"
            onClick={() => void handleGenerate()}
            disabled={isGenerating || isStreaming}
          >
            {isGenerating ? "Generating..." : "Generate"}
          </button>
          <button
            className="ghost-btn"
            type="button"
            onClick={() => void handleStreamGenerate()}
            disabled={isGenerating || isStreaming}
          >
            {isStreaming ? "Streaming..." : "Stream Generate"}
          </button>
        </div>

        {errorMessage ? <p className="status error">{errorMessage}</p> : null}
        {successMessage ? (
          <p className="status success">{successMessage}</p>
        ) : null}

        <div className="stream-panel">
          <div className="stream-panel-header">Live Stream Output</div>
          <pre className="stream-panel-content">
            {streamBuffer || "Waiting for stream output..."}
          </pre>
        </div>

        {result ? (
          <div className="result-grid">
            <div className="result-files panel">
              <h3>Generated Files</h3>
              <div className="file-tabs">
                {sortedFiles.map((fileName) => (
                  <button
                    key={fileName}
                    type="button"
                    className={
                      activeFile === fileName ? "primary-btn" : "ghost-btn"
                    }
                    onClick={() => setActiveFile(fileName)}
                  >
                    {fileName}
                  </button>
                ))}
              </div>
              <pre className="file-content">{activeFileContent}</pre>
              <p className="panel-subtitle">
                Saved to <code>{result.outputDir}</code>
              </p>
            </div>

            <div className="result-preview panel">
              <h3>Preview</h3>
              <iframe
                title="Generated website preview"
                className="preview-frame"
                srcDoc={previewHtml}
                sandbox="allow-scripts"
              />
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function injectAssetsForPreview(html: string, css: string, js: string) {
  let merged = html;
  merged = merged.replace(/<link[^>]*href=["']style\.css["'][^>]*>/i, "");
  merged = merged.replace(
    /<script[^>]*src=["']script\.js["'][^>]*><\/script>/i,
    "",
  );

  if (css.trim()) {
    const styleTag = `<style>\n${css}\n</style>`;
    if (/<\/head>/i.test(merged)) {
      merged = merged.replace(/<\/head>/i, `${styleTag}\n</head>`);
    } else {
      merged = `${styleTag}\n${merged}`;
    }
  }

  if (js.trim()) {
    const scriptTag = `<script>\n${js}\n<\/script>`;
    if (/<\/body>/i.test(merged)) {
      merged = merged.replace(/<\/body>/i, `${scriptTag}\n</body>`);
    } else {
      merged = `${merged}\n${scriptTag}`;
    }
  }

  return merged;
}

export default HomePage;
