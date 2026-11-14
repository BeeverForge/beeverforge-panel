import { QueryClient } from "@tanstack/react-query";
import { Refusal } from "../api/http";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Streams invalidate what changes; a read is otherwise trusted for a few seconds.
      staleTime: 5_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      // A refusal is the server's answer, not a hiccup: asking again changes nothing.
      retry: (count, error) => !(error instanceof Refusal) && count < 2,
      retryDelay: (n) => Math.min(8000, 800 * 2 ** n),
    },
  },
});
