import { defineStore } from "pinia";

import { useApplicationStore } from "@/store/application/application";
import { useWorkflowStore } from "@/store/workflow/workflow";

/**
 * Store that manages the global state of the side-panel (tabs plus expanding drawer).
 */
export const TABS = {
  CONTEXT_AWARE_DESCRIPTION: "description",
  NODE_REPOSITORY: "nodeRepository",
  NODE_DIALOG: "nodeDialog",
  SPACE_EXPLORER: "spaceExplorer",
  KAI: "kai",
  WORKFLOW_MONITOR: "workflowMonitor",
} as const;

type TabKeys = keyof typeof TABS;
export type TabValues = (typeof TABS)[TabKeys];
export interface PanelState {
  expanded: boolean;
  activeTab: Record<string, TabValues>;
  isExtensionPanelOpen: boolean;
}

export const usePanelStore = defineStore("panel", {
  state: (): PanelState => ({
    expanded: true,
    activeTab: {},
    isExtensionPanelOpen: false,
  }),
  actions: {
    setActiveTab({
      projectId,
      activeTab,
    }: {
      projectId: string;
      activeTab: TabValues;
    }) {
      this.activeTab = {
        ...this.activeTab,
        [projectId]: activeTab,
      };
      this.expanded = true;
    },

    toggleExpanded() {
      this.expanded = !this.expanded;
    },

    closePanel() {
      this.expanded = false;
    },

    setCurrentProjectActiveTab(activeTab: TabValues) {
      const projectId = useApplicationStore().activeProjectId;

      if (projectId === null) {
        return;
      }

      this.setActiveTab({ projectId, activeTab });
    },

    openExtensionPanel() {
      this.isExtensionPanelOpen = true;
    },

    closeExtensionPanel() {
      this.isExtensionPanelOpen = false;
    },
  },
  getters: {
    isTabActive(state) {
      return (tabName: TabValues) => {
        const activeProjectId = useApplicationStore().activeProjectId;

        const getDefaultTab = () => {
          return useWorkflowStore().isWorkflowEmpty
            ? TABS.NODE_REPOSITORY
            : TABS.CONTEXT_AWARE_DESCRIPTION;
        };

        if (!activeProjectId) {
          return false;
        }

        const _activeTab = state.activeTab[activeProjectId] || getDefaultTab();

        return _activeTab === tabName;
      };
    },
  },
});
