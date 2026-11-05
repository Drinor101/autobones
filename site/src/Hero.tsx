import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Skeleton } from "autobones/react";
import { measureBones, type Bone } from "autobones";
import { ARTICLES, INSTALL, PLACEHOLDER, REPO } from "./data";
import { useReducedMotion } from "./hooks";
import { GithubIcon, Icon } from "./icons";
import { ArticleCard, CopyButton, Segmented } from "./ui";

type Mode = "skeleton" | "content" | "measured";

const MODES: { value: Mode; label: string }[] = [
  { value: "content", label: "Your UI" },
  { value: "measured", label: "Measured" },
  { value: "skeleton", label: "Skeleton" },
];
const ORDER: Mode[] = ["skeleton", "content", "measured"];
const HOLD: Record<Mode, number> = { skeleton: 2600, content: 2200, measured: 3400 };

const CAPTIONS: Record<Mode, string> = {
  content: "Your real component, rendered normally. Nothing special to write.",
  measured: "autobones reads the DOM: every text line, image, avatar, button and card.",
  skeleton: "The skeleton is drawn from those measurements. Change the UI and it follows.",
};

const KINDS: { kind: Bone["kind"]; label: string }[] = [
  { kind: "text", label: "Text line" },
  { kind: "media", label: "Image / button" },
  { kind: "box", label: "Avatar / box" },
  { kind: "surface", label: "Card surface" },
];

/** Draws what measureBones() found over the card, using the library's own measurements. */
function Outlines({ target }: { target: RefObject<HTMLElement | null> }) {
  const [bones, setBones] = useState<Bone[]>([]);

  useLayoutEffect(() => {
    const el = target.current;
    if (!el) return;
    const run = () => setBones(measureBones(el));
    run();
    const observer = new ResizeObserver(run);
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return (
    <div className="outlines" aria-hidden="true">
      {bones.map((b, i) => (
        <span
          key={i}
          className={`outline outline-${b.kind}`}
          style={{
            left: b.x,
            top: b.y,
            width: b.width,
            height: b.height,
            borderRadius: b.radius.startsWith("var(") ? 4 : b.radius,
            animationDelay: `${Math.min(i * 28, 600)}ms`,
          }}
        />
      ))}
    </div>
  );
}

function HeroDemo() {
  const reduced = useReducedMotion();
  const [mode, setMode] = useState<Mode>("skeleton");
  const [auto, setAuto] = useState(true);
  const [round, setRound] = useState(0);
  const root = useRef<HTMLElement | null>(null);

  // Cycle through the three views until the visitor takes over.
  useEffect(() => {
    if (!auto || reduced) return;
    const timer = setTimeout(() => {
      const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
      if (next === "skeleton") setRound((n) => n + 1);
      setMode(next);
    }, HOLD[mode]);
    return () => clearTimeout(timer);
  }, [mode, auto, reduced]);

  const pick = (next: Mode) => {
    setAuto(false);
    setMode(next);
  };

  return (
    <div className="window" id="demo">
      <div className="window-bar">
        <Segmented label="View" value={mode} options={MODES} onChange={pick} />
        <button type="button" className="ghost" onClick={() => setAuto((a) => !a)} aria-pressed={auto && !reduced}>
          {auto && !reduced ? "Pause" : "Auto-play"}
        </button>
      </div>
      <div className="stage">
        <Skeleton ref={root} loading={mode === "skeleton"} fade={250}>
          <ArticleCard article={mode === "skeleton" ? PLACEHOLDER : ARTICLES[round % ARTICLES.length]} />
        </Skeleton>
        {mode === "measured" && <Outlines target={root} />}
      </div>
      <div className="window-foot" aria-live="polite">
        {mode === "measured" ? (
          <ul className="legend">
            {KINDS.map((k) => (
              <li key={k.kind}>
                <i className={`dot dot-${k.kind}`} />
                {k.label}
              </li>
            ))}
          </ul>
        ) : (
          <p>{CAPTIONS[mode]}</p>
        )}
      </div>
    </div>
  );
}

function InstallBox() {
  const [manager, setManager] = useState(INSTALL[0].id);
  const current = INSTALL.find((i) => i.id === manager) ?? INSTALL[0];
  return (
    <div className="install">
      <Segmented
        label="Package manager"
        value={manager}
        options={INSTALL.map((i) => ({ value: i.id, label: i.id }))}
        onChange={setManager}
      />
      <div className="install-cmd">
        <code>
          <span className="prompt">$</span> {current.cmd}
        </code>
        <CopyButton text={current.cmd} />
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="hero" id="top">
      <div className="container hero-grid">
        <div className="hero-copy">
          <p className="pill">
            <span className="pill-dot" /> Open source · MIT · ~5 KB gzipped · zero dependencies
          </p>
          <h1>
            Skeleton loaders that <span className="grad">build themselves.</span>
          </h1>
          <p className="lead">
            Stop hand-drawing placeholder shapes. autobones measures your real UI and draws a matching skeleton over
            it. Change the component, and the skeleton changes with it.
          </p>
          <InstallBox />
          <div className="cta-row">
            <a className="btn btn-primary" href="#try">
              Try it live <Icon name="arrow" size={18} />
            </a>
            <a className="btn btn-secondary" href={REPO} target="_blank" rel="noreferrer">
              <GithubIcon size={18} /> View on GitHub
            </a>
          </div>
          <ul className="chips" aria-label="Supported frameworks">
            {["React", "Vue", "Svelte", "Web Components", "Plain JS"].map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
        <HeroDemo />
      </div>
    </section>
  );
}
