import { LogOut, Plus, RefreshCw, Users } from "lucide-react";
import type { Child } from "./api";

const avatarTones = ["sage", "lavender", "peach"];

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function ChildPicker({
  children,
  childrenLoaded,
  error,
  profileName,
  age,
  tr,
  onSelect,
  onAddChild,
  onRetry,
  onSignOut,
  onTestPayment,
}: {
  children: Child[];
  childrenLoaded: boolean;
  error: string;
  profileName: string;
  age: (dateOfBirth: string) => string;
  tr: (text: string) => string;
  onSelect: (childId: string) => void;
  onAddChild: () => void;
  onRetry: () => void;
  onSignOut: () => void;
  onTestPayment: () => void;
}) {
  const loading = !childrenLoaded && !error;
  return (
    <section className="child-picker-page" aria-busy={loading}>
      <header className="child-picker-header">
        <div className="child-picker-brand" aria-label="NeuroNest">
          <img src="/brand/neuronest-mark.png" alt="" />
          <span>NeuroNest</span>
        </div>
        <div className="child-picker-account">
          {profileName && <span>{profileName}</span>}
          <button type="button" className="text-button" onClick={onSignOut}>
            {tr("Sign out")}
            <LogOut size={16} aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="child-picker-main" aria-labelledby="child-picker-title">
        <p className="child-picker-kicker">{tr("FAMILY CARE SPACE")}</p>
        <h1 id="child-picker-title">{tr("Choose a child")}</h1>
        <p className="child-picker-description">
          {tr("Choose a profile to continue to their care dashboard.")}
        </p>

        {loading && (
          <div className="child-picker-status" role="status">
            <RefreshCw className="spin" size={22} aria-hidden="true" />
            {tr("Loading child profiles…")}
          </div>
        )}

        {error && (
          <div className="child-picker-status child-picker-error" role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="secondary"
              onClick={onRetry}
              aria-label={tr("Retry")}
            >
              <RefreshCw size={16} aria-hidden="true" />
              {tr("Retry")}
            </button>
          </div>
        )}

        {childrenLoaded && !error && (
          <ul className="child-picker-grid" aria-label={tr("Child profiles")}>
            {children.map((child, index) => (
              <li key={child.id}>
                <button
                  type="button"
                  className="child-picker-card"
                  onClick={() => onSelect(child.id)}
                >
                  <span
                    className={`avatar large ${avatarTones[index % avatarTones.length]}`}
                    aria-hidden="true"
                  >
                    {initials(child.name)}
                  </span>
                  <strong>{child.name}</strong>
                  <span>{age(child.date_of_birth)}</span>
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                className="child-picker-card child-picker-add"
                onClick={onAddChild}
              >
                <span className="child-picker-add-mark" aria-hidden="true">
                  <Plus size={30} />
                </span>
                <strong>{tr("Add child")}</strong>
                <span>{tr("Create a child profile")}</span>
              </button>
            </li>
          </ul>
        )}

        {childrenLoaded && !children.length && !error && (
          <div className="child-picker-empty">
            <Users size={28} aria-hidden="true" />
            <p>{tr("There are no child profiles yet.")}</p>
          </div>
        )}
        <button type="button" className="text-button" onClick={onTestPayment}>
          {tr("Try Razorpay test checkout")}
        </button>
      </main>
    </section>
  );
}
