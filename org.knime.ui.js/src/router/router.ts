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
    component: () => import("@/components/entryPage/EntryPageLayout.vue"),
    children: [
      {
        name: APP_ROUTES.EntryPage.HomePage,
        path: "/home",
        component: () => import("@/components/entryPage/HomePage.vue"),
        meta: { showUpdateBanner: true },
      },
      {
        name: APP_ROUTES.EntryPage.SpaceProviderPage,
        path: "/space-provider",
        component: () => import("@/components/spaces/SpaceProviderPage.vue"),
      },
    ],
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
