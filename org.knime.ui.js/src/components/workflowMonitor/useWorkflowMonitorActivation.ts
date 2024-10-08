import { computed, watch } from "vue";
import { debounce } from "lodash-es";

import { useStore } from "@/composables/useStore";
import { lifecycleBus } from "@/store/application/lifecycle-events";
import { TABS, type TabValues } from "@/store/panel";

export const useWorkflowMonitorActivation = () => {
  const store = useStore();

  const isTabActive = computed<(tabName: TabValues) => boolean>(
    () => store.getters["panel/isTabActive"],
  );

  const activeProjectId = computed(
    () => store.state.application.activeProjectId,
  );

  const DEBOUNCE_DELAY_MS = 300;

  const toggleWorkflowMonitor = debounce(() => {
    const action = isTabActive.value(TABS.WORKFLOW_MONITOR)
      ? "activate"
      : "deactivate";

    store.dispatch(`workflowMonitor/${action}WorkflowMonitor`);
  }, DEBOUNCE_DELAY_MS);

  const activePanelTab = computed(() => store.state.panel.activeTab);

  watch(activeProjectId, () => {
    store.dispatch("workflowMonitor/deactivateWorkflowMonitor");

    if (isTabActive.value(TABS.WORKFLOW_MONITOR)) {
      lifecycleBus.once("onWorkflowLoaded", () => {
        store.dispatch("workflowMonitor/activateWorkflowMonitor");
      });
    }
  });

  watch(activePanelTab, () => {
    toggleWorkflowMonitor();
  });
};
