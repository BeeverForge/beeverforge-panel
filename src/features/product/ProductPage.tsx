// The product owner's room: talk to the product role in plain words, see what was written down,
// what waits on you, the documents it reads, the cards being built, and the system it knows.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Tabs from "@radix-ui/react-tabs";
import { act } from "../../api/actions";
import { get, seg, authHeaders } from "../../api/http";
import type { ActResult } from "../../api/types";
import { newSession, useProductConversation, type Turn } from "../../live/productSocket";
import { ago, useNow } from "../../live/clock";
import { Button, Note, Skeleton } from "../../ui/Button";
import { Icon } from "../../ui/Icon";
import { Markdown } from "../../ui/Markdown";
import { toast } from "../../ui/toast";
import s from "./product.module.css";

interface Requirement {
  number: number;
  title: string;
  status: string;
  asked_by?: string;
  date?: string;
  came_from_the_code?: boolean;
  evidence?: string;
  unfiled?: string[];
}

const useAct = <T,>(name: string, project: string, extra: Record<string, unknown> = {}) =>
  useQuery({
    queryKey: ["product-act", name, project, extra],
    queryFn: () => act(name, { project, ...extra }) as Promise<ActResult & { data?: T }>,
    enabled: Boolean(project),
    staleTime: 10_000,
  });

export function ProductIndex() {
  const list = useQuery({ queryKey: ["product-projects"], queryFn: () => get<{ name?: string }[]>("/api/v1/product/projects") });
  if (list.isPending) return <Skeleton w="100%" h={300} />;
  const first = list.data?.[0]?.name;
  if (!first) return <Note>No project here has a product role yet — the product room opens once one does.</Note>;
  return <Navigate to="/product/$project" params={{ project: first }} replace />;
}

export function ProductPage() {
  const { project } = useParams({ from: "/product/$project" });
  const [room, setRoom] = useState(() => localStorage.getItem("bf.prod.room") !== "0");
  const [session, setSession] = useState(() => localStorage.getItem("bf.prod.session") ?? "");
  const [tab, setTab] = useState(() => localStorage.getItem("bf.prod.tab") ?? "reqs");
  const [seed, setSeed] = useState<{ text: string; n: number }>({ text: "", n: 0 });
  const status = useAct<{ requirements?: number }>("product_status", project);
  const sessions = useAct<{ sessions?: { session: string; title: string; last: string; last_ts: string }[]; agent?: string }>("product_sessions", project);
  const agent = sessions.data?.data?.agent || "the product role";

  useEffect(() => localStorage.setItem("bf.prod.room", room ? "1" : "0"), [room]);
  useEffect(() => localStorage.setItem("bf.prod.session", session), [session]);
  useEffect(() => localStorage.setItem("bf.prod.tab", tab), [tab]);

  const prefill = (text: string) => setSeed((st) => ({ text, n: st.n + 1 }));

  return (
    <div className={s.room}>
      <aside className={s.rail} aria-label="Conversations">
        <div className={s.railHead}>
          <span className={s.avatar} aria-hidden="true">
            {agent.charAt(0).toUpperCase()}
          </span>
          <div>
            <b>{project}</b>
            <span className={s.sub}>with {agent}</span>
          </div>
        </div>
        <Button
          icon="plus"
          size="sm"
          onClick={() => {
            setRoom(false);
            setSession(newSession());
          }}
        >
          New conversation
        </Button>
        <h2 className={s.railSec}>Shared with the project</h2>
        <button type="button" className={s.conv} aria-current={room || undefined} onClick={() => setRoom(true)}>
          <b># Project room</b>
          <span>everybody on the project</span>
        </button>
        <h2 className={s.railSec}>Only you</h2>
        <button type="button" className={s.conv} aria-current={(!room && !session) || undefined} onClick={() => (setRoom(false), setSession(""))}>
          <b>Your first conversation</b>
          <span>private — only you</span>
        </button>
        {(sessions.data?.data?.sessions ?? [])
          .filter((x) => x.session)
          .map((x) => (
            <Session key={x.session} project={project} x={x} on={!room && session === x.session} onOpen={() => (setRoom(false), setSession(x.session))} onGone={() => session === x.session && setSession("")} />
          ))}
        <p className={s.railNote}>{room ? "The project room: everybody on the project reads and writes here, and the role answers what names it." : "Only you can read this conversation."}</p>
      </aside>

      <Conversation key={`${project}:${room ? "#room" : session}`} project={project} agent={agent} room={room} session={session} seed={seed} />

      <aside className={s.side} aria-label="The product">
        {status.data?.message && (
          <div className={s.status}>
            <Markdown>{status.data.message}</Markdown>
          </div>
        )}
        <Tabs.Root value={tab} onValueChange={setTab}>
          <Tabs.List className={s.tabs} aria-label="The product">
            <Tabs.Trigger value="reqs" className={s.tab}>
              Requirements
            </Tabs.Trigger>
            <Tabs.Trigger value="agenda" className={s.tab}>
              Pending
            </Tabs.Trigger>
            <Tabs.Trigger value="docs" className={s.tab}>
              Documents
            </Tabs.Trigger>
            <Tabs.Trigger value="board" className={s.tab}>
              Cards
            </Tabs.Trigger>
            <Tabs.Trigger value="system" className={s.tab}>
              System
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="reqs" className={s.pane}>
            <Requirements project={project} onAsk={(n, t) => prefill(`About requirement ${n} (${t}): `)} />
          </Tabs.Content>
          <Tabs.Content value="agenda" className={s.pane}>
            <Agenda project={project} />
          </Tabs.Content>
          <Tabs.Content value="docs" className={s.pane}>
            <Documents project={project} onAsk={(p) => prefill(`About ${p}: `)} />
          </Tabs.Content>
          <Tabs.Content value="board" className={s.pane}>
            <Cards project={project} />
          </Tabs.Content>
          <Tabs.Content value="system" className={s.pane}>
            <System project={project} />
          </Tabs.Content>
        </Tabs.Root>
      </aside>
    </div>
  );
}

