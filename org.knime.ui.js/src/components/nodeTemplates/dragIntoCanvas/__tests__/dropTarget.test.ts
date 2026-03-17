import { afterEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

import { createNodeTemplateWithExtendedPorts } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import { KNIME_MIME } from "../constants";
import { useDropTarget } from "../dropTarget";
import { useSharedState } from "../state";

// mock the panning composable so we can spy on startPanningToEdge
const startPanningToEdgeSpy = vi.fn();
vi.mock(
  "@/components/workflowEditor/WebGLKanvas/kanvas/useDragNearEdgePanning",
  () => ({
    useDragNearEdgePanning: () => ({
      startPanningToEdge: startPanningToEdgeSpy,
    }),
  }),
);

vi.mock("@/components/workflowEditor/util/canvasRenderer", () => ({
  useCanvasRendererUtils: () => ({
    isSVGRenderer: ref(false),
    isWebGLRenderer: ref(true),
  }),
}));

describe("dropTarget", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  const setup = () => {
    const mockedStores = mockStores();
    const dropTarget = useDropTarget();

    return { mockedStores, dropTarget };
  };

  const createMockDragEvent = () => {
    return {
      clientX: 0,
      clientY: 0,
      currentTarget: { style: {} },
      target: { style: {} },
      dataTransfer: {
        types: [],
        dropEffect: "",
        setData: vi.fn(),
        getData: vi.fn(),
      },
      preventDefault: vi.fn(),
    } as unknown as DragEvent;
  };

  it("sets dropEffect to none when workflow is read-only and initializes drag time", () => {
    const { mockedStores, dropTarget } = setup();

    // make workflow read-only
    (mockedStores.workflowStore as any).isWritable = false;

    const { dragTime } = useSharedState();

    const mockEvent = createMockDragEvent();

    expect(dragTime.isSet()).toBe(false);

    dropTarget.onDragOver(mockEvent);

    expect(mockEvent.dataTransfer!.dropEffect).toBe("none");
    expect(dragTime.isSet()).toBe(true);
  });

  it("sets dropEffect to copy when writable and event contains KNIME_MIME", () => {
    const { mockedStores, dropTarget } = setup();

    (mockedStores.workflowStore as any).isWritable = true;

    const mockEvent = createMockDragEvent();
    (mockEvent.dataTransfer as any).types = [KNIME_MIME];

    dropTarget.onDragOver(mockEvent);

    expect(mockEvent.dataTransfer!.dropEffect).toBe("copy");
  });

  it("starts panning to edge when using WebGL renderer and drag time threshold exceeded", () => {
    const { mockedStores, dropTarget } = setup();

    // force WebGL renderer
    window.localStorage.setItem("KNIME_KANVAS_RENDERER", "WebGL");

    (mockedStores.workflowStore as any).isWritable = true;

    const { dragTime } = useSharedState();

    // set drag start time far enough in the past so the threshold is exceeded
    dragTime.init(window.performance.now() - 1000);

    const mockEvent = createMockDragEvent();

    dropTarget.onDragOver(mockEvent);

    expect(startPanningToEdgeSpy).toHaveBeenCalled();
  });

  it("onDrop adds native node and triggers callback", async () => {
    const { mockedStores, dropTarget } = setup();

    (mockedStores.workflowStore as any).isWritable = true;

    // ensure WebGL renderer so screenToCanvasCoordinates is used
    window.localStorage.setItem("KNIME_KANVAS_RENDERER", "WebGL");

    // prepare dragged template
    const mockNodeTemplate = createNodeTemplateWithExtendedPorts();
    const { draggedTemplateData, callbacks } = useSharedState();

    draggedTemplateData.value = mockNodeTemplate;

    // register onNodeAdded callback
    const onNodeAdded = vi.fn();
    callbacks.schedule("onNodeAdded", onNodeAdded as any);

    // stub screenToCanvasCoordinates
    (mockedStores.webglCanvasStore as any).screenToCanvasCoordinates = vi.fn(
      () => [42, 24],
    );

    // stub addNativeNode to return a newNodeId
    mockedStores.nodeInteractionsStore.addNativeNode = vi.fn(() =>
      Promise.resolve({ newNodeId: "root:1" }),
    );

    // stub getNodeById to return a node
    mockedStores.nodeInteractionsStore.getNodeById = vi.fn(
      () => ({ id: "root:1" }) as any,
    );

    const mockEvent = createMockDragEvent();

    await dropTarget.onDrop(mockEvent, { x: 10, y: 20 });

    expect(mockedStores.nodeInteractionsStore.addNativeNode).toHaveBeenCalled();
    expect(onNodeAdded).toHaveBeenCalled();
  });
});
