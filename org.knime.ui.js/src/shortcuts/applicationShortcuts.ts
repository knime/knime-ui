import type { Router } from "vue-router";

import { isDesktop } from "@/environment";
import { APP_ROUTES } from "@/router/appRoutes";
import { useApplicationStore } from "@/store/application/application";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { useSpaceCachingStore } from "@/store/spaces/caching";
import {
  cachedLocalSpaceProjectId,
  globalSpaceBrowserProjectId,
} from "@/store/spaces/common";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import { useSpacesStore } from "@/store/spaces/spaces";
import { useDesktopInteractionsStore } from "@/store/workflow/desktopInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { openInspector } from "@/util/debug";

import type { UnionToShortcutRegistry } from "./types";

type ApplicationShortcuts = UnionToShortcutRegistry<
  | "closeProject"
  | "createWorkflow"
  | "switchToNextWorkflow"
  | "switchToPreviousWorkflow"
  | "openDevTools"
>;

declare module "./index" {
  interface ShortcutsRegistry extends ApplicationShortcuts {}
}

const switchActiveProject = (router: Router, offset: -1 | 1) => {
  const { openProjects, activeProjectId } = useApplicationStore();

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
    text: "Close workflow/component",
    hotkey: ["CtrlOrCmd", "W"],
    group: "general",
    execute: () =>
      useDesktopInteractionsStore().closeProject(
        useWorkflowStore().activeWorkflow!.projectId,
      ),
    condition: () => useWorkflowStore().activeWorkflow?.projectId !== null,
  },
  createWorkflow: {
    text: "Create workflow",
    hotkey: ["CtrlOrCmd", "N"],
    group: "general",
    execute: () => {
      const { activeProjectId } = useApplicationStore();
      const { projectPath } = useSpaceCachingStore();

      const globalSpaceBrowserProject =
        projectPath[globalSpaceBrowserProjectId] && globalSpaceBrowserProjectId;

      const localSpaceProject =
        projectPath[cachedLocalSpaceProjectId] && cachedLocalSpaceProjectId;

      const isUnknownProject =
        useApplicationStore().isUnknownProject(activeProjectId);

      const projectId = isUnknownProject
        ? localSpaceProject
        : activeProjectId ?? globalSpaceBrowserProject ?? localSpaceProject;

      useSpacesStore().setCreateWorkflowModalConfig({
        isOpen: true,
        projectId,
      });
    },
    condition: () => !useSpaceOperationsStore().isLoadingContent,
  },
  switchToNextWorkflow: {
    text: "Switch to next opened workflow",
    hotkey: ["Ctrl", "Tab"],
    group: "general",
    execute: ({ $router }) => {
      switchActiveProject($router, 1);
    },
  },
  switchToPreviousWorkflow: {
    text: "Switch to previous opened workflow",
    hotkey: ["Ctrl", "Shift", "Tab"],
    group: "general",
    execute: ({ $router }) => {
      switchActiveProject($router, -1);
    },
  },
  openDevTools: {
    hotkey: ["F12"],
    additionalHotkeys: [{ key: ["Ctrl", "Shift", "I"], visible: false }],
    text: "Dev Tools",
    hidden: true,
    execute: () => {
      openInspector();
    },
    condition: () => useApplicationSettingsStore().devMode && isDesktop(),
  },
};

export default applicationShortcuts;