function Session({ project, x, on, onOpen, onGone }: { project: string; x: { session: string; title: string; last: string; last_ts: string }; on: boolean; onOpen: () => void; onGone: () => void }) {
  const client = useQueryClient();
  const now = useNow();
  const [renaming, setRenaming] = useState(false);
  const del = useMutation({
    mutationFn: () => act("product_session_delete", { project, session: x.session }),
    onSuccess: (out) => {
      toast.ok("Conversation deleted", out.message);
      onGone();
      void client.invalidateQueries({ queryKey: ["product-act", "product_sessions", project] });
    },
    onError: (e) => toast.alarm("Not deleted", (e as Error).message),
  });
  const rename = useMutation({
    mutationFn: (title: string) => act("product_session_rename", { project, session: x.session, title }),
    onSettled: () => void client.invalidateQueries({ queryKey: ["product-act", "product_sessions", project] }),
  });
  return (
    <div className={s.convRow}>
      {renaming ? (
        <input
          className={s.rename}
          defaultValue={x.title}
          ref={(el) => el?.focus()}
          aria-label="Conversation name"
          onBlur={(e) => (setRenaming(false), rename.mutate(e.target.value.trim()))}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setRenaming(false);
          }}
        />
      ) : (
        <button type="button" className={s.conv} aria-current={on || undefined} onClick={onOpen}>
          <b>{x.title || "Untitled conversation"}</b>
          <span>
            {x.last} · {ago(x.last_ts, now)}
          </span>
        </button>
      )}
      <div className={s.convActs}>
        <button type="button" aria-label="Rename" title="Rename" onClick={() => setRenaming(true)}>
          <Icon name="edit" size={13} />
        </button>
        <button
          type="button"
          aria-label="Delete"
          title="Delete — what you said is erased; what it already became in the product stays"
          onClick={() => window.confirm(`Delete “${x.title}”? What you said in it is erased; what it already became in the product — a requirement, a card — stays.`) && del.mutate()}
        >
          <Icon name="close" size={13} />
        </button>
      </div>
    </div>
  );
}

