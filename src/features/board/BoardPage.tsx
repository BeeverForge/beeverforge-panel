// A project's board, as its tracker holds it: the server names the columns and where each card is.
// A person moves cards into the queue or back to the backlog; the columns after that are the
// factory's, and the server says so if a card is dropped there.
import { useEffect } from "react";
import { Link, Navigate, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { q } from "../../api/queries";
import type { BoardCard } from "../../api/types";
import { useProjects } from "../../live/useLiveQueries";
import { useFollowProject } from "../../live/LiveProvider";
import { ago, useNow } from "../../live/clock";
import { Button, Note, Skeleton } from "../../ui/Button";
import { useBoardWrites } from "./useBoard";
import { CardDrawer } from "./CardDrawer";
import { CardForm } from "./CardForm";
import { PrDrawer } from "./PrDrawer";
import s from "./board.module.css";

/** What a column is for, read from its name; colour and the hint only — the server decides moves. */
export function stageOf(name: string) {
  const n = name.toLowerCase().replace(/[^a-z]/g, "");
  if (n.startsWith("backlog")) return { key: "backlog", hint: "Cards nobody has queued yet", person: true };
  if (n === "todo") return { key: "todo", hint: "The queue — pickup takes cards from here, in order", person: true };
  if (n.startsWith("inprogress")) return { key: "progress", hint: "The factory is working on it", person: false };
  if (n.startsWith("inreview")) return { key: "review", hint: "Its pull request is open", person: false };
  if (n.startsWith("needsreview")) return { key: "needsReview", hint: "Its pull request waits for a person", person: false };
  if (n.startsWith("needsaction")) return { key: "needsAction", hint: "It stopped — its latest comment says why", person: false };
  if (n.startsWith("done")) return { key: "done", hint: "Merged, and nothing follows it", person: false };
  return { key: "other", hint: "", person: true };
}

export function BoardIndex() {
  const projects = useProjects();
  const first = projects.data?.[0]?.name;
  if (projects.isPending) return <Skeleton w="100%" h={300} />;
  if (!first) return <Note>No project is registered yet, so there is no board to show.</Note>;
  return <Navigate to="/p/$project/board" params={{ project: first }} replace />;
}

export function BoardPage() {
  const { project } = useParams({ from: "/p/$project/board" });
  const search = useSearch({ from: "/p/$project/board" });
  const navigate = useNavigate({ from: "/p/$project/board" });
  useFollowProject(project);
  const projects = useProjects();
  const board = useQuery({
    ...q.board(project),
    refetchInterval: (query) => {
      const secs = query.state.data?.poll_seconds;
      return secs && secs > 0 ? secs * 1000 : false;
    },
  });
  const writes = useBoardWrites(project);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const now = useNow();

  const columns = board.data?.columns ?? null;
  const cards = board.data?.cards ?? null;
  const open = (ref: string) => void navigate({ search: { card: ref } });
  const closeDrawer = () => void navigate({ search: {} });

  const onDragEnd = (e: DragEndEvent) => {
    const ref = String(e.active.id);
    const to = e.over?.id ? String(e.over.id) : null;
    const card = cards?.find((c) => c.ref === ref);
    if (!to || !card || card.column === to) return;
    writes.move.mutate({ issue: ref, column: to });
  };

  const moveBy = (card: BoardCard, step: -1 | 1) => {
    if (!columns) return;
    const i = columns.indexOf(card.column ?? "");
    const next = columns[i + step];
    if (next) writes.move.mutate({ issue: card.ref ?? "", column: next });
  };

  // Keep the dropped card's focus after the board repaints.
  useEffect(() => {
    if (!writes.move.variables) return;
    document.querySelector<HTMLElement>(`[data-card="${writes.move.variables.issue}"]`)?.focus();
  }, [board.data, writes.move.variables]);

  return (
    <div className={s.page}>
      <header className={s.head}>
        <div className={s.titles}>
          <h1>Board</h1>
          <div className={s.tabs} role="tablist" aria-label="Project">
            {(projects.data ?? []).map((p) => (
              <Link key={p.name} to="/p/$project/board" params={{ project: p.name ?? "" }} className={s.tab} role="tab" aria-selected={p.name === project}>
                {p.name}
              </Link>
            ))}
          </div>
        </div>
        <div className={s.headActions}>
          <span className={s.poll}>{board.data?.poll_seconds ? `Read every ${board.data.poll_seconds}s` : board.data ? "Read on change" : ""}</span>
          <Button icon="refresh" tier="quiet" onClick={() => void board.refetch()} busy={board.isFetching && !board.isPending}>
            Read again
          </Button>
          <Button icon="plus" tier="primary" onClick={() => void navigate({ search: { create: true } })}>
            New card
          </Button>
        </div>
      </header>

      {board.isPending ? (
        <div className={s.columns} aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={s.column}>
              <Skeleton w="50%" h={14} />
              <Skeleton w="100%" h={74} style={{ marginTop: 12 }} />
              <Skeleton w="100%" h={74} style={{ marginTop: 8 }} />
            </div>
          ))}
        </div>
      ) : board.data?.board === false ? (
        <Note>No board on this project — its tracker has no board this panel can show.</Note>
      ) : !columns || !cards ? (
        <Note tone="alarm" icon="alert">
          The board could not be read — this is not evidence that it is empty. {board.error instanceof Error ? board.error.message : "Read it again in a moment."}
        </Note>
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className={s.columns}>
            {columns.map((col) => (
              <Column key={col} name={col} cards={cards.filter((c) => c.column === col)} now={now} onOpen={open} onMove={moveBy} />
            ))}
          </div>
        </DndContext>
      )}

      {search.card && <CardDrawer project={project} cardRef={search.card} preview={Boolean(search.preview)} onClose={closeDrawer} />}
      {search.pr && <PrDrawer project={project} pr={search.pr} onClose={closeDrawer} />}
      {search.create && <CardForm project={project} onClose={closeDrawer} />}
    </div>
  );
}

