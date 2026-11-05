import type { ReactNode } from "react";

// A small syntax highlighter for the few code samples on this page. It understands just enough of
// JS/TS, JSX, Vue, Svelte and HTML: comments, strings, tags, attribute names, keywords and numbers.
const TOKEN =
  /(\/\/[^\n]*|<!--[\s\S]*?-->)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|(<\/?[A-Za-z][\w.:-]*)|\b(import|from|export|const|let|var|await|async|function|return|new|true|false|null)\b|(\b\d+(?:\.\d+)?\b)|([A-Za-z][\w-]*)(?==)/g;

const CLASSES = ["", "tok-comment", "tok-string", "tok-tag", "tok-keyword", "tok-number", "tok-attr"];

export function highlight(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const match of code.matchAll(TOKEN)) {
    const at = match.index ?? 0;
    if (at > last) out.push(code.slice(last, at));
    const group = match.findIndex((part, i) => i > 0 && part !== undefined);
    out.push(
      <span key={at} className={CLASSES[group]}>
        {match[0]}
      </span>,
    );
    last = at + match[0].length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}
