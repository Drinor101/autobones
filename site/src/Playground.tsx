import { useState, type ReactNode } from "react";
import { Skeleton, useSkeleton, type SkeletonOptions } from "autobones/react";
import { PLACEHOLDER, type Article } from "./data";
import { useFakeApi } from "./hooks";
import { Icon } from "./icons";
import { ArticleCard, SectionHead, Segmented } from "./ui";

type Animation = NonNullable<SkeletonOptions["animation"]>;

const fmt = (n: number) => n.toLocaleString("en-US");

/** The hook version: a skeleton on an element you render yourself. */
function Stats({ article, loading, options }: { article: Article | null; loading: boolean; options: SkeletonOptions }) {
  const ref = useSkeleton<HTMLDivElement>(loading, options);
  const a = article ?? PLACEHOLDER;
  return (
    <div ref={ref} className="stats">
      <span>
        <b>{fmt(a.likes)}</b> likes
      </span>
      <span>
        <b>{fmt(a.comments)}</b> comments
      </span>
      <span>
        <b>{fmt(a.shares)}</b> shares
      </span>
    </div>
  );
}

function Control({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="control">
      <div className="control-label">
        <span>{label}</span>
        {hint && <code>{hint}</code>}
      </div>
      {children}
    </div>
  );
}

export function Playground() {
  const [animation, setAnimation] = useState<Animation>("shimmer");
  const [delay, setDelay] = useState(0);
  const [fade, setFade] = useState(250);
  const [latency, setLatency] = useState(2000);
  const { item, loading, reload } = useFakeApi(latency, true);
  const options: SkeletonOptions = { animation, delay, fade };

  const note =
    delay > 0 && latency <= delay
      ? `The API answers in ${latency} ms, before the ${delay} ms delay, so no skeleton is ever shown. That is what delay is for: fast loads never flash.`
      : delay > 0
        ? `Content stays hidden for ${delay} ms, then the skeleton appears and stays until the data arrives.`
        : "The skeleton appears the moment loading starts. Try a delay with a fast API.";

  return (
    <section className="section alt" id="try">
      <div className="container">
        <SectionHead eyebrow="Playground" title="Change the options. It keeps up.">
          This is the real library running in your browser. Press reload and change anything while it loads.
        </SectionHead>

        <div className="playground">
          <div className="panel controls">
            <button type="button" className="btn btn-primary btn-block" onClick={reload} disabled={loading}>
              <Icon name="refresh" size={18} /> {loading ? "Loading…" : "Reload"}
            </button>
            <Control label="Animation" hint="animation">
              <Segmented
                label="Animation"
                value={animation}
                onChange={setAnimation}
                options={[
                  { value: "shimmer", label: "Shimmer" },
                  { value: "pulse", label: "Pulse" },
                  { value: "none", label: "None" },
                ]}
              />
            </Control>
            <Control label="Wait before showing" hint="delay">
              <Segmented
                label="Delay"
                value={delay}
                onChange={setDelay}
                options={[
                  { value: 0, label: "0 ms" },
                  { value: 150, label: "150 ms" },
                  { value: 800, label: "800 ms" },
                ]}
              />
            </Control>
            <Control label="Cross-fade out" hint="fade">
              <Segmented
                label="Fade"
                value={fade}
                onChange={setFade}
                options={[
                  { value: 0, label: "Off" },
                  { value: 250, label: "250 ms" },
                  { value: 800, label: "800 ms" },
                ]}
              />
            </Control>
            <Control label="Pretend API speed">
              <Segmented
                label="API latency"
                value={latency}
                onChange={setLatency}
                options={[
                  { value: 100, label: "100 ms" },
                  { value: 2000, label: "2 s" },
                  { value: 6000, label: "6 s" },
                ]}
              />
            </Control>
            <p className="note" aria-live="polite">
              {note}
            </p>
          </div>

          <div className="preview">
            <div className="stage">
              <Skeleton loading={loading} {...options}>
                <ArticleCard article={item ?? PLACEHOLDER} />
              </Skeleton>
            </div>
            <p className="caption">
              <code>&lt;Skeleton&gt;</code> around the card
            </p>
            <Stats article={item} loading={loading} options={options} />
            <p className="caption">
              <code>useSkeleton()</code> on a plain element. Same options, same skeleton.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
