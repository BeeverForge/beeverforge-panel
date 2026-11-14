// The floor: every production line at once, what needs you beside it, what finished below.
import { useLines } from "./model";
import { Cabinet } from "./Cabinet";
import { NeedsYou } from "./NeedsYou";
import { Shipped } from "./Shipped";
import s from "./page.module.css";

export function FloorPage() {
  const { lines, loading, projectsError, inbox, engine } = useLines();
  return (
    <div className={s.grid}>
      <div className={s.main}>
        <Cabinet lines={lines} loading={loading} error={projectsError} />
        <Shipped />
      </div>
      <NeedsYou items={inbox.data} jobs={engine.data?.jobs ?? []} error={inbox.error} loading={inbox.isPending} />
    </div>
  );
}
