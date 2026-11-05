import { AUTHOR, NPM, REPO } from "./data";
import { useTheme } from "./hooks";
import { GithubIcon, Icon, type IconName } from "./icons";
import { Logo, SectionHead } from "./ui";

export function Nav() {
  const { theme, toggle } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Logo />
        <nav aria-label="Main" className="nav-links">
          <a href="#how">How it works</a>
          <a href="#try">Playground</a>
          <a href="#frameworks">Frameworks</a>
          <a href="#memory">Layout memory</a>
        </nav>
        <div className="nav-actions">
          <button type="button" className="icon-btn" onClick={toggle} aria-label={`Switch to ${next} theme`}>
            <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
          </button>
          <a className="btn btn-secondary btn-small" href={REPO} target="_blank" rel="noreferrer">
            <GithubIcon size={16} /> GitHub
          </a>
        </div>
      </div>
    </header>
  );
}

const STEPS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "window",
    title: "Render your real UI",
    text: "Use your actual component, with placeholder data of about the right length. Or render nothing and let layout memory fill in.",
  },
  {
    icon: "scan",
    title: "autobones measures it",
    text: "Every text line, image, avatar, button and card is read from the DOM. No guessing, no config.",
  },
  {
    icon: "bones",
    title: "Bones replace content",
    text: "The content hides behind a shimmering overlay. Resize the window or change the data and the bones follow.",
  },
];

export function HowItWorks() {
  return (
    <section className="section" id="how">
      <div className="container">
        <SectionHead eyebrow="How it works" title="Measure what is really there.">
          Hand-made skeletons are a second copy of your UI that you have to keep in sync. autobones has no second copy.
        </SectionHead>
        <ol className="steps">
          {STEPS.map((step, i) => (
            <li key={step.title} className="step card">
              <span className="step-icon">
                <Icon name={step.icon} size={22} />
              </span>
              <span className="step-num">0{i + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "sparkles",
    title: "Nothing to hand-draw",
    text: "Wrap your component. The skeleton comes from the layout the browser already computed.",
  },
  {
    icon: "database",
    title: "Layout memory",
    text: "Name a skeleton and it remembers the real shape, so later loads need no placeholder data at all.",
  },
  {
    icon: "package",
    title: "Perfect first visits",
    text: "Record layouts in dev and ship one JSON file. Brand-new visitors get an exact skeleton too.",
  },
  {
    icon: "clock",
    title: "No flicker",
    text: "delay skips the skeleton on fast loads, minDuration stops it blinking, and fade cross-fades into content.",
  },
  {
    icon: "accessibility",
    title: "Accessible by default",
    text: "aria-busy, inert content, bones hidden from screen readers, and no animation when reduced motion is on.",
  },
  {
    icon: "moon",
    title: "Dark mode and theming",
    text: "Follows prefers-color-scheme out of the box. Colors, radius and speed are CSS variables or options.",
  },
  {
    icon: "layers",
    title: "Every framework",
    text: "React, Vue, Svelte, Web Components and plain JS, over one shared engine.",
  },
  {
    icon: "zap",
    title: "Tiny, zero dependencies",
    text: "About 5 KB gzipped for the engine. Frameworks are optional peer dependencies. Strict CSP? Import the CSS file.",
  },
];

export function Features() {
  return (
    <section className="section" id="features">
      <div className="container">
        <SectionHead eyebrow="Features" title="The details that make skeletons feel finished." />
        <ul className="features">
          {FEATURES.map((f) => (
            <li key={f.title} className="feature card">
              <span className="feature-icon">
                <Icon name={f.icon} size={20} />
              </span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const ROWS: { topic: string; manual: string; auto: string }[] = [
  {
    topic: "Writing them",
    manual: "A separate skeleton component for every screen",
    auto: "Nothing to write. Wrap the UI you already have",
  },
  {
    topic: "Staying in sync",
    manual: "Drifts the moment the real UI changes",
    auto: "Measured from the real UI every time",
  },
  {
    topic: "Layout shift",
    manual: "The placeholder and the content rarely match",
    auto: "Drawn from the real layout, so it lines up with the content",
  },
  {
    topic: "Fast responses",
    manual: "A skeleton flashes for a few milliseconds",
    auto: "delay and minDuration stop the flash",
  },
  {
    topic: "Accessibility",
    manual: "Easy to forget aria-busy and reduced motion",
    auto: "Built in",
  },
  {
    topic: "Dark mode",
    manual: "Another set of colors to maintain",
    auto: "Follows the theme, with CSS variables to tune",
  },
];

export function Compare() {
  return (
    <section className="section alt" id="compare">
      <div className="container">
        <SectionHead eyebrow="Why autobones" title="Why not hand-made skeletons?" />
        <div className="table-wrap">
          <table className="compare">
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Topic</span>
                </th>
                <th scope="col">Hand-made skeletons</th>
                <th scope="col">autobones</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.topic}>
                  <th scope="row">{row.topic}</th>
                  <td>
                    <span className="mark mark-no">
                      <Icon name="x" size={14} />
                    </span>
                    {row.manual}
                  </td>
                  <td>
                    <span className="mark mark-yes">
                      <Icon name="check" size={14} />
                    </span>
                    {row.auto}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function CallToAction() {
  return (
    <section className="section cta-band">
      <div className="container cta">
        <h2>Stop maintaining loading states by hand.</h2>
        <p>Add one wrapper. autobones does the measuring.</p>
        <div className="cta-row center">
          <a className="btn btn-primary" href={REPO} target="_blank" rel="noreferrer">
            <GithubIcon size={18} /> Star on GitHub
          </a>
          <a className="btn btn-secondary" href={`${REPO}#readme`} target="_blank" rel="noreferrer">
            Read the docs <Icon name="arrow" size={18} />
          </a>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <Logo size={26} />
          <p>Skeleton loaders that build themselves from your real UI.</p>
        </div>
        <nav aria-label="Project" className="footer-links">
          <a href={REPO} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href={NPM} target="_blank" rel="noreferrer">
            npm
          </a>
          <a href={`${REPO}/issues`} target="_blank" rel="noreferrer">
            Issues
          </a>
          <a href={`${REPO}/discussions`} target="_blank" rel="noreferrer">
            Discussions
          </a>
        </nav>
      </div>
      <div className="container footer-legal">
        <span>MIT licensed.</span>
        <span>
          Built by{" "}
          <a href={AUTHOR} target="_blank" rel="noreferrer">
            Drinor Shabiu
          </a>
          .
        </span>
      </div>
    </footer>
  );
}
