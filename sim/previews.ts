// A change's preview (ADR-0050): started from a card, built, served, and taken down. Simulated in
// full, because a real one needs a container runtime the rig does not run.
import { Refused, type Factory } from "./factory.ts";

interface Preview {
  state: "starting" | "live" | "failed" | "ended";
  startedAt: number;
  liveAt: number;
}

export class Previews {
  private held = new Map<string, Preview>();
  constructor(private factory: Factory) {}

  private key(project: string, unit: string) {
    return `${project}#${unit.replace(/^#/, "")}`;
  }

  read(project: string, unit: string) {
    const p = this.held.get(this.key(project, unit));
    const job = this.factory.latest(project, unit.replace(/^#/, ""));
    const hasChange = Boolean(job?.prNumber);
    const base = {
      unit,
      who: "",
      started_by: "",
      images: [],
      stale: [],
      missing: [],
      base_moved: {},
      notes: [],
      can_allow_shape: false,
      own_shape: false,
      shape_from: "the project's compose file",
      log_dir: "",
      proposal_url: "",
    };
    if (!p) {
      return {
        ...base,
        live: false,
        state: "none",
        starting: false,
        headline: hasChange ? "No preview of this change is running" : "There is no change to preview yet",
        why: hasChange ? "" : "a preview runs the pull request a job opened, and this card has none yet",
        services: [],
        can_start: hasChange,
      };
    }
    if (p.state === "starting" && Date.now() >= p.liveAt) p.state = "live";
    const live = p.state === "live";
    const slug = `${project}--${unit.replace(/^#/, "")}`;
    return {
      ...base,
      live,
      state: p.state,
      starting: p.state === "starting",
      headline: live ? "The change is running — try it before it goes in" : p.state === "starting" ? "Building the change and starting its services" : "The preview was taken down; its logs are kept",
      why: "",
      started_by: "you",
      started_at: new Date(p.startedAt).toISOString(),
      expires_at: new Date(p.startedAt + 4 * 3_600_000).toISOString(),
      services: live
        ? [
            { name: "web", url: `http://web--${slug}.preview.localhost`, health: "healthy", from_change: true },
            { name: "api", url: `http://api--${slug}.preview.localhost`, health: "healthy", from_change: true },
            { name: "postgres", url: "", health: "healthy", from_change: false },
          ]
        : [],
      can_start: p.state === "ended" || p.state === "failed",
    };
  }

  act(project: string, unit: string, verb: string) {
    const k = this.key(project, unit);
    const now = Date.now();
    switch (verb) {
      case "start":
      case "rebuild":
        this.held.set(k, { state: "starting", startedAt: now, liveAt: now + 9000 });
        return { state: "starting", message: verb === "start" ? "starting the preview" : "building it again from the pull request's head", detail: "" };
      case "stop": {
        const p = this.held.get(k);
        if (!p) throw new Refused(409, "no preview of this card is running");
        p.state = "ended";
        return { state: "ended", message: "taken down — its logs are kept", detail: "" };
      }
      case "own_shape":
        return { state: "none", message: "this change's own shape is allowed for its next start", detail: "" };
      default:
        throw new Refused(400, `'${verb}' is not something a preview does`);
    }
  }
}
