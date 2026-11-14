// The floor: every production line at once, what needs you beside it, what finished below.
import { useState } from "react";
import { useLines } from "./model";
import { Cabinet } from "./Cabinet";
import { NeedsYou } from "./NeedsYou";
import { Shipped } from "./Shipped";
import { RegisterProject } from "./RegisterProject";
import { Button } from "../../ui/Button";
import s from "./page.module.css";

export function FloorPage() {
  const { lines, loading, projectsError, inbox, engine } = useLines();
  const [adding, setAdding] = useState(false);
  return (
    <div className={s.grid}>
      <div className={s.main}>
        <Cabinet lines={lines} loading={loading} error={projectsError} />
        <div className={s.lineActions}>
          <Button size="sm" tier="quiet" icon="plus" onClick={() => setAdding(true)}>
            New production line
          </Button>
        </div>
        <Shipped />
      </div>
      <NeedsYou items={inbox.data} jobs={engine.data?.jobs ?? []} error={inbox.error} loading={inbox.isPending} />
      {adding && <RegisterProject onClose={() => setAdding(false)} />}
    </div>
  );
}
