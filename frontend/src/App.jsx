import { useEffect, useMemo, useState } from "react";
import {
  accessCapsule,
  createCapsule,
  getCapsule,
  listCapsules,
  login,
  register,
  setAuthToken,
  shareCapsule,
  triggerCapsule,
  uploadAttachment
} from "./services/api.js";
import { decryptText, encryptFile, encryptText } from "./utils/crypto.js";

const defaultForm = {
  title: "",
  message: "",
  unlockAt: "",
  triggerType: "date",
  recipients: "",
  passphrase: ""
};

export default function App() {
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [token, setToken] = useState(localStorage.getItem("dtc_token") || "");
  const [capsules, setCapsules] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [selectedCapsule, setSelectedCapsule] = useState(null);
  const [shareOutput, setShareOutput] = useState([]);
  const [accessForm, setAccessForm] = useState({ accessId: "", accessSecret: "", passphrase: "" });
  const [accessResult, setAccessResult] = useState(null);

  const isAuthed = useMemo(() => Boolean(token), [token]);

  useEffect(() => {
    if (token) {
      setAuthToken(token);
      refreshCapsules();
    }
  }, [token]);

  async function refreshCapsules() {
    try {
      const data = await listCapsules();
      setCapsules(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      const handler = authMode === "login" ? login : register;
      const data = await handler(authForm);
      setToken(data.token);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateCapsule(event) {
    event.preventDefault();
    setError("");
    setStatus("");
    setShareOutput([]);

    if (!form.passphrase) {
      setError("Passphrase required for encryption");
      return;
    }

    try {
      const encrypted = await encryptText(form.message || "", form.passphrase);
      const payload = {
        title: form.title,
        message: "Encrypted message",
        encryptedPayload: encrypted.ciphertext,
        payloadMeta: encrypted.meta,
        triggerType: form.triggerType,
        unlockAt: form.unlockAt,
        recipients: form.recipients
          ? form.recipients.split(",").map((email) => email.trim()).filter(Boolean)
          : []
      };

      const created = await createCapsule(payload);
      setStatus(`Capsule created (${created.capsuleId})`);
      await refreshCapsules();

      if (file) {
        const encryptedFile = await encryptFile(file, form.passphrase);
        const encryptedBlob = new File([encryptedFile.encryptedBlob], `${file.name}.enc`, {
          type: "application/octet-stream"
        });
        await uploadAttachment(created.capsuleId, encryptedBlob);
      }

      if (created.accessTokens?.length) {
        setShareOutput(created.accessTokens);
      }

      setForm(defaultForm);
      setFile(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSelectCapsule(id) {
    setError("");
    try {
      const data = await getCapsule(id);
      setSelectedCapsule(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleShareCapsule() {
    if (!selectedCapsule) return;
    setError("");
    try {
      const recipients = form.recipients
        ? form.recipients.split(",").map((email) => email.trim()).filter(Boolean)
        : [];
      if (!recipients.length) {
        setError("Provide recipient emails to share");
        return;
      }
      const data = await shareCapsule(selectedCapsule._id, recipients);
      setShareOutput(data.accessTokens || []);
      await refreshCapsules();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleTriggerCapsule() {
    if (!selectedCapsule) return;
    setError("");
    try {
      await triggerCapsule(selectedCapsule._id);
      await refreshCapsules();
      setStatus("Capsule released");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAccessCapsule(event) {
    event.preventDefault();
    setError("");
    try {
      const data = await accessCapsule(accessForm.accessId, accessForm.accessSecret);
      const decrypted = await decryptText(
        data.capsule.encryptedPayload,
        data.capsule.payloadMeta,
        accessForm.passphrase
      );
      setAccessResult({ ...data.capsule, decrypted });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="kicker">Future Message Locker</p>
          <h1>Digital Time Capsule</h1>
          <p className="subtitle">
            Seal memories and messages with client-side AES-256 encryption. Unlock on a
            future date or triggered event with complete end-to-end privacy.
          </p>
        </div>
        <div className="hero-card">
          <div>
            <span className="label">Status</span>
            <p>{isAuthed ? "Authenticated" : "Guest"}</p>
          </div>
          <div>
            <span className="label">Storage</span>
            <p>Encrypted payloads + secure sharing</p>
          </div>
          <div>
            <span className="label">Scheduler</span>
            <p>Automated unlock via cron</p>
          </div>
        </div>
      </header>

      <main className="grid layout">
        <section className="panel access">
          <h2>Access</h2>
          <div className="toggle">
            <button
              className={authMode === "login" ? "active" : ""}
              type="button"
              onClick={() => setAuthMode("login")}
            >
              Login
            </button>
            <button
              className={authMode === "register" ? "active" : ""}
              type="button"
              onClick={() => setAuthMode("register")}
            >
              Register
            </button>
          </div>
          <form className="form" onSubmit={handleAuthSubmit}>
            <label>
              Email
              <input
                type="email"
                value={authForm.email}
                onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={authForm.password}
                onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                required
              />
            </label>
            <button className="primary" type="submit">
              {authMode === "login" ? "Login" : "Create account"}
            </button>
          </form>
          {isAuthed && (
            <button
              className="secondary"
              type="button"
              onClick={() => {
                setToken("");
                setAuthToken("");
              }}
            >
              Log out
            </button>
          )}
        </section>

        <section className="panel create">
          <h2>Create Capsule</h2>
          <form className="form form-two-col" onSubmit={handleCreateCapsule}>
            <label>
              Title
              <input
                type="text"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                required
              />
            </label>
            <label className="span-2">
              Message (encrypted locally)
              <textarea
                rows="4"
                value={form.message}
                onChange={(event) => setForm({ ...form, message: event.target.value })}
              />
            </label>
            <label>
              Passphrase
              <input
                type="password"
                value={form.passphrase}
                onChange={(event) => setForm({ ...form, passphrase: event.target.value })}
                required
              />
            </label>
            <label>
              Unlock type
              <select
                value={form.triggerType}
                onChange={(event) => setForm({ ...form, triggerType: event.target.value })}
              >
                <option value="date">Scheduled date</option>
                <option value="event">Event trigger</option>
              </select>
            </label>
            {form.triggerType === "date" && (
              <label className="span-2">
                Unlock at
                <input
                  type="datetime-local"
                  value={form.unlockAt}
                  onChange={(event) => setForm({ ...form, unlockAt: event.target.value })}
                />
              </label>
            )}
            <label className="span-2">
              Recipients (comma-separated)
              <input
                type="text"
                value={form.recipients}
                onChange={(event) => setForm({ ...form, recipients: event.target.value })}
              />
            </label>
            <label className="span-2">
              Attachment (encrypted locally)
              <input
                type="file"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
            </label>
            <button className="primary span-2" type="submit" disabled={!isAuthed}>
              Create capsule
            </button>
            {!isAuthed && <p className="hint span-2">Login required to create capsules.</p>}
          </form>
        </section>

        <section className="panel recipient">
          <h2>Recipient Access</h2>
          <form className="form" onSubmit={handleAccessCapsule}>
            <label>
              Access ID
              <input
                type="text"
                value={accessForm.accessId}
                onChange={(event) => setAccessForm({ ...accessForm, accessId: event.target.value })}
                required
              />
            </label>
            <label>
              Access Secret
              <input
                type="password"
                value={accessForm.accessSecret}
                onChange={(event) =>
                  setAccessForm({ ...accessForm, accessSecret: event.target.value })
                }
                required
              />
            </label>
            <label>
              Passphrase
              <input
                type="password"
                value={accessForm.passphrase}
                onChange={(event) => setAccessForm({ ...accessForm, passphrase: event.target.value })}
                required
              />
            </label>
            <button className="primary" type="submit">
              Open capsule
            </button>
          </form>
          {accessResult && (
            <div className="result">
              <h3>{accessResult.title}</h3>
              <p>{accessResult.decrypted}</p>
            </div>
          )}
        </section>

        <section className="panel capsules">
          <h2>Your Capsules</h2>
          <div className="capsule-list">
            {capsules.map((capsule) => (
              <button
                key={capsule._id}
                type="button"
                onClick={() => handleSelectCapsule(capsule._id)}
                className={selectedCapsule?._id === capsule._id ? "capsule active" : "capsule"}
              >
                <div>
                  <h3>{capsule.title}</h3>
                  <p>{capsule.triggerType === "date" ? "Scheduled" : "Event"}</p>
                </div>
                <span className={`status ${capsule.status}`}>{capsule.status}</span>
              </button>
            ))}
            {!capsules.length && <p className="hint">No capsules yet.</p>}
          </div>
          {selectedCapsule && (
            <div className="capsule-actions">
              <button className="secondary" type="button" onClick={handleShareCapsule}>
                Share capsule
              </button>
              {selectedCapsule.triggerType === "event" && (
                <button className="primary" type="button" onClick={handleTriggerCapsule}>
                  Trigger release
                </button>
              )}
            </div>
          )}
        </section>
        <aside className="panel output">
          <h2>Share Tokens</h2>
          {shareOutput.length === 0 && <p className="hint">No share tokens generated.</p>}
          {shareOutput.map((token) => (
            <div key={token.accessId} className="token">
              <p>{token.email}</p>
              <code>{token.accessId}</code>
              <code>{token.accessSecret}</code>
            </div>
          ))}
        </aside>
      </main>

      {status && <div className="toast">{status}</div>}
      {error && <div className="toast error">{error}</div>}
    </div>
  );
}
