import { useEffect, useRef, useState, type ReactNode } from "react";
import { art, type Article } from "./data";
import { Icon } from "./icons";
import { highlight } from "./highlight";

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="ab-logo-gradient" x1="6" y1="2" x2="58" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6b5bff" />
          <stop offset="1" stopColor="#8b4df0" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#ab-logo-gradient)" />
      <circle cx="21" cy="19" r="7" fill="#fff" />
      <rect x="33" y="13" width="19" height="6" rx="3" fill="#fff" />
      <rect x="33" y="23" width="12" height="5" rx="2.5" fill="#fff" fillOpacity=".7" />
      <rect x="12" y="36" width="40" height="6" rx="3" fill="#fff" fillOpacity=".92" />
      <rect x="12" y="46" width="26" height="5" rx="2.5" fill="#fff" fillOpacity=".6" />
    </svg>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <a className="logo" href="#top" aria-label="autobones, back to top">
      <LogoMark size={size} />
      <span>autobones</span>
    </a>
  );
}

/** A row of mutually exclusive buttons (a radio group). */
export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className={option.value === value ? "on" : ""}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API blocked (older browser, insecure page): fall back to a hidden textarea.
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand("copy");
      } catch {
        /* nothing more to try */
      }
      area.remove();
    }
    setDone(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(false), 1600);
  };

  return (
    <button type="button" className="copy" onClick={copy}>
      <Icon name={done ? "check" : "copy"} size={15} />
      <span aria-live="polite">{done ? "Copied" : label}</span>
    </button>
  );
}

export function CodeBlock({ code, title }: { code: string; title?: string }) {
  return (
    <div className="code">
      <div className="code-head">
        <span>{title}</span>
        <CopyButton text={code} />
      </div>
      <pre tabIndex={0}>
        <code>{highlight(code)}</code>
      </pre>
    </div>
  );
}

/** The sample UI that gets turned into a skeleton all over this page. */
export function ArticleCard({ article }: { article: Article }) {
  return (
    <article className="article">
      <img className="article-cover" src={art(article.from, article.to, 640, 280)} alt="" width={640} height={280} />
      <div className="article-body">
        <div className="article-author">
          <span className="avatar">
            <img src={art(article.to, article.from, 80, 80)} alt="" width={40} height={40} />
          </span>
          <div>
            <div className="author-name">{article.author}</div>
            <div className="author-meta">{article.meta}</div>
          </div>
        </div>
        <h3>{article.title}</h3>
        <p>{article.body}</p>
        <div className="article-actions">
          <button type="button">Like</button>
          <button type="button">Share</button>
        </div>
      </div>
    </article>
  );
}

export function SectionHead({ id, eyebrow, title, children }: { id?: string; eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <header className="section-head" id={id}>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {children && <p className="section-lead">{children}</p>}
    </header>
  );
}
