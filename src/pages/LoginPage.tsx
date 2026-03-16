import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import env from "../config/env";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/http";

type AuthMode = "login" | "register";

function LoginPage() {
  const { loginUser, login, register, logout, refresh, googleLogin } =
    useAuth();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checkPassword, setCheckPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const oauthMessage = useMemo(() => {
    const oauthStatus = searchParams.get("oauth");
    const message = searchParams.get("message");
    if (!oauthStatus) {
      return null;
    }
    if (oauthStatus === "success") {
      return "Google login success";
    }
    return message ? decodeURIComponent(message) : "Google login failed";
  }, [searchParams]);

  const resetMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    resetMessages();
    setSubmitting(true);

    try {
      if (mode === "register") {
        await register({
          email,
          password,
          checkPassword,
          displayName: displayName || undefined,
        });
        setSuccessMessage("Register success, please login.");
        setMode("login");
      } else {
        await login({ email, password });
        setSuccessMessage("Login success.");
      }
      await refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Operation failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="panel auth-panel">
      <h1>User Auth</h1>

      {oauthMessage ? <p className="status loading">{oauthMessage}</p> : null}
      {errorMessage ? <p className="status error">{errorMessage}</p> : null}
      {successMessage ? (
        <p className="status success">{successMessage}</p>
      ) : null}

      {loginUser ? (
        <div className="status success">
          <div className="user-info-card">
            <div className="info-row">
              <span className="info-label">User</span>
              <span className="info-value">{loginUser.displayName}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Email</span>
              <span className="info-value">{loginUser.email}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Role</span>
              <span className="info-value">{loginUser.userRole}</span>
            </div>
          </div>
          <div className="auth-actions">
            <button
              className="primary-btn"
              type="button"
              onClick={() => void refresh()}
            >
              Refresh
            </button>
            <button
              className="ghost-btn"
              type="button"
              onClick={() => void logout()}
            >
              Logout
            </button>
          </div>
        </div>
      ) : null}

      <div className="mode-switch">
        <button
          type="button"
          className={mode === "login" ? "primary-btn" : "ghost-btn"}
          onClick={() => {
            setMode("login");
            resetMessages();
          }}
        >
          Login
        </button>
        <button
          type="button"
          className={mode === "register" ? "primary-btn" : "ghost-btn"}
          onClick={() => {
            setMode("register");
            resetMessages();
          }}
        >
          Register
        </button>
      </div>

      <form className="auth-form" onSubmit={onSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 chars"
            required
            minLength={8}
          />
        </label>

        {mode === "register" ? (
          <>
            <label>
              Confirm Password
              <input
                type="password"
                value={checkPassword}
                onChange={(event) => setCheckPassword(event.target.value)}
                placeholder="Repeat password"
                required
                minLength={8}
              />
            </label>

            <label>
              Display Name
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Optional"
              />
            </label>
          </>
        ) : null}

        <button className="primary-btn" type="submit" disabled={submitting}>
          {submitting
            ? "Submitting..."
            : mode === "login"
              ? "Login"
              : "Register"}
        </button>
      </form>

      <div className="auth-divider">or</div>

      <button
        className="google-btn"
        type="button"
        onClick={googleLogin}
        // disabled={!env.googleAuthEnabled}
      >
        {env.googleAuthEnabled
          ? "Continue with Google"
          : "Google login disabled"}
      </button>
    </section>
  );
}

export default LoginPage;
