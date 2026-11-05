import { useRef, useState, type KeyboardEvent } from "react";
import { Skeleton } from "autobones/react";
import { REPO, SHIP_LAYOUTS, SNIPPETS } from "./data";
import { useFakeApi } from "./hooks";
import { Icon } from "./icons";
import { ArticleCard, CodeBlock, SectionHead } from "./ui";

export function Frameworks() {
  const [id, setId] = useState(SNIPPETS[0].id);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const snippet = SNIPPETS.find((s) => s.id === id) ?? SNIPPETS[0];

  // Arrow keys move between tabs, like a native tab list.
  const onKeyDown = (event: KeyboardEvent) => {
    const index = SNIPPETS.findIndex((s) => s.id === id);
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + SNIPPETS.length) % SNIPPETS.length;
    setId(SNIPPETS[next].id);
    tabs.current[next]?.focus();
  };

  return (
    <section className="section alt" id="frameworks">
      <div className="container">
        <SectionHead eyebrow="Frameworks" title="One engine. A native feel in every framework.">
          The measuring engine is plain TypeScript with no dependencies. Thin adapters wrap it for each framework, and
          every option works the same way in all of them.
        </SectionHead>

        <div className="tabs" role="tablist" aria-label="Framework" onKeyDown={onKeyDown}>
          {SNIPPETS.map((s, i) => (
            <button
              key={s.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${s.id}`}
              aria-selected={s.id === id}
              aria-controls="snippet-panel"
              tabIndex={s.id === id ? 0 : -1}
              onClick={() => setId(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" id="snippet-panel" aria-labelledby={`tab-${id}`}>
          <CodeBlock code={snippet.code} title={snippet.file} />
        </div>
        <p className="after-code">
          Options include <code>name</code>, <code>delay</code>, <code>minDuration</code>, <code>fade</code>,{" "}
          <code>animation</code>, colors and more.{" "}
          <a href={`${REPO}#options`} target="_blank" rel="noreferrer">
            See every option <Icon name="arrow" size={14} />
          </a>
        </p>
      </div>
    </section>
  );
}

export function LayoutMemory() {
  // Starts loaded, so the first Reload has a real render to remember.
  const { item, loading, reload } = useFakeApi(1800, true);

  return (
    <section className="section" id="memory">
      <div className="container">
        <SectionHead eyebrow="Layout memory" title="Render nothing. Get a skeleton anyway.">
          Give a skeleton a name and it remembers what your component looked like. The next load draws that exact
          skeleton, even though your component renders nothing while it waits.
        </SectionHead>

        <div className="memory-grid">
          <ol className="steps-list">
            <li>
              <b>Real content renders once.</b>
              <span>
                autobones saves its shape under the name: geometry and colors only, never your text.
              </span>
            </li>
            <li>
              <b>Every load after that has a skeleton.</b>
              <span>
                No placeholder data to write. The height is reserved too, so the page does not jump when content
                arrives.
              </span>
            </li>
            <li>
              <b>Ship it for first visits.</b>
              <span>Record layouts in dev, commit one small JSON file, and brand-new visitors get the same skeleton.</span>
            </li>
          </ol>

          <div className="window">
            <div className="window-bar">
              <code className="muted-label">name="memory-demo"</code>
              <button type="button" className="btn btn-secondary btn-small" onClick={reload} disabled={loading}>
                <Icon name="refresh" size={16} /> {loading ? "Loading…" : "Reload"}
              </button>
            </div>
            <div className="stage">
              <Skeleton loading={loading} name="memory-demo" fade={250}>
                {item && <ArticleCard article={item} />}
              </Skeleton>
            </div>
            <div className="window-foot" aria-live="polite">
              <p>
                {loading
                  ? "Your component is rendering nothing right now. This skeleton comes from the remembered layout."
                  : "Real content rendered. Its shape is saved as “memory-demo”. Press reload."}
              </p>
            </div>
          </div>
        </div>

        <CodeBlock code={SHIP_LAYOUTS} title="Ship layouts for first visits" />
      </div>
    </section>
  );
}
