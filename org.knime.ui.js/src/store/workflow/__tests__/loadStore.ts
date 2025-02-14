import { vi } from "vitest";
import { createTestingPinia } from "@pinia/testing";

import { useApplicationStore } from "@/store/application/application";
import { useCanvasStateTrackingStore } from "@/store/application/canvasStateTracking";
import { useWorkflowPreviewSnapshotsStore } from "@/store/application/workflowPreviewSnapshots";
import { useCanvasStore } from "@/store/canvas";
import { useNodeConfigurationStore } from "@/store/nodeConfiguration/nodeConfiguration";
import { useSelectionStore } from "@/store/selection";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { useAnnotationInteractionsStore } from "../annotationInteractions";
import { useClipboardInteractionsStore } from "../clipboardInteractions";
import { useComponentInteractionsStore } from "../componentInteractions";
import { useDesktopInteractionsStore } from "../desktopInteractions";
import { useExecutionStore } from "../execution";
import { useMovingStore } from "../moving";
import { useNodeInteractionsStore } from "../nodeInteractions";
import { useWorkflowStore } from "../workflow";

export const loadStore = () => {
  const testingPinia = createTestingPinia({
    stubActions: false,
    createSpy: vi.fn,
  });

  const workflowStore = useWorkflowStore(testingPinia);

  const annotationInteractionsStore =
    useAnnotationInteractionsStore(testingPinia);
  const selectionStore = useSelectionStore(testingPinia);
  const applicationStore = useApplicationStore(testingPinia);
  const clipboardInteractionsStore =
    useClipboardInteractionsStore(testingPinia);

  const canvasStore = useCanvasStore(testingPinia);
  const kanvas = document.createElement("div");
  kanvas.setAttribute("id", "kanvas");
  kanvas.scrollTo = vi.fn();
  document.body.appendChild(kanvas);

  const canvasStateTrackingStore = useCanvasStateTrackingStore(testingPinia);

  const componentInteractionsStore =
    useComponentInteractionsStore(testingPinia);
  const spaceOperationsStore = useSpaceOperationsStore(testingPinia);
  const executionStore = useExecutionStore(testingPinia);
  const desktopInteractionsStore = useDesktopInteractionsStore(testingPinia);
  const nodeConfigurationStore = useNodeConfigurationStore(testingPinia);
  const workflowSnapshotsStore = useWorkflowPreviewSnapshotsStore(testingPinia);
  const movingStore = useMovingStore();
  const nodeInteractionsStore = useNodeInteractionsStore(testingPinia);
  const uiControlsStore = useUIControlsStore(testingPinia);
  uiControlsStore.init();

  return {
    workflowStore,
    annotationInteractionsStore,
    selectionStore,
    applicationStore,
    clipboardInteractionsStore,
    canvasStore,
    componentInteractionsStore,
    spaceOperationsStore,
    executionStore,
    desktopInteractionsStore,
    nodeConfigurationStore,
    workflowSnapshotsStore,
    canvasStateTrackingStore,
    movingStore,
    nodeInteractionsStore,
    uiControlsStore,
  };
};
