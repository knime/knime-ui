import { watch } from "vue";
import { debounce } from "lodash-es";
import { storeToRefs } from "pinia";

import { useApplicationStore } from "@/store/application/application";
import { lifecycleBus } from "@/store/application/lifecycle-events";
import { TABS, usePanelStore } from "@/store/panel";
import { useWorkflowMonitorStore } from "@/store/workflowMonitor/workflowMonitor";

export const useWorkflowMonitorActivation = () => {
  const { isTabActive, activeTab: activePanelTab } = storeToRefs(
    usePanelStore(),
  );
  const { activeProjectId } = storeToRefs(useApplicationStore());
  const workflowMonitorStore = useWorkflowMonitorStore();

  const DEBOUNCE_DELAY_MS = 300;

  const toggleWorkflowMonitor = debounce(() => {
    const action = isTabActive.value(TABS.WORKFLOW_MONITOR)
      ? workflowMonitorStore.activateWorkflowMonitor
      : workflowMonitorStore.deactivateWorkflowMonitor;

    action();
  }, DEBOUNCE_DELAY_MS);

  watch(activeProjectId, () => {
    workflowMonitorStore.deactivateWorkflowMonitor();

    if (isTabActive.value(TABS.WORKFLOW_MONITOR)) {
      lifecycleBus.once("onWorkflowLoaded", () => {
        workflowMonitorStore.activateWorkflowMonitor();
      });
    }
  });

  watch(activePanelTab, () => {
    toggleWorkflowMonitor();
  });
};
