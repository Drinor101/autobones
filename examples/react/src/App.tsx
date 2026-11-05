import { useEffect, useRef, useState } from "react";
import { Skeleton, useSkeleton, clearLayouts, type SkeletonOptions } from "autobones/react";

interface User {
  name: string;
  role: string;
  bio: string;
  from: string;
  to: string;
  followers: number;
  following: number;
  posts: number;
}

const USERS: User[] = [
  {
    name: "Ada Park",
    role: "Design engineer",
    bio: "Builds design systems and loves tiny details. Currently obsessed with loading states that never flash.",
    from: "#f59e0b",
    to: "#ec4899",
    followers: 1204,
    following: 318,
    posts: 52,
  },
  {
    name: "Liam Chen",
    role: "Staff frontend engineer",
    bio: "Measures layout without thrashing it. Writes about ResizeObserver, fonts and the cost of reflow.",
    from: "#22d3ee",
    to: "#6366f1",
    followers: 8731,
    following: 97,
    posts: 210,
  },
  {
    name: "Noor Haddad",
    role: "Accessibility lead",
    bio: "Reduced motion is not optional. Keyboard first, screen reader tested, and a little bit opinionated.",
    from: "#34d399",
    to: "#0ea5e9",
    followers: 452,
    following: 640,
    posts: 18,
  },
];

/** A gradient picture as a data URI, so the example needs no network. */
const art = (from: string, to: string, w: number, h: number) =>
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`,
  );

/** Shown while loading. Roughly the same length as real data, so lines wrap the same way. */
const PLACEHOLDER: User = {
  name: "Placeholder name",
  role: "Placeholder role title",
  bio: "A placeholder bio of roughly the same length as the real one, so the lines wrap in the same places.",
  from: "#cbd5e1",
  to: "#94a3b8",
  followers: 1000,
  following: 100,
  posts: 100,
};

/** Pretends to call an API: a different user each time, after `ms` milliseconds. */
function useUser(latency: number) {
  const [state, setState] = useState<{ user: User | null; loading: boolean }>({ user: null, loading: true });
  const request = useRef(0);
  const latencyRef = useRef(latency);
  latencyRef.current = latency;

  const load = () => {
    const id = ++request.current;
    setState({ user: null, loading: true });
    setTimeout(() => {
      if (request.current === id) setState({ user: USERS[id % USERS.length], loading: false });
    }, latencyRef.current);
  };

  useEffect(() => {
    load();
    return () => {
      request.current++; // ignore a response that arrives after unmount (or after StrictMode's re-run)
    };
  }, []);

  return { ...state, reload: load };
}

function UserCard({ user }: { user: User }) {
  return (
    <article className="card">
      {/* A full-bleed image inside a rounded, overflow:hidden card, and a round avatar: autobones rounds these bones to match. */}
      <img className="cover" src={art(user.from, user.to, 640, 160)} alt="" width={640} height={160} />
      <div className="card-body">
        <span className="avatar-frame">
          <img src={art(user.to, user.from, 72, 72)} alt="" width={72} height={72} />
        </span>
        <div className="info">
          <h3>{user.name}</h3>
          <p className="role">{user.role}</p>
          <p className="bio">{user.bio}</p>
          <div className="actions">
            <button>Follow</button>
            <button>Message</button>
          </div>
        </div>
      </div>
    </article>
  );
}

/** The hook version: attach a skeleton to an element you render yourself. */
function Stats({ user, loading, options }: { user: User | null; loading: boolean; options: SkeletonOptions }) {
  const ref = useSkeleton<HTMLDivElement>(loading, options);
  const u = user ?? PLACEHOLDER;
  return (
    <div ref={ref} id="hook" className="stats">
      <span><b>{u.followers.toLocaleString()}</b> followers</span>
      <span><b>{u.following.toLocaleString()}</b> following</span>
      <span><b>{u.posts.toLocaleString()}</b> posts</span>
    </div>
  );
}

function Choice<T extends string | number>({
  label, value, options, onChange,
}: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <label>
      {label}
      <select
        value={value}
        onChange={(e) => {
          const picked = options.find((o) => String(o.value) === e.target.value);
          if (picked) onChange(picked.value);
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

export default function App() {
  const [animation, setAnimation] = useState<NonNullable<SkeletonOptions["animation"]>>("shimmer");
  const [delay, setDelay] = useState(0);
  const [fade, setFade] = useState(200);
  const [latency, setLatency] = useState(2000);
  const { user, loading, reload } = useUser(latency);
  const options: SkeletonOptions = { animation, delay, fade };

  return (
    <main>
      <h1>autobones + React</h1>
      <p className="lead">The same skeleton, three ways. Press reload and watch the cards load.</p>

      <div className="controls">
        <button className="primary" id="reload" onClick={reload} disabled={loading}>
          {loading ? "Loading…" : "Reload"}
        </button>
        <Choice label="Animation" value={animation} onChange={setAnimation} options={[
          { value: "shimmer", label: "Shimmer" }, { value: "pulse", label: "Pulse" }, { value: "none", label: "None" },
        ]} />
        <Choice label="delay" value={delay} onChange={setDelay} options={[
          { value: 0, label: "0 ms" }, { value: 150, label: "150 ms" }, { value: 800, label: "800 ms" },
        ]} />
        <Choice label="fade" value={fade} onChange={setFade} options={[
          { value: 0, label: "0 ms" }, { value: 200, label: "200 ms" }, { value: 800, label: "800 ms" },
        ]} />
        <Choice label="API latency" value={latency} onChange={setLatency} options={[
          { value: 100, label: "100 ms (fast)" }, { value: 2000, label: "2 s" }, { value: 6000, label: "6 s" },
        ]} />
      </div>

      <h2>1. <code>&lt;Skeleton&gt;</code> with placeholder data</h2>
      <p className="hint">Renders the card with placeholder text while loading. Works on the very first visit.</p>
      <Skeleton id="with-placeholder" loading={loading} name="user-card" {...options}>
        <UserCard user={user ?? PLACEHOLDER} />
      </Skeleton>

      <h2>2. <code>&lt;Skeleton name&gt;</code> with layout memory only</h2>
      <p className="hint">
        Renders nothing while loading. The first load shows an empty box; once the real card has rendered once, every
        later load (even after a page reload) shows its exact skeleton.{" "}
        <button className="link" onClick={() => clearLayouts()}>Forget remembered layouts</button>
      </p>
      <Skeleton id="memory-only" loading={loading} name="user-card-memory" {...options}>
        {user && <UserCard user={user} />}
      </Skeleton>

      <h2>3. <code>useSkeleton</code> hook</h2>
      <p className="hint">Attaches to an element you render yourself. Options update live, just like the component.</p>
      <Stats user={user} loading={loading} options={options} />
    </main>
  );
}
