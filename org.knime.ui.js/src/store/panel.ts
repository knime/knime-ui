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
  /** Whether the compact KAI chat panel at the bottom is open */
  isKaiCompactOpen: boolean;
  /** Incremented each time the search shortcut is triggered to (re-)focus the search input */
  searchFocusTrigger: number;
  /** Width (px) of the config panel when docked to the right edge; 0 when floating or docked left */
  dockedRightPanelWidth: number;
  /** Whether the deploy-type selection / config panel is open */
  isDeployPanelOpen: boolean;
  /** Whether the standalone workflow search panel is open */
  isSearchPanelOpen: boolean;
}

export const usePanelStore = defineStore("panel", {
  state: (): PanelState => ({
    activeTab: {},
    isLeftPanelExpanded: false,
    isExtensionPanelOpen: false,
    isRightPanelExpanded: false,
    isKaiCompactOpen: false,
    searchFocusTrigger: 0,
    dockedRightPanelWidth: 0,
    isDeployPanelOpen: false,
    isSearchPanelOpen: false,
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

    openWorkflowSearch() {
      this.isSearchPanelOpen = true;
      this.searchFocusTrigger++;
    },

    closeWorkflowSearch() {
      this.isSearchPanelOpen = false;
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
