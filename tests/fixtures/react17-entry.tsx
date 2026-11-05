// Bundled by tests/serve.mjs with "react" and "react-dom" pointed at React 17 (see the alias there).
// It uses React 17's own API (ReactDOM.render), and imports the built dist/react.js that npm users get.
import React, { StrictMode, createRef } from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { Skeleton, useSkeleton } from "../../dist/react.js";

interface Props {
  loading: boolean;
  animation: "shimmer" | "pulse" | "none";
  as: string;
}

let props: Props = { loading: true, animation: "shimmer", as: "div" };
let container: HTMLElement | null = null;
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

const draw = () => render(<StrictMode><App {...props} /></StrictMode>, container!);

(window as any).rt = {
  version: React.version,
  mount(initial: Partial<Props> = {}) {
    props = { ...props, ...initial };
    container = document.getElementById("root");
    draw();
  },
  update(next: Partial<Props>) {
    props = { ...props, ...next };
    draw();
  },
  unmount() {
    unmountComponentAtNode(container!);
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
