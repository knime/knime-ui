import { beforeEach, describe, expect, it, vi } from "vitest";

import { useExecutionStore } from "@/store/workflow/execution";
import {
  createConnection,
  createNativeNode,
  createWorkflow,
  createWorkflowAnnotation,
} from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import {
  type PageBuilderControl,
  useCompositeViewStore,
} from "../compositeView";

const mockUrl = vi.hoisted(() => "mocked-url");

vi.mock("@/components/uiExtensions/common/useResourceLocation", () => ({
  resourceLocationResolver: vi.fn(() => mockUrl),
}));

vi.mock("../pageBuilderStore", () => ({
  pageBuilderApiVuexStoreConfig: { state: {}, actions: {} },
}));

const mockPageBuilderControl: PageBuilderControl = vi.hoisted(() => ({
  mountShadowApp: vi.fn(),
  loadPage: vi.fn(() => Promise.resolve()),
  isDirty: vi.fn(() => Promise.resolve(false)),
  isDefault: vi.fn(() => Promise.resolve(true)),
  hasPage: vi.fn(() => false),
  updateAndReexecute: vi.fn(() => Promise.resolve()),
  applyToDefaultAndExecute: vi.fn(() => Promise.resolve()),
  unmountShadowApp: vi.fn(),
}));

const mockCreatePageBuilder = vi.hoisted(() =>
  vi.fn(() => Promise.resolve(mockPageBuilderControl)),
);

vi.mock(mockUrl, () => ({
  createPageBuilderApp: mockCreatePageBuilder,
  // eslint-disable-next-line camelcase
  __v_isShallow: true, // To be honest, I do not understand why this is necessary. But without it, the dynamic import fails.
}));

const showPageBuilderUnsavedChangesDialogMock = vi.hoisted(vi.fn);

vi.mock("../showPageBuilderUnsavedChangesDialog", () => ({
  showPageBuilderUnsavedChangesDialog: showPageBuilderUnsavedChangesDialogMock,
}));

const someProjectId = "some-project-id";
const someNodeId = "node-123";

