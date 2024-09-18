import {
  cachedLocalSpaceProjectId,
  globalSpaceBrowserProjectId,
} from "@/store/spaces";
import type { UnionToShortcutRegistry } from "./types";
import { APP_ROUTES } from "@/router/appRoutes";
import type { Router } from "vue-router";
import type { RootStoreState } from "@/store/types";
import type { Store } from "vuex";

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
  const currentIndex = openProjects.findIndex(
    (p) => p.projectId === activeProjectId,
  );
  const nextIndex =
    (currentIndex + offset + openProjects.length) % openProjects.length;

  router.push({
    name: APP_ROUTES.WorkflowPage,
    params: {
      projectId: openProjects[nextIndex].projectId,
      workflowId: "root",
    },
  });
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
    hotkey: ["CtrlOrCmd", "Tab"],
    group: "general",
    execute: ({ $store, $router }) => {
      switchActiveProject($store, $router, 1);
    },
    condition: ({ $store }) =>
      Boolean($store.state.application.activeProjectId) &&
      $store.state.application.openProjects.length >= 2,
  },
  switchToPreviousWorkflow: {
    text: "Switch to previous opened workflow",
    hotkey: ["CtrlOrCmd", "Shift", "Tab"],
    group: "general",
    execute: ({ $store, $router }) => {
      switchActiveProject($store, $router, -1);
    },
    condition: ({ $store }) =>
      Boolean($store.state.application.activeProjectId) &&
      $store.state.application.openProjects.length >= 2,
  },
};

export default applicationShortcuts;
