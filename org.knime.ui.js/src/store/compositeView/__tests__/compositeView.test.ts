import {
  type MockedObject,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { flushPromises } from "@vue/test-utils";

import { isBrowser, isDesktop } from "@/environment";
import { useExecutionStore } from "@/store/workflow/execution";
import {
  createConnection,
  createNativeNode,
  createWorkflow,
  createWorkflowAnnotation,
} from "@/test/factories";
import { mockEnvironment } from "@/test/utils/mockEnvironment";
import { mockStores } from "@/test/utils/mockStores";
import { type PageBuilderApi, useCompositeViewStore } from "../compositeView";

const mockUrl = vi.hoisted(() => "mocked-url");

vi.mock("@/services/webResourceLocation", () => ({
  webResourceLocation: {
    uiExtensionResource: vi.fn(() => mockUrl),
  },
}));

vi.mock("../pageBuilderStore", () => ({
  pageBuilderApiVuexStoreConfig: { state: {}, actions: {} },
}));

const mockPageBuilder: MockedObject<PageBuilderApi> = vi.hoisted(() => ({
  mountShadowApp: vi.fn(),
  loadPage: vi.fn((..._args: any[]) => Promise.resolve()),
  isDirty: vi.fn(() => Promise.resolve(false)),
  isDefault: vi.fn(() => Promise.resolve(true)),
  hasPage: vi.fn(() => false),
  applyAndExecute: vi.fn(() => Promise.resolve()),
  applyToDefaultAndExecute: vi.fn(() => Promise.resolve()),
  unmountShadowApp: vi.fn(),
}));

const mockCreatePageBuilder = vi.hoisted(() =>
  vi.fn(() => Promise.resolve(mockPageBuilder)),
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

vi.mock("@/environment");

const someNodeId = "node-123";

describe("composite view store", () => {
  describe("state management for pageBuilder integration", () => {
    beforeEach(() => {
      mockStores();
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should initialize PageBuilder with correct environment and settings", async () => {
      await useCompositeViewStore().getPageBuilder();
      expect(mockCreatePageBuilder).toHaveBeenCalledWith(
        expect.objectContaining({
          state: {
            disallowLegacyWidgets: true,
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
      const { getPageBuilder, isCompositeViewDirty } = useCompositeViewStore();
      const pageBuilder = await getPageBuilder();
      await pageBuilder.mountShadowApp(
        "mock-shadow-root" as unknown as ShadowRoot,
      );
      expect(mockPageBuilder.mountShadowApp).toHaveBeenCalled();
      expect(isCompositeViewDirty).toBe(false);
      expect(mockPageBuilder.hasPage()).toBe(false);
      pageBuilder.unmountShadowApp();
      expect(mockPageBuilder.unmountShadowApp).toHaveBeenCalled();
    });

    it("should handle dirty state through UI interactions", async () => {
      const { getPageBuilder, clickAwayCompositeView } =
        useCompositeViewStore();
      await getPageBuilder();
      mockPageBuilder.isDirty.mockResolvedValueOnce(true);
      showPageBuilderUnsavedChangesDialogMock.mockResolvedValueOnce(false);
      const result = await clickAwayCompositeView();
      expect(result).toEqual({ didPrompt: true, canContinue: false });
    });

    it("should continue if no active PageBuilder is set", async () => {
      const { clickAwayCompositeView, applyAndExecute, resetToDefaults } =
        useCompositeViewStore();
      mockPageBuilder.isDirty.mockResolvedValueOnce(true);
      showPageBuilderUnsavedChangesDialogMock.mockResolvedValueOnce(false);

      const clickawayResult = await clickAwayCompositeView();
      expect(clickawayResult).toBeTruthy();

      await applyAndExecute();
      expect(mockPageBuilder.applyAndExecute).not.toHaveBeenCalled();

      await resetToDefaults(someNodeId);
      expect(useExecutionStore().executeNodes).not.toHaveBeenCalled();
    });

    it("should allow continuation when not dirty", async () => {
      const { clickAwayCompositeView } = useCompositeViewStore();
      mockPageBuilder.isDirty.mockResolvedValueOnce(false);
      const result = await clickAwayCompositeView();
      expect(result).toBeTruthy();
    });

    it("should not execute when PageBuilder is not mounted", async () => {
      const { applyAndExecute, getPageBuilder } = useCompositeViewStore();
      await getPageBuilder();
      await applyAndExecute();
      expect(mockPageBuilder.applyAndExecute).not.toHaveBeenCalled();
    });

    it("should not execute when not dirty", async () => {
      const { applyAndExecute, getPageBuilder } = useCompositeViewStore();
      await getPageBuilder();
      mockPageBuilder.isDirty.mockResolvedValue(false);
      await applyAndExecute();
      expect(mockPageBuilder.applyAndExecute).not.toHaveBeenCalled();
    });

    it("should apply and execute when dirty by prompting (DESKTOP)", async () => {
      mockEnvironment("DESKTOP", { isBrowser, isDesktop });
      const { clickAwayCompositeView, getPageBuilder } =
        useCompositeViewStore();
      await getPageBuilder();
      mockPageBuilder.isDirty.mockResolvedValue(true);
      mockPageBuilder.hasPage.mockReturnValue(true);
      const result = await clickAwayCompositeView();
      await flushPromises();
      expect(showPageBuilderUnsavedChangesDialogMock).toHaveBeenCalled();
      expect(result).toEqual({ didPrompt: true, canContinue: false });
    });

    it("should apply and execute when dirty without prompting (BROWSER)", async () => {
      mockEnvironment("BROWSER", { isBrowser, isDesktop });
      const { clickAwayCompositeView, getPageBuilder } =
        useCompositeViewStore();
      await getPageBuilder();
      mockPageBuilder.isDirty.mockResolvedValue(true);
      mockPageBuilder.hasPage.mockReturnValue(true);
      const result = await clickAwayCompositeView();
      await flushPromises();
      expect(mockPageBuilder.applyAndExecute).toHaveBeenCalled();
      expect(showPageBuilderUnsavedChangesDialogMock).not.toHaveBeenCalled();
      expect(result).toEqual({ didPrompt: false, canContinue: true });
    });

    it("should not execute when no page exists", async () => {
      const { applyAndExecute, getPageBuilder } = useCompositeViewStore();
      await getPageBuilder();
      mockPageBuilder.isDirty.mockResolvedValue(true);
      mockPageBuilder.hasPage.mockReturnValue(false);
      await applyAndExecute();
      expect(mockPageBuilder.applyAndExecute).not.toHaveBeenCalled();
    });

    it("should execute when conditions are met", async () => {
      const { applyAndExecute, getPageBuilder } = useCompositeViewStore();
      await getPageBuilder();
      mockPageBuilder.isDirty.mockResolvedValue(true);
      mockPageBuilder.hasPage.mockReturnValue(true);
      await applyAndExecute();
      expect(mockPageBuilder.applyAndExecute).toHaveBeenCalled();
    });

    it("should not execute when PageBuilder not ready", async () => {
      const { applyToDefaultAndExecute } = useCompositeViewStore();
      await applyToDefaultAndExecute(someNodeId);
      expect(useExecutionStore().executeNodes).not.toHaveBeenCalled();
    });

    it("should apply as default and execute when conditions are met", async () => {
      const { applyToDefaultAndExecute, getPageBuilder } =
        useCompositeViewStore();
      await getPageBuilder();
      mockPageBuilder.hasPage.mockReturnValue(true);
      await applyToDefaultAndExecute(someNodeId);
      expect(useExecutionStore().executeNodes).toHaveBeenCalledWith([
        someNodeId,
      ]);
    });

    it("should reset node when PageBuilder is active", async () => {
      const { resetToDefaults, getPageBuilder } = useCompositeViewStore();
      await getPageBuilder();
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

      addReexecutingNode(node1.id);

      expect(isReexecuting(node1.id)).toBe(true);
    });

    it("silently accepts when adding an existing node ID", () => {
      const { node1 } = createWorkflowContext();
      const { addReexecutingNode, isReexecuting } = useCompositeViewStore();

      addReexecutingNode(node1.id);
      addReexecutingNode(node1.id);

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
