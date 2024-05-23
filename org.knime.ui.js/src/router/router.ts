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

export const routes: Array<RouteRecordRaw> = [
  {
    name: APP_ROUTES.WorkflowPage,
    path: "/workflow/:projectId/:workflowId",
    component: WorkflowPage,
  },

  ...registerRoute("DESKTOP", {
    path: "/",
    component: () => import("@/components/homepage/HomePageLayout.vue"),
    children: [
      {
        name: APP_ROUTES.Home.GetStarted,
        path: "/get-started",
        component: () => import("@/components/homepage/GetStartedPage.vue"),
      },
      {
        name: APP_ROUTES.Home.SpaceSelectionPage,
        path: "/space-selection/:spaceProviderId/:groupId",
        component: () => import("@/components/spaces/SpaceSelectionPage.vue"),
      },
      {
        name: APP_ROUTES.Home.SpaceBrowsingPage,
        path: "/space-browsing/:spaceProviderId/:groupId/:spaceId",
        component: () => import("@/components/spaces/SpaceBrowsingPage.vue"),
      },
    ],
    meta: { showUpdateBanner: true },
  }),
];

export const getPathFromRouteName = (name: string) => {
  const searchByName = (
    _routes: typeof routes,
    name: string,
    fullPath = "",
  ): string => {
    const foundRoute = _routes.find((route) => route.name === name);
    if (foundRoute) {
      return `${fullPath}${foundRoute.path}`;
    }

    let result: string = "";
    for (let i = 0; i < _routes.length; i++) {
      const currentRoute = _routes[i];
      if (currentRoute.children) {
        result = searchByName(
          routes[i]?.children ?? [],
          name,
          currentRoute.path,
        );
      }
    }
    return result;
  };

  return searchByName(routes, name).replaceAll("//", "/");
};

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export { router };