function Column({ name, cards, now, onOpen, onMove }: { name: string; cards: BoardCard[]; now: number; onOpen: (ref: string) => void; onMove: (c: BoardCard, step: -1 | 1) => void }) {
  const stage = stageOf(name);
  const { setNodeRef, isOver, active } = useDroppable({ id: name });
  return (
    <section ref={setNodeRef} className={s.column} data-stage={stage.key} data-over={isOver || undefined} data-dragging={active ? (stage.person ? "open" : "factory") : undefined} aria-label={`${name}, ${cards.length} cards`}>
      <header className={s.colHead} title={stage.hint}>
        <span className={s.colDot} />
        <h2>{name}</h2>
        <span className={s.colCount}>{cards.length}</span>
      </header>
      {active && !stage.person && <p className={s.factoryHint}>The factory moves cards here</p>}
      <ol className={s.cards} role="list">
        {cards.length === 0 ? (
          <li className={s.colEmpty}>{stage.key === "todo" ? "Empty — the next pickup has nothing to take" : "Read fine — nothing here"}</li>
        ) : (
          cards.map((c) => <Card key={c.ref} card={c} now={now} onOpen={onOpen} onMove={onMove} />)
        )}
      </ol>
    </section>
  );
}

function Card({ card, now, onOpen, onMove }: { card: BoardCard; now: number; onOpen: (ref: string) => void; onMove: (c: BoardCard, step: -1 | 1) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.ref ?? "" });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;
  return (
    <li role="listitem" ref={setNodeRef} style={style} className={s.card} data-dragging={isDragging || undefined}>
      <button
        type="button"
        className={s.cardBtn}
        data-card={card.ref}
        aria-label={`#${card.ref}: ${card.title}. Enter opens it; left and right arrows move it.`}
        onClick={() => onOpen(card.ref ?? "")}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            onMove(card, e.key === "ArrowLeft" ? -1 : 1);
          }
        }}
        {...attributes}
        {...listeners}
      >
        <span className={s.cardTop}>
          <span className={s.ref}>#{card.ref}</span>
          {card.updated_at && <span className={s.when}>{ago(card.updated_at, now)}</span>}
        </span>
        <span className={s.cardTitle}>{card.title}</span>
        {!!card.labels?.length && (
          <span className={s.labels}>
            {card.labels.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </span>
        )}
      </button>
    </li>
  );
}