describe("composite view store", () => {
  describe("state management for pageBuilder integration", () => {
    beforeEach(() => {
      mockStores();
    });

    it("should initialize PageBuilder with correct environment and settings", async () => {
      await useCompositeViewStore().getPageBuilderControl(someProjectId);
      expect(mockCreatePageBuilder).toHaveBeenCalledWith(
        expect.objectContaining({
          state: {
            disallowWebNodes: true,
            disableWidgetsWhileExecuting: true,
            alwaysTearDownKnimePageBuilderAPI: true,
          },
        }),
        mockUrl,
      );
      expect((window as any).process.env.NODE_ENV).toBe(
        import.meta.env.NODE_ENV,
      );
    });

    it("mounts and unmounts the PageBuilder app correctly", async () => {
      const { getPageBuilderControl, isCompositeViewDirty } =
        useCompositeViewStore();
      const control = await getPageBuilderControl(someProjectId);
      await control.mountShadowApp("mock-shadow-root" as unknown as ShadowRoot);
      expect(mockPageBuilderControl.mountShadowApp).toHaveBeenCalled();
      expect(isCompositeViewDirty).toBe(false);
      expect(mockPageBuilderControl.hasPage()).toBe(false);
      control.unmountShadowApp();
      expect(mockPageBuilderControl.unmountShadowApp).toHaveBeenCalled();
    });

    it("should handle dirty state through UI interactions", async () => {
      const { getPageBuilderControl, clickAwayCompositeView } =
        useCompositeViewStore();
      await getPageBuilderControl(someProjectId);
      mockPageBuilderControl.isDirty.mockResolvedValueOnce(true);
      showPageBuilderUnsavedChangesDialogMock.mockResolvedValueOnce(false);
      const result = await clickAwayCompositeView();
      expect(result).toBeFalsy();
    });

    it("should continue if no active PageBuilder is set", async () => {
      const { clickAwayCompositeView, applyAndExecute, resetToDefaults } =
        useCompositeViewStore();
      mockPageBuilderControl.isDirty.mockResolvedValueOnce(true);
      showPageBuilderUnsavedChangesDialogMock.mockResolvedValueOnce(false);

      const clickawayResult = await clickAwayCompositeView();
      expect(clickawayResult).toBeTruthy();

      await applyAndExecute();
      expect(mockPageBuilderControl.updateAndReexecute).not.toHaveBeenCalled();

      await resetToDefaults(someNodeId);
      expect(useExecutionStore().executeNodes).not.toHaveBeenCalled();
    });

    it("should allow continuation when not dirty", async () => {
      const { clickAwayCompositeView } = useCompositeViewStore();
      mockPageBuilderControl.isDirty.mockResolvedValueOnce(false);
      const result = await clickAwayCompositeView();
      expect(result).toBeTruthy();
    });

    it("should not execute when PageBuilder is not mounted", async () => {
      const { applyAndExecute, getPageBuilderControl } =
        useCompositeViewStore();
      await getPageBuilderControl(someProjectId);
      await applyAndExecute();
      expect(mockPageBuilderControl.updateAndReexecute).not.toHaveBeenCalled();
    });

    it("should not execute when not dirty", async () => {
      const { applyAndExecute, getPageBuilderControl } =
        useCompositeViewStore();
      await getPageBuilderControl(someProjectId);
      mockPageBuilderControl.isDirty.mockResolvedValue(false);
      await applyAndExecute();
      expect(mockPageBuilderControl.updateAndReexecute).not.toHaveBeenCalled();
    });

    it("should not execute when no page exists", async () => {
      const { applyAndExecute, getPageBuilderControl } =
        useCompositeViewStore();
      await getPageBuilderControl(someProjectId);
      mockPageBuilderControl.isDirty.mockResolvedValue(true);
      mockPageBuilderControl.hasPage.mockReturnValue(false);
      await applyAndExecute();
      expect(mockPageBuilderControl.updateAndReexecute).not.toHaveBeenCalled();
    });

    it("should execute when conditions are met", async () => {
      const { applyAndExecute, getPageBuilderControl } =
        useCompositeViewStore();
      await getPageBuilderControl(someProjectId);
      mockPageBuilderControl.isDirty.mockResolvedValue(true);
      mockPageBuilderControl.hasPage.mockReturnValue(true);
      await applyAndExecute();
      expect(mockPageBuilderControl.updateAndReexecute).toHaveBeenCalled();
    });

    it("should not execute when PageBuilder not ready", async () => {
      const { applyToDefaultAndExecute } = useCompositeViewStore();
      await applyToDefaultAndExecute(someNodeId);
      expect(useExecutionStore().executeNodes).not.toHaveBeenCalled();
    });

    it("should apply as default and execute when conditions are met", async () => {
      const { applyToDefaultAndExecute, getPageBuilderControl } =
        useCompositeViewStore();
      await getPageBuilderControl(someProjectId);
      mockPageBuilderControl.hasPage.mockReturnValue(true);
      await applyToDefaultAndExecute(someNodeId);
      expect(useExecutionStore().executeNodes).toHaveBeenCalledWith([
        someNodeId,
      ]);
    });

    it("should reset node when PageBuilder is active", async () => {
      const { resetToDefaults, getPageBuilderControl } =
        useCompositeViewStore();
      await getPageBuilderControl(someProjectId);
      await resetToDefaults(someNodeId);
      expect(useExecutionStore().changeNodeState).toHaveBeenCalledWith({
        action: "reset",
        nodes: [someNodeId],
      });
      expect(useExecutionStore().executeNodes).toHaveBeenCalledWith([
        someNodeId,
      ]);
    });
  });

  describe("useReexecutingCompositeViewState", () => {
    const createWorkflowContext = () => {
      const { workflowStore, selectionStore } = mockStores();

      const node1 = createNativeNode({ id: "root:1" });
      const node2 = createNativeNode({ id: "root:2" });
      const connection1 = createConnection({ id: "1_to_2" });
      const connection2 = createConnection({ id: "2_to_1" });
      const annotation1 = createWorkflowAnnotation({
        id: "anno1604",
        text: { value: "Annotation text" },
      });
      const annotation2 = createWorkflowAnnotation({
        id: "anno1603",
        text: { value: "Annotation text 2" },
      });

      workflowStore.activeWorkflow = createWorkflow({
        nodes: { [node1.id]: node1, [node2.id]: node2 },
        connections: {
          [connection1.id]: connection1,
          [connection2.id]: connection2,
        },
        workflowAnnotations: [annotation1, annotation2],
      });

      return {
        selectionStore,
        workflowStore,
        node1,
        node2,
        connection1,
        connection2,
        annotation1,
        annotation2,
      };
    };

    it("removes old node ID when single selection changes", async () => {
      const { selectionStore, node1 } = createWorkflowContext();

      const { addReexecutingNode, isReexecuting } = useCompositeViewStore();

      await selectionStore.selectNodes([node1.id]);
      addReexecutingNode(node1.id);

      expect(isReexecuting(node1.id)).toBe(true);

      await selectionStore.deselectAllObjects();
      expect(isReexecuting(node1.id)).toBe(false);
    });

    it("handles multiple selections gracefully", async () => {
      const { selectionStore, node1, node2 } = createWorkflowContext();
      const { isReexecuting } = useCompositeViewStore();

      await selectionStore.selectNodes([node1.id, node2.id]);

      expect(isReexecuting("node1")).toBe(false);
      expect(isReexecuting("node2")).toBe(false);
    });

    it("adds node ID to reexecuting list", () => {
      const { node1 } = createWorkflowContext();
      const { addReexecutingNode, isReexecuting } = useCompositeViewStore();

      const result = addReexecutingNode(node1.id);

      expect(result).toBe("added");
      expect(isReexecuting(node1.id)).toBe(true);
    });

    it("returns 'alreadyExists' when adding an existing node ID", () => {
      const { node1 } = createWorkflowContext();
      const { addReexecutingNode, isReexecuting } = useCompositeViewStore();

      addReexecutingNode(node1.id);
      const result = addReexecutingNode(node1.id);

      expect(result).toBe("alreadyExists");
      expect(isReexecuting(node1.id)).toBe(true);
    });

    it("removes node ID from reexecuting list", () => {
      const { node1 } = createWorkflowContext();
      const { addReexecutingNode, removeReexecutingNode, isReexecuting } =
        useCompositeViewStore();

      addReexecutingNode(node1.id);
      removeReexecutingNode(node1.id);

      expect(isReexecuting(node1.id)).toBe(false);
    });
  });
});
