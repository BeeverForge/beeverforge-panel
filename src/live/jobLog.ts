// A run's log as it is written (`/api/jobs/{project}/{issue}/stream`). One EventSource per run,
// shared by every component that shows it, closed when the last one unmounts. The browser's own
// reconnect carries `Last-Event-ID`, so a dropped connection resumes without repeating lines.
import { useEffect, useSyncExternalStore } from "react";
import type { JournalEvent } from "../api/types";
import { seg } from "../api/http";

export type LogLink = "connecting" | "live" | "reconnecting" | "ended";

interface Feed {
  events: JournalEvent[];
  link: LogLink;
  source: EventSource | null;
  users: number;
  listeners: Set<() => void>;
  snapshot: { events: JournalEvent[]; link: LogLink };
  closeTimer?: number;
}

const feeds = new Map<string, Feed>();
const CAP = 3000;

function feedFor(project: string, issue: string): Feed {
  const key = `${project}#${issue}`;
  let feed = feeds.get(key);
  if (!feed) {
    feed = { events: [], link: "connecting", source: null, users: 0, listeners: new Set(), snapshot: { events: [], link: "connecting" } };
    feeds.set(key, feed);
  }
  return feed;
}

function publish(feed: Feed) {
  feed.snapshot = { events: feed.events, link: feed.link };
  for (const fn of feed.listeners) fn();
}

function open(project: string, issue: string, feed: Feed) {
  const es = new EventSource(`/api/jobs/${seg(project)}/${seg(issue)}/stream`);
  feed.source = es;
  es.onopen = () => {
    feed.link = "live";
    publish(feed);
  };
  es.onmessage = (ev) => {
    try {
      const e = JSON.parse(ev.data) as JournalEvent;
      const next = feed.events.length >= CAP ? feed.events.slice(-CAP + 1) : feed.events.slice();
      next.push(e);
      feed.events = next;
      feed.link = "live";
      publish(feed);
    } catch {
      /* a line that is not JSON is not a log line */
    }
  };
  es.onerror = () => {
    feed.link = es.readyState === EventSource.CLOSED ? "ended" : "reconnecting";
    publish(feed);
  };
  // Ended by the server: a fresh source replays the journal from its first line, so the feed is
  // emptied first rather than written under itself.
  es.addEventListener("ended", () => {
    es.close();
    feed.link = "ended";
    publish(feed);
    window.setTimeout(() => {
      if (feed.users > 0 && feed.source === es) {
        feed.events = [];
        open(project, issue, feed);
      }
    }, 10_000);
  });
}

const EMPTY = { events: [] as JournalEvent[], link: "connecting" as LogLink };

/** The live log of one run; `enabled: false` reads nothing and opens nothing. */
export function useJobLog(project: string, issue: string, enabled = true) {
  const feed = enabled && project && issue ? feedFor(project, issue) : null;

  useEffect(() => {
    if (!feed) return;
    window.clearTimeout(feed.closeTimer);
    feed.users += 1;
    if (!feed.source) open(project, issue, feed);
    return () => {
      feed.users -= 1;
      // A short grace, so moving between two views of the same run keeps one connection.
      feed.closeTimer = window.setTimeout(() => {
        if (feed.users === 0) {
          feed.source?.close();
          feed.source = null;
          feed.events = [];
          feed.link = "connecting";
          feeds.delete(`${project}#${issue}`);
        }
      }, 4000);
    };
  }, [feed, project, issue]);

  return useSyncExternalStore(
    (fn) => {
      if (!feed) return () => {};
      feed.listeners.add(fn);
      return () => feed.listeners.delete(fn);
    },
    () => feed?.snapshot ?? EMPTY,
  );
}
