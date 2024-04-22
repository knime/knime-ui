import {
  cachedLocalSpaceProjectId,
  globalSpaceBrowserProjectId,
} from "@/store/spaces";
import type { UnionToShortcutRegistry } from "./types";

type ApplicationShortcuts = UnionToShortcutRegistry<
  "closeProject" | "createWorkflow"
>;

declare module "./index" {
  interface ShortcutsRegistry extends ApplicationShortcuts {}
}

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
};

export default applicationShortcuts;
