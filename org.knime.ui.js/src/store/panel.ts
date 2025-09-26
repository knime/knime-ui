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
  activeTab: Record<string, TabValues>;
  isLeftPanelExpanded: boolean;
  isExtensionPanelOpen: boolean;
  isRightPanelExpanded: boolean;
  isCommandPanelVisible: boolean;
}

export const usePanelStore = defineStore("panel", {
  state: (): PanelState => ({
    activeTab: {},
    isLeftPanelExpanded: true,
    isExtensionPanelOpen: false,
    isRightPanelExpanded: true,
    isCommandPanelVisible: false,
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
      this.isLeftPanelExpanded = true;
    },

    toggleLeftPanel() {
      this.isLeftPanelExpanded = !this.isLeftPanelExpanded;
    },

    closeLeftPanel() {
      this.isLeftPanelExpanded = false;
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
