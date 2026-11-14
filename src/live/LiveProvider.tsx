import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { startEngineStream } from "./engine";
import { startFloorSocket, type FloorSocket } from "./floorSocket";

const FollowContext = createContext<(project: string) => void>(() => {});

/** Opens the page's two always-on streams once, for the whole session. */
export function LiveProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const socket = useRef<FloorSocket | null>(null);

  useEffect(() => {
    const stopEngine = startEngineStream(client);
    socket.current = startFloorSocket(client);
    return () => {
      stopEngine();
      socket.current?.close();
      socket.current = null;
    };
  }, [client]);

  return <FollowContext.Provider value={(p) => socket.current?.follow(p)}>{children}</FollowContext.Provider>;
}

/** Point the floor socket at the project on screen, so its tech-lead conversation is pushed. */
export function useFollowProject(project: string) {
  const follow = useContext(FollowContext);
  useEffect(() => {
    follow(project);
  }, [follow, project]);
}
