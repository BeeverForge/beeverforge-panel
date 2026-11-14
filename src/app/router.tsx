// The panel's addresses. The default panel's own paths keep working (`/p/<project>/card/<ref>`
// and friends redirect into the board), so a link anybody kept still lands.
import { createRootRoute, createRoute, createRouter, lazyRouteComponent, redirect } from "@tanstack/react-router";
import { Shell } from "./Shell";
import { FloorPage } from "../features/floor/FloorPage";
import { NotFound } from "./NotFound";

const root = createRootRoute({ component: Shell, notFoundComponent: NotFound });

const floor = createRoute({ getParentRoute: () => root, path: "/", component: FloorPage });

const line = createRoute({
  getParentRoute: () => root,
  path: "/p/$project",
  component: lazyRouteComponent(() => import("../features/line/LinePage"), "LinePage"),
});

type BoardSearch = { card?: string; pr?: string; preview?: boolean; edit?: string; create?: boolean };
const boardSearch = (s: Record<string, unknown>): BoardSearch => ({
  card: typeof s.card === "string" || typeof s.card === "number" ? String(s.card) : undefined,
  pr: typeof s.pr === "string" || typeof s.pr === "number" ? String(s.pr) : undefined,
  preview: s.preview === true || s.preview === "1" || s.preview === "true" ? true : undefined,
  create: s.create === true || s.create === "1" || s.create === "true" ? true : undefined,
});

const projectBoard = createRoute({
  getParentRoute: () => root,
  path: "/p/$project/board",
  validateSearch: boardSearch,
  component: lazyRouteComponent(() => import("../features/board/BoardPage"), "BoardPage"),
});
const oldCard = createRoute({
  getParentRoute: () => root,
  path: "/p/$project/card/$ref",
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/p/$project/board", params: { project: params.project }, search: { card: params.ref } });
  },
});
const oldPr = createRoute({
  getParentRoute: () => root,
  path: "/p/$project/pr/$ref",
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/p/$project/board", params: { project: params.project }, search: { pr: params.ref } });
  },
});
const oldPreview = createRoute({
  getParentRoute: () => root,
  path: "/p/$project/preview/$ref",
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/p/$project/board", params: { project: params.project }, search: { card: params.ref, preview: true } });
  },
});
const board = createRoute({
  getParentRoute: () => root,
  path: "/board",
  component: lazyRouteComponent(() => import("../features/board/BoardPage"), "BoardIndex"),
});

const logs = createRoute({
  getParentRoute: () => root,
  path: "/logs",
  component: lazyRouteComponent(() => import("../features/logs/LogsPage"), "LogsPage"),
});
const logsProject = createRoute({
  getParentRoute: () => root,
  path: "/logs/$project",
  component: lazyRouteComponent(() => import("../features/logs/LogsPage"), "LogsPage"),
});
const logsRun = createRoute({
  getParentRoute: () => root,
  path: "/logs/$project/$issue",
  component: lazyRouteComponent(() => import("../features/logs/LogsPage"), "LogsPage"),
});

const costs = createRoute({
  getParentRoute: () => root,
  path: "/costs",
  validateSearch: (s: Record<string, unknown>): { project?: string } => ({ project: typeof s.project === "string" ? s.project : undefined }),
  component: lazyRouteComponent(() => import("../features/costs/CostsPage"), "CostsPage"),
});

const product = createRoute({
  getParentRoute: () => root,
  path: "/product",
  component: lazyRouteComponent(() => import("../features/product/ProductPage"), "ProductIndex"),
});
const productProject = createRoute({
  getParentRoute: () => root,
  path: "/product/$project",
  component: lazyRouteComponent(() => import("../features/product/ProductPage"), "ProductPage"),
});

const tree = root.addChildren([
  floor,
  line,
  projectBoard,
  oldCard,
  oldPr,
  oldPreview,
  board,
  logs,
  logsProject,
  logsRun,
  costs,
  product,
  productProject,
]);

export const router = createRouter({
  routeTree: tree,
  defaultPreload: "intent",
  defaultPreloadDelay: 80,
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
