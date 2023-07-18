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
  route: RouteRecordRaw
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
        name: APP_ROUTES.EntryPage.GetStartedPage,
        path: "/get-started",
        component: () => import("@/components/entryPage/GetStartedPage.vue"),
        meta: { showUpdateBanner: true },
      },
      // TODO: NXT-1461 enable again when we have a dedicated stand alone SpaceSelection page again
      // {
      //    name: APP_ROUTES.EntryPage.SpaceSelectionPage,
      //    path: '/space-selection',
      //    component: SpaceSelectionPage,
      //    meta: { showUpdateBanner: true }
      // }
    ],
  }),

  ...registerRoute("DESKTOP", {
    name: APP_ROUTES.SpaceBrowsingPage,
    path: "/space-browsing",
    component: () => import("@/components/spaces/SpaceBrowsingPage.vue"),
  }),

  ...registerRoute("DESKTOP", {
    name: APP_ROUTES.InfoPage,
    path: "/info",
    component: () => import("@/components/infoPage/InfoPage.vue"),
  }),
];

export const getPathFromRouteName = (name) => {
  const searchByName = (_routes, name, fullPath = "") => {
    const foundRoute = _routes.find((route) => route.name === name);
    if (foundRoute) {
      return `${fullPath}${foundRoute.path}`;
    }

    let result = null;
    for (let i = 0; i < _routes.length; i++) {
      const currentRoute = _routes[i];
      if (currentRoute.children) {
        result = searchByName(routes[i].children, name, currentRoute.path);
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

export const muteRouterExceptions = (_router) => {
  // See: https://github.com/vuejs/vue-router/issues/2932#issuecomment-533453711
  const originalPush = _router.push;
  _router.push = function push(location, onResolve, onReject) {
    if (onResolve || onReject) {
      return originalPush.call(this, location, onResolve, onReject);
    }

    const ERROR_TYPES = {
      2: "redirected",
      4: "aborted",
      8: "cancelled",
      16: "duplicated",
    };

    return originalPush.call(this, location).catch((error) => {
      if (!ERROR_TYPES[error.type]) {
        // If there really is an error, throw it
        return Promise.reject(error);
      }

      // Otherwise resolve to false to indicate the original push call didn't go to its original
      // destination.
      return Promise.resolve(false);
    });
  };
};

// muteRouterExceptions(router);

export { router };
