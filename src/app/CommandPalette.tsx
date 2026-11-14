// Find anything by typing: a project, a page, a card on any board, or something to do.
import { Command } from "cmdk";
import * as D from "@radix-ui/react-dialog";
import { useQueries } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { q } from "../api/queries";
import { useProjects } from "../live/useLiveQueries";
import { Icon } from "../ui/Icon";
import { useScan } from "../features/answer/useAnswer";
import s from "./palette.module.css";

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate();
  const projects = useProjects();
  const names = (projects.data ?? []).map((p) => p.name ?? "").filter(Boolean);
  const boards = useQueries({ queries: names.map((n) => ({ ...q.board(n), enabled: open, staleTime: 15_000 })) });
  const scan = useScan();

  const go = (to: string) => {
    onOpenChange(false);
    void navigate({ to });
  };

  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className={s.scrim} />
        <D.Content className={s.box} aria-label="Find">
          <D.Title className="sr-only">Find a card, a project or an action</D.Title>
          <D.Description className="sr-only">Type to filter; Enter opens the highlighted result.</D.Description>
          <Command label="Find" loop>
            <div className={s.inputRow}>
              <Icon name="search" size={15} />
              <Command.Input className={s.input} placeholder="Find a card, a project or an action…" autoFocus />
            </div>
            <Command.List className={s.list}>
              <Command.Empty className={s.empty}>Nothing matches. Card numbers work too: try “#3”.</Command.Empty>
              <Command.Group heading="Pages" className={s.group}>
                <Command.Item className={s.item} onSelect={() => go("/")}>
                  <Icon name="board" size={14} /> The floor
                </Command.Item>
                <Command.Item className={s.item} onSelect={() => go("/board")}>
                  <Icon name="board" size={14} /> Board
                </Command.Item>
                <Command.Item className={s.item} onSelect={() => go("/logs")}>
                  <Icon name="logs" size={14} /> Logs
                </Command.Item>
                <Command.Item className={s.item} onSelect={() => go("/costs")}>
                  <Icon name="costs" size={14} /> Costs
                </Command.Item>
                <Command.Item className={s.item} onSelect={() => go("/product")}>
                  <Icon name="product" size={14} /> Product room
                </Command.Item>
              </Command.Group>
              <Command.Group heading="Lines" className={s.group}>
                {names.map((n) => (
                  <Command.Item key={n} className={s.item} value={`line ${n}`} onSelect={() => go(`/p/${encodeURIComponent(n)}`)}>
                    <Icon name="chevronRight" size={14} /> {n}
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Group heading="Cards" className={s.group}>
                {boards.flatMap((b, i) =>
                  (b.data?.cards ?? []).map((c) => (
                    <Command.Item
                      key={`${names[i]}#${c.ref}`}
                      className={s.item}
                      value={`#${c.ref} ${c.title} ${names[i]}`}
                      onSelect={() => go(`/p/${encodeURIComponent(names[i]!)}/board?card=${encodeURIComponent(c.ref ?? "")}`)}
                    >
                      <span className={s.ref}>#{c.ref}</span>
                      <span className={s.cardTitle}>{c.title}</span>
                      <span className={s.meta}>
                        {names[i]} · {c.column}
                      </span>
                    </Command.Item>
                  )),
                )}
              </Command.Group>
              <Command.Group heading="Do" className={s.group}>
                {names.map((n) => (
                  <Command.Item
                    key={`scan ${n}`}
                    className={s.item}
                    value={`scan to-do ${n}`}
                    onSelect={() => {
                      onOpenChange(false);
                      scan.mutate(n);
                    }}
                  >
                    <Icon name="scan" size={14} /> Pick up the next card on {n} now
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
          </Command>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
