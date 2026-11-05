// Bundled by tests/serve.mjs. Imports the built dist/react.js, the same file npm users get.
import { StrictMode, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Skeleton, useSkeleton } from "../../dist/react.js";

interface Props {
  loading: boolean;
  animation: "shimmer" | "pulse" | "none";
  as: string;
}

let props: Props = { loading: true, animation: "shimmer", as: "div" };
let root: Root | null = null;
const objectRef = createRef<HTMLElement>();
let callbackNode: HTMLElement | null | undefined;

function Card({ title }: { title: string }) {
  return (
    <article className="card">
      <h3>{title}</h3>
      <p>Body text for {title}</p>
      <button>Go</button>
    </article>
  );
}

/** The hook version, on an element the test page renders itself. */
function Hooked({ loading, animation }: Pick<Props, "loading" | "animation">) {
  const ref = useSkeleton<HTMLDivElement>(loading, { animation, fade: 0 });
  return (
    <div id="hook" ref={ref}>
      <span>0 likes</span> <span>0 comments</span>
    </div>
  );
}

function App(p: Props) {
  return (
    <>
      <Skeleton id="comp" ref={objectRef} loading={p.loading} animation={p.animation} as={p.as as "div"} fade={0}>
        <Card title="Component" />
      </Skeleton>
      <Skeleton
        id="cb"
        ref={(node) => {
          callbackNode = node;
        }}
        loading={p.loading}
        fade={0}
      >
        <Card title="Callback ref" />
      </Skeleton>
      <Hooked loading={p.loading} animation={p.animation} />
    </>
  );
}

const render = () => root!.render(<StrictMode><App {...props} /></StrictMode>);

(window as any).rt = {
  mount(initial: Partial<Props> = {}) {
    props = { ...props, ...initial };
    root = createRoot(document.getElementById("root")!);
    render();
  },
  update(next: Partial<Props>) {
    props = { ...props, ...next };
    render();
  },
  unmount() {
    root?.unmount();
    root = null;
  },
  refs() {
    return {
      object: objectRef.current === document.getElementById("comp"),
      objectCleared: objectRef.current === null,
      callback: callbackNode === document.getElementById("cb"),
      callbackCleared: callbackNode === null,
    };
  },
};
(window as any).ready = true;