function Conversation({ project, agent, room, session, seed }: { project: string; agent: string; room: boolean; session: string; seed: { text: string; n: number } }) {
  const chat = useProductConversation(project, room, session);
  const composer = useRef<HTMLTextAreaElement>(null);
  const client = useQueryClient();
  // "Ask" on a requirement or a document starts the sentence here; the person finishes it.
  useEffect(() => {
    const box = composer.current;
    if (!seed.n || !box) return;
    box.value = seed.text;
    box.focus();
  }, [seed]);
  const [files, setFiles] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const thread = useRef<HTMLDivElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const now = useNow();
  // The token travels with the click: it names exactly the proposal that was shown.
  const answer = useMutation({
    mutationFn: (v: { yes: boolean; token: string }) => act("product_answer", { project, token: v.token, answer: v.yes ? "yes" : "no", yes: true }),
    onMutate: () => chat.setStaged(null),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["product-act"] }),
    onError: (e) => toast.alarm("Not recorded", (e as Error).message),
  });

  useEffect(() => {
    thread.current?.scrollTo({ top: thread.current.scrollHeight, behavior: "smooth" });
  }, [chat.turns.length, chat.presence.state]);

  const send = () => {
    const box = composer.current;
    const text = box?.value.trim() ?? "";
    if (!text && !files.length) return;
    // In the room the role answers what names it; a message from this box is meant for it.
    const said = room && !/(^|[^\w@])@(po|product)(?!\w)/i.test(text) ? `@po ${text}` : text;
    if (chat.say(said, files.map((f) => f.id), { page: "product", project })) {
      if (box) {
        box.value = "";
        box.style.height = "";
      }
      setFiles([]);
      void client.invalidateQueries({ queryKey: ["product-act", "product_sessions", project] });
    } else {
      toast.alarm("Not sent", "The conversation is reconnecting — try again in a moment.");
    }
  };

  const upload = async (list: FileList | File[]) => {
    setBusy(true);
    for (const file of Array.from(list)) {
      try {
        const res = await fetch(`/api/product/${seg(project)}/attachments?room=${room ? 1 : 0}`, {
          method: "POST",
          headers: { ...authHeaders(), "x-attachment-name": encodeURIComponent(file.name), "content-type": file.type || "application/octet-stream" },
          body: file,
        });
        const out = (await res.json().catch(() => ({}))) as { ok?: boolean; id?: string; name?: string; message?: string; detail?: string };
        if (!res.ok || out.ok === false || !out.id) throw new Error(out.detail || out.message || `answered ${res.status}`);
        setFiles((f) => [...f, { id: out.id!, name: out.name ?? file.name }]);
      } catch (e) {
        toast.alarm(`${file.name} — not attached`, (e as Error).message);
      }
    }
    setBusy(false);
  };

  const thinking = chat.presence.state === "thinking" || chat.presence.state === "answering";

  return (
    <main
      className={s.chat}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length) void upload(e.dataTransfer.files);
      }}
    >
      <header className={s.chatHead}>
        <h1>{room ? "Project room" : "Your conversation"}</h1>
        <span className={s.scope}>{room ? "Shared" : "Private"}</span>
        <span className={s.presence} data-state={chat.presence.state} role="status">
          {chat.presence.state === "offline" ? "reconnecting…" : thinking ? `${agent} is ${chat.presence.stage ?? "thinking"}` : ""}
        </span>
      </header>
      <div className={s.thread} ref={thread} aria-live="polite">
        {chat.refusal && <Note tone="alarm">{chat.refusal}</Note>}
        {chat.earlier && (
          <button type="button" className={s.earlier} onClick={chat.loadEarlier}>
            Earlier messages
          </button>
        )}
        {!chat.ready && !chat.turns.length ? (
          <div className={s.loading}>
            <Skeleton w="60%" h={40} />
            <Skeleton w="45%" h={40} style={{ alignSelf: "flex-end" }} />
          </div>
        ) : !chat.turns.length ? (
          <Empty agent={agent} room={room} onPick={(t) => { if (composer.current) { composer.current.value = t; composer.current.focus(); } }} />
        ) : (
          chat.turns.map((t) => <Bubble key={t.id} t={t} agent={agent} now={now} />)
        )}
        {thinking && (
          <div className={s.typing} aria-label={`${agent} is answering`}>
            <i />
            <i />
            <i />
          </div>
        )}
        {chat.staged && (
          <div className={s.staged} role="group" aria-label="Waiting for your answer">
            <span>Waiting for your answer</span>
            <div>
              <Button tier="primary" size="sm" onClick={() => answer.mutate({ yes: true, token: chat.staged!.token })}>
                {chat.staged.approve}
              </Button>
              <Button size="sm" onClick={() => answer.mutate({ yes: false, token: chat.staged!.token })}>
                {chat.staged.reject}
              </Button>
            </div>
          </div>
        )}
      </div>
      <form
        className={s.composer}
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        {!!files.length && (
          <ul className={s.files}>
            {files.map((f) => (
              <li key={f.id}>
                <Icon name="file" size={13} /> {f.name}
                <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((x) => x.filter((y) => y.id !== f.id))}>
                  <Icon name="close" size={11} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <label htmlFor="say" className="sr-only">
          Message {agent}
        </label>
        <textarea
          id="say"
          ref={composer}
          rows={1}
          placeholder={room ? `Message the room — ${agent} answers what names it` : `Ask ${agent} anything about the product`}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "";
            el.style.height = `${Math.min(220, el.scrollHeight)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          onPaste={(e) => {
            if (e.clipboardData.files.length) {
              e.preventDefault();
              void upload(e.clipboardData.files);
            }
          }}
        />
        <div className={s.composerRow}>
          <button type="button" className={s.clip} onClick={() => picker.current?.click()} aria-label="Attach files" disabled={busy}>
            <Icon name="paperclip" size={15} />
          </button>
          <input ref={picker} type="file" multiple hidden onChange={(e) => e.target.files && void upload(e.target.files)} />
          <span className={s.hint}>{busy ? "Attaching…" : "Enter sends · Shift+Enter for a new line · drop files here"}</span>
          <button type="submit" className={s.send} aria-label="Send">
            <Icon name="send" size={15} />
          </button>
        </div>
      </form>
    </main>
  );
}

function Bubble({ t, agent, now }: { t: Turn; agent: string; now: number }) {
  return (
    <div className={s.bubble} data-who={t.mine ? "me" : t.who} data-sending={t.sending || undefined}>
      {!t.mine && <span className={s.speaker}>{t.who === "agent" ? agent : t.speaker || "someone"}</span>}
      {t.who === "agent" ? <Markdown>{t.text}</Markdown> : <p>{t.text}</p>}
      {!!t.attachments?.length && (
        <ul className={s.files}>
          {t.attachments.map((a, i) => (
            <li key={a.id ?? i}>
              <Icon name="file" size={13} /> {a.name ?? a.id}
            </li>
          ))}
        </ul>
      )}
      <span className={s.when}>{t.refused ? `Not delivered — ${t.refused}` : t.sending ? "sending…" : ago(t.ts, now)}</span>
    </div>
  );
}

function Empty({ agent, room, onPick }: { agent: string; room: boolean; onPick: (t: string) => void }) {
  const ideas = ["What is being built right now?", "What is waiting on me?", "I need the export to include the counterparty's VAT number.", "What did we ship last week?"];
  return (
    <div className={s.empty}>
      <p>
        {room ? "Nobody has said anything in the room yet." : `Ask ${agent} about the product in your own words — what is being built, what shipped, what you need next.`}
      </p>
      <div className={s.ideas}>
        {ideas.map((i) => (
          <button key={i} type="button" onClick={() => onPick(i)}>
            {i}
          </button>
        ))}
      </div>
    </div>
  );
}

function Requirements({ project, onAsk }: { project: string; onAsk: (n: number, title: string) => void }) {
  const client = useQueryClient();
  const read = useAct<{ requirements?: Requirement[]; findings?: { level?: string; message?: string; path?: string }[] }>("product_requirements", project);
  const write = useMutation({
    mutationFn: (v: { name: string; number: number; reason?: string }) => act(v.name, { project, number: String(v.number), yes: true, ...(v.reason ? { reason: v.reason } : {}) }),
    onSuccess: (out) => {
      toast.ok("Done", out.message);
      void client.invalidateQueries({ queryKey: ["product-act"] });
    },
    onError: (e) => toast.alarm("Not done", (e as Error).message),
  });
  if (read.isPending) return <Skeleton w="100%" h={120} />;
  const reqs = read.data?.data?.requirements;
  if (!reqs) return <Note tone="alarm">{read.data?.message || (read.error as Error | null)?.message || "The requirements could not be read."}</Note>;
  if (!reqs.length) return <Note>Nothing is written down yet. Say what you need in the conversation and it is drafted for you to confirm.</Note>;
  return (
    <ol className={s.reqs}>
      {reqs.map((r) => (
        <li key={r.number} className={s.req} data-status={r.status}>
          <div className={s.reqHead}>
            <span className={s.reqNo}>{r.number}</span>
            <b>{r.title}</b>
          </div>
          <p className={s.sub}>
            <span className={s.reqState} data-status={r.status}>
              {r.status}
            </span>
            {r.came_from_the_code ? " · read from the code — not a promise until someone accepts it" : ""}
            {r.asked_by && r.asked_by !== "unrecorded" ? ` · asked by ${r.asked_by}` : ""}
            {r.date ? ` · ${r.date}` : ""}
          </p>
          {!!r.unfiled?.length && <p className={s.warn}>Not filed by the last breakdown: {r.unfiled.join(" · ")}</p>}
          <div className={s.reqActs}>
            <Button size="sm" tier="quiet" onClick={() => onAsk(r.number, r.title)}>
              Ask
            </Button>
            {r.status === "accepted" ? (
              <Button size="sm" onClick={() => window.confirm(`File the units of work for requirement ${r.number} onto the board?`) && write.mutate({ name: "product_break_down", number: r.number })}>
                Break down…
              </Button>
            ) : r.status !== "dropped" ? (
              <>
                <Button size="sm" tier="primary" onClick={() => window.confirm(`Accept requirement ${r.number}? The factory defends an accepted requirement from then on.`) && write.mutate({ name: "product_accept", number: r.number })}>
                  Accept
                </Button>
                <Button
                  size="sm"
                  tier="quiet"
                  onClick={() => {
                    const why = window.prompt(`Why drop requirement ${r.number}? (kept with it)`);
                    if (why) write.mutate({ name: "product_drop", number: r.number, reason: why });
                  }}
                >
                  Drop
                </Button>
              </>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Agenda({ project }: { project: string }) {
  const read = useAct<{ items?: Record<string, string>[]; about?: string; empty?: string }>("product_agenda", project);
  if (read.isPending) return <Skeleton w="100%" h={80} />;
  const d = read.data?.data;
  if (!d?.items) return <Note tone="alarm">{read.data?.message || "What is owed could not be read just now."}</Note>;
  return (
    <>
      {d.about && <p className={s.about}>{d.about}</p>}
      {!d.items.length ? (
        <Note>{d.empty || "Nothing is waiting on you here."}</Note>
      ) : (
        <ol className={s.reqs}>
          {d.items.map((i, n) => (
            <li key={n} className={s.req}>
              <b>{i.what || i.said}</b>
              <p className={s.sub}>
                {i.said} · {i.when || i.since}
              </p>
              <span className={s.reqState} data-status={i.direction === "owed" ? "accepted" : "proposed"}>
                {i.chip || i.direction}
              </span>
              {i.card && (
                <Link to="/p/$project/board" params={{ project }} search={{ card: String(i.card) }}>
                  #{i.card}
                </Link>
              )}
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

function Documents({ project, onAsk }: { project: string; onAsk: (path: string) => void }) {
  const read = useQuery({ queryKey: ["product-docs", project], queryFn: () => get<{ checked_at?: string | null; documents?: { path?: string; title?: string; type?: string }[]; unreadable?: { path?: string; why?: string; reason?: string }[]; read?: number }>(`/api/v1/product/${seg(project)}/documents`) });
  const [find, setFind] = useState("");
  const docs = useMemo(() => (read.data?.documents ?? []).filter((d) => !find || `${d.title} ${d.path}`.toLowerCase().includes(find.toLowerCase())), [read.data, find]);
  if (read.isPending) return <Skeleton w="100%" h={80} />;
  if (read.isError) return <Note tone="alarm">The documents could not be read — {(read.error as Error).message}</Note>;
  const d = read.data!;
  return (
    <>
      <p className={s.about}>The files in the product's context repository that the role reads and answers from, for everyone who talks to it.</p>
      {!d.checked_at ? (
        <Note>The documents have not been read yet — the first knowledge refresh reads them. Nothing read yet is not nothing there.</Note>
      ) : (
        <>
          <input className={s.findBox} type="search" placeholder="Search the documents" value={find} onChange={(e) => setFind(e.target.value)} aria-label="Search the documents" />
          {!docs.length ? (
            <Note>{find ? "No document matches." : "The context repository holds no document yet."}</Note>
          ) : (
            <ul className={s.docs}>
              {docs.map((doc) => (
                <li key={doc.path}>
                  <Icon name="file" size={14} />
                  <span>
                    <b>{doc.title || doc.path}</b>
                    <span className={s.sub}>{doc.path}</span>
                  </span>
                  <Button size="sm" tier="quiet" onClick={() => onAsk(doc.path ?? "")}>
                    Ask
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {!!d.unreadable?.length && (
        <>
          <h3 className={s.h3}>Could not be read</h3>
          <ul className={s.docs}>
            {d.unreadable.map((u) => (
              <li key={u.path}>
                <Icon name="alert" size={14} />
                <span>
                  <b>{u.path}</b>
                  <span className={s.sub}>{u.why ?? u.reason}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function Cards({ project }: { project: string }) {
  const read = useAct<{ cards?: { ref: string; title: string; column: string; started?: boolean; opened_by_product?: string }[] }>("product_board", project);
  const client = useQueryClient();
  const look = useMutation({
    mutationFn: (name: string) => act(name, { project }),
    onSuccess: (out) => toast.info("The product role", out.message),
    onError: (e) => toast.alarm("Not read", (e as Error).message),
  });
  if (read.isPending) return <Skeleton w="100%" h={80} />;
  const cards = read.data?.data?.cards;
  return (
    <>
      <div className={s.looks}>
        <Button size="sm" busy={look.isPending && look.variables === "product_triage"} onClick={() => look.mutate("product_triage")}>
          Triage the board
        </Button>
        <Button size="sm" tier="quiet" busy={look.isPending && look.variables === "product_pending"} onClick={() => look.mutate("product_pending")}>
          What is waiting on me
        </Button>
        <Link to="/p/$project/board" params={{ project }} className={s.whole}>
          The whole board
        </Link>
      </div>
      {!cards ? (
        <Note tone="alarm">{read.data?.message || "The board could not be read just now."}</Note>
      ) : (
        <ol className={s.reqs}>
          {cards.map((c) => (
            <li key={c.ref} className={s.req}>
              <div className={s.reqHead}>
                <span className={s.reqNo}>#{c.ref}</span>
                <b>{c.title}</b>
              </div>
              <p className={s.sub}>
                {c.column}
                {c.started ? " · being built" : ""}
                {c.opened_by_product ? " · opened from a conversation" : ""}
              </p>
            </li>
          ))}
        </ol>
      )}
      <button type="button" className={s.refresh} onClick={() => void client.invalidateQueries({ queryKey: ["product-act", "product_board", project] })}>
        Read the cards again
      </button>
    </>
  );
}

function System({ project }: { project: string }) {
  const read = useQuery({ queryKey: ["product-system", project], queryFn: () => get<{ state?: string; why?: string; components?: { name?: string; kind?: string; cite?: { path?: string } }[] | null; not_derived?: { what?: string; why?: string }[] | null }>(`/api/v1/product/${seg(project)}/system`) });
  if (read.isPending) return <Skeleton w="100%" h={80} />;
  if (read.isError) return <Note tone="alarm">The system map could not be read — {(read.error as Error).message}</Note>;
  const d = read.data!;
  if (d.state !== "published") return <Note>{d.why || "No system map is published yet."}</Note>;
  return (
    <>
      {!!d.not_derived?.length && (
        <>
          <h3 className={s.h3}>What could not be derived</h3>
          <ul className={s.docs}>
            {d.not_derived.map((n, i) => (
              <li key={i}>
                <Icon name="alert" size={14} />
                <span>
                  <b>{n.what}</b>
                  <span className={s.sub}>{n.why}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <h3 className={s.h3}>Components</h3>
      <ul className={s.docs}>
        {(d.components ?? []).map((c) => (
          <li key={c.name}>
            <Icon name="board" size={14} />
            <span>
              <b>{c.name}</b>
              <span className={s.sub}>
                {c.kind} · {c.cite?.path}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
