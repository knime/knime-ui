import type { Router } from "vue-router";
import type { Store } from "vuex";

import { APP_ROUTES } from "@/router/appRoutes";
import {
  cachedLocalSpaceProjectId,
  globalSpaceBrowserProjectId,
} from "@/store/spaces";
import type { RootStoreState } from "@/store/types";

import type { UnionToShortcutRegistry } from "./types";

type ApplicationShortcuts = UnionToShortcutRegistry<
  | "closeProject"
  | "createWorkflow"
  | "switchToNextWorkflow"
  | "switchToPreviousWorkflow"
>;

declare module "./index" {
  interface ShortcutsRegistry extends ApplicationShortcuts {}
}

const switchActiveProject = (
  store: Store<RootStoreState>,
  router: Router,
  offset: -1 | 1,
) => {
  const { openProjects, activeProjectId } = store.state.application;

  type Ids = (string | null)[];
  const allIds = ([null] as Ids).concat(openProjects.map((p) => p.projectId));

  // add +1 to index due to null being the 1st position in the ids array
  const currentProjIndex =
    openProjects.findIndex((p) => p.projectId === activeProjectId) + 1;

  const nextIndex = (currentProjIndex + offset + allIds.length) % allIds.length;

  if (allIds[nextIndex]) {
    router.push({
      name: APP_ROUTES.WorkflowPage,
      params: { projectId: allIds[nextIndex], workflowId: "root" },
    });
  } else {
    router.push({ name: APP_ROUTES.Home.GetStarted });
  }
};

const applicationShortcuts: ApplicationShortcuts = {
  closeProject: {
    text: "Close workflow",
    hotkey: ["CtrlOrCmd", "W"],
    group: "general",
    execute: ({ $store }) =>
      $store.dispatch(
        "workflow/closeProject",
        $store.state.workflow.activeWorkflow?.projectId,
      ),
    condition: ({ $store }) =>
      $store.state.workflow.activeWorkflow?.projectId !== null,
  },
  createWorkflow: {
    text: "Create workflow",
    hotkey: ["CtrlOrCmd", "N"],
    group: "general",
    execute: ({ $store }) => {
      const { activeProjectId } = $store.state.application;
      const { projectPath } = $store.state.spaces;

      const globalSpaceBrowserProject =
        projectPath[globalSpaceBrowserProjectId] && globalSpaceBrowserProjectId;

      const localSpaceProject =
        projectPath[cachedLocalSpaceProjectId] && cachedLocalSpaceProjectId;

      const isUnknownProject =
        $store.getters["application/isUnknownProject"](activeProjectId);

      const projectId = isUnknownProject
        ? localSpaceProject
        : activeProjectId ?? globalSpaceBrowserProject ?? localSpaceProject;

      $store.commit("spaces/setCreateWorkflowModalConfig", {
        isOpen: true,
        projectId,
      });
    },
    condition: ({ $store }) => !$store.state.spaces.isLoadingContent,
  },
  switchToNextWorkflow: {
    text: "Switch to next opened workflow",
    hotkey: ["Ctrl", "Tab"],
    group: "general",
    execute: ({ $store, $router }) => {
      switchActiveProject($store, $router, 1);
    },
  },
  switchToPreviousWorkflow: {
    text: "Switch to previous opened workflow",
    hotkey: ["Ctrl", "Shift", "Tab"],
    group: "general",
    execute: ({ $store, $router }) => {
      switchActiveProject($store, $router, -1);
    },
  },
};

export default applicationShortcuts;
