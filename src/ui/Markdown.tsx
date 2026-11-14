// A card's or a pull request's own text. Raw HTML is never rendered — a card is written by people
// and agents, and what it says stays data.
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import s from "./markdown.module.css";

export function Markdown({ children }: { children: string }) {
  return (
    <div className={s.md}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children: c }) => (
            <a href={href} target="_blank" rel="noreferrer noopener">
              {c}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
