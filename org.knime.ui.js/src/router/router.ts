import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";

import { environment } from "@/environment";

import WorkflowPage from "@/components/workflow/WorkflowPage.vue";

import { APP_ROUTES } from "./appRoutes";

const registerRoute = (
  env: typeof environment,
  route: RouteRecordRaw,
): [RouteRecordRaw] | [] => {
  return env === environment ? [route] : [];
};

const Home = "Home";
let lastHomePath = "";

export const routes: Array<RouteRecordRaw> = [
  {
    name: APP_ROUTES.WorkflowPage,
    path: "/workflow/:projectId/:workflowId",
    component: WorkflowPage,
  },

  ...registerRoute("DESKTOP", {
    name: Home,
    path: "/",
    component: () => import("@/components/homepage/HomePageLayout.vue"),
    redirect: "/get-started",
    children: [
      {
        name: APP_ROUTES.Home.GetStarted,
        path: "/get-started",
        component: () => import("@/components/homepage/GetStartedPage.vue"),
        beforeEnter: (to, from, next) => {
          const isComingFromWorkflow = from.name === APP_ROUTES.WorkflowPage;
          const skipLastVisitedPage = to.query.skipLastVisitedPage;

          if (
            isComingFromWorkflow &&
            lastHomePath &&
            lastHomePath !== "/get-started" &&
            !skipLastVisitedPage
          ) {
            next(lastHomePath);
            return;
          }

          next();
        },
      },
      {
        name: APP_ROUTES.Home.SpaceSelectionPage,
        path: "/space-selection/:spaceProviderId/all",
        component: () => import("@/components/spaces/SpaceSelectionPage.vue"),
      },
      {
        name: APP_ROUTES.Home.SpaceSelectionPage,
        path: "/space-selection/:spaceProviderId/:groupId",
        component: () => import("@/components/spaces/SpaceSelectionPage.vue"),
      },
      {
        name: APP_ROUTES.Home.SpaceBrowsingPage,
        path: "/space-browsing/:spaceProviderId/:groupId/:spaceId/:itemId",
        component: () => import("@/components/spaces/SpaceBrowsingPage.vue"),
      },
    ],
    meta: { showUpdateBanner: true },
  }),
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.afterEach((to, from) => {
  if (to.name === APP_ROUTES.WorkflowPage && from.matched[0]?.name === Home) {
    lastHomePath = from.fullPath;
  }
});

export { router };
