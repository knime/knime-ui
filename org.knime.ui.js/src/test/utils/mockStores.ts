import { vi } from "vitest";
import { createTestingPinia } from "@pinia/testing";

import { useAIAssistantStore } from "@/store/aiAssistant";
import { useApplicationStore } from "@/store/application/application";
import { useCanvasModesStore } from "@/store/application/canvasModes";
import { useCanvasStateTrackingStore } from "@/store/application/canvasStateTracking";
import { useDirtyProjectsTrackingStore } from "@/store/application/dirtyProjectsTracking";
import { useGlobalLoaderStore } from "@/store/application/globalLoader";
import { useLifecycleStore } from "@/store/application/lifecycle";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { useWorkflowPreviewSnapshotsStore } from "@/store/application/workflowPreviewSnapshots";
import { useSVGCanvasStore } from "@/store/canvas/canvas-svg";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useCompositeViewStore } from "@/store/compositeView/compositeView";
import { useFloatingConnectorStore } from "@/store/floatingConnector/floatingConnector";
import { useNodeConfigurationStore } from "@/store/nodeConfiguration/nodeConfiguration";
import { useNodeDescriptionStore } from "@/store/nodeDescription/nodeDescription";
import { useNodeRepositoryStore } from "@/store/nodeRepository";
import { useNodeTemplatesStore } from "@/store/nodeTemplates/nodeTemplates";
import { usePanelStore } from "@/store/panel";
import { useQuickAddNodesStore } from "@/store/quickAddNodes";
import { useSelectionStore } from "@/store/selection";
import { useSettingsStore } from "@/store/settings";
import { useSpaceAuthStore } from "@/store/spaces/auth";
import { useSpaceCachingStore } from "@/store/spaces/caching";
import { useDeploymentsStore } from "@/store/spaces/deployments";
import { useSpaceDownloadsStore } from "@/store/spaces/downloads";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import { useSpacesStore } from "@/store/spaces/spaces";
import { useSpaceUploadsStore } from "@/store/spaces/uploads";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { useAnnotationInteractionsStore } from "@/store/workflow/annotationInteractions";
import { useClipboardInteractionsStore } from "@/store/workflow/clipboardInteractions";
import { useComponentInteractionsStore } from "@/store/workflow/componentInteractions";
import { useConnectionInteractionsStore } from "@/store/workflow/connectionInteractions";
import { useDesktopInteractionsStore } from "@/store/workflow/desktopInteractions";
import { useExecutionStore } from "@/store/workflow/execution";
import { useMovingStore } from "@/store/workflow/moving";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { useWorkflowVersionsStore } from "@/store/workflow/workflowVersions";
import { useWorkflowMonitorStore } from "@/store/workflowMonitor/workflowMonitor";

export const mockStores = ({ stubActions = false } = {}) => {
  const testingPinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions,
  });

  const applicationStore = useApplicationStore(testingPinia);
  const applicationSettingsStore = useApplicationSettingsStore(testingPinia);
  const canvasModesStore = useCanvasModesStore(testingPinia);
  const canvasStateTrackingStore = useCanvasStateTrackingStore(testingPinia);
  const dirtyProjectsTrackingStore =
    useDirtyProjectsTrackingStore(testingPinia);
  const globalLoaderStore = useGlobalLoaderStore(testingPinia);
  const lifecycleStore = useLifecycleStore(testingPinia);
  const workflowPreviewSnapshotsStore =
    useWorkflowPreviewSnapshotsStore(testingPinia);
  const nodeConfigurationStore = useNodeConfigurationStore(testingPinia);
  const nodeDescriptionStore = useNodeDescriptionStore(testingPinia);
  const nodeTemplatesStore = useNodeTemplatesStore(testingPinia);
  const spaceAuthStore = useSpaceAuthStore(testingPinia);
  const spaceCachingStore = useSpaceCachingStore(testingPinia);
  const deploymentsStore = useDeploymentsStore(testingPinia);
  const spaceProvidersStore = useSpaceProvidersStore(testingPinia);
  const spaceOperationsStore = useSpaceOperationsStore(testingPinia);
  const spacesStore = useSpacesStore(testingPinia);
  const spaceUploadsStore = useSpaceUploadsStore(testingPinia);
  const spaceDownloadsStore = useSpaceDownloadsStore(testingPinia);

  const uiControlsStore = useUIControlsStore(testingPinia);
  const annotationInteractionsStore =
    useAnnotationInteractionsStore(testingPinia);
  const clipboardInteractionsStore =
    useClipboardInteractionsStore(testingPinia);
  const componentInteractionsStore =
    useComponentInteractionsStore(testingPinia);
  const connectionInteractionsStore =
    useConnectionInteractionsStore(testingPinia);
  const desktopInteractionsStore = useDesktopInteractionsStore(testingPinia);
  const executionStore = useExecutionStore(testingPinia);
  const canvasAnchoredComponentsStore =
    useCanvasAnchoredComponentsStore(testingPinia);
  const movingStore = useMovingStore(testingPinia);
  const nodeInteractionsStore = useNodeInteractionsStore(testingPinia);
  const workflowStore = useWorkflowStore(testingPinia);
  const workflowMonitorStore = useWorkflowMonitorStore(testingPinia);
  const workflowVersionsStore = useWorkflowVersionsStore(testingPinia);
  const aiAssistantStore = useAIAssistantStore(testingPinia);
  const canvasStore = useSVGCanvasStore(testingPinia);
  const webglCanvasStore = useWebGLCanvasStore(testingPinia);
  const nodeRepositoryStore = useNodeRepositoryStore(testingPinia);
  const panelStore = usePanelStore(testingPinia);
  const quickAddNodesStore = useQuickAddNodesStore(testingPinia);
  const selectionStore = useSelectionStore(testingPinia);
  const settingsStore = useSettingsStore(testingPinia);
  const floatingConnectorStore = useFloatingConnectorStore(testingPinia);

  const compositeViewStore = useCompositeViewStore(testingPinia);

  uiControlsStore.init();

  const kanvas = document.createElement("div");
  kanvas.setAttribute("id", "kanvas");
  kanvas.appendChild(
    document.createElementNS("http://www.w3.org/2000/svg", "svg"),
  );
  kanvas.scrollTo = vi.fn();
  document.body.appendChild(kanvas);

  return {
    testingPinia,
    applicationStore,
    applicationSettingsStore,
    canvasModesStore,
    canvasStateTrackingStore,
    dirtyProjectsTrackingStore,
    globalLoaderStore,
    lifecycleStore,
    workflowPreviewSnapshotsStore,
    nodeConfigurationStore,
    nodeDescriptionStore,
    nodeTemplatesStore,
    spaceAuthStore,
    spaceCachingStore,
    deploymentsStore,
    spaceProvidersStore,
    spaceOperationsStore,
    spacesStore,
    spaceUploadsStore,
    spaceDownloadsStore,
    uiControlsStore,
    annotationInteractionsStore,
    clipboardInteractionsStore,
    componentInteractionsStore,
    connectionInteractionsStore,
    desktopInteractionsStore,
    executionStore,
    canvasAnchoredComponentsStore,
    movingStore,
    nodeInteractionsStore,
    workflowStore,
    workflowMonitorStore,
    workflowVersionsStore,
    aiAssistantStore,
    canvasStore,
    nodeRepositoryStore,
    panelStore,
    quickAddNodesStore,
    selectionStore,
    settingsStore,
    webglCanvasStore,
    floatingConnectorStore,
    compositeViewStore,
  };
};
