import { describe, expect, it, vi } from "vitest";
import { capitalize } from "lodash-es";

import { WorkflowInfo } from "@/api/gateway-api/generated-api";
import { APP_ROUTES } from "@/router/appRoutes";
import {
  createComponentNode,
  createComponentPlaceholder,
  createMetanode,
  createWorkflow,
} from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import componentOrMetanodeShortcuts from "../componentOrMetanodeShortcuts";

import { mockShortcutContext } from "./mock-context";

describe("componentOrMetanodeShortcuts", () => {
  const createStore = () => {
    const {
      applicationStore,
      workflowStore,
      selectionStore,
      componentInteractionsStore,
      desktopInteractionsStore,
      nodeInteractionsStore,
      uiControlsStore,
      layoutEditorStore,
    } = mockStores();

    applicationStore.activeProjectId = "activeTestProjectId";
    workflowStore.activeWorkflow = createWorkflow({
      info: { containerType: WorkflowInfo.ContainerTypeEnum.Project },
      parents: [
        { containerId: "root:parent" },
        { containerId: "direct:parent:id" },
      ],
    });
    // @ts-expect-error
    selectionStore.singleSelectedNode = createMetanode({ id: "root:0" });

    return {
      applicationStore,
      workflowStore,
      selectionStore,
      componentInteractionsStore,
      desktopInteractionsStore,
      nodeInteractionsStore,
      uiControlsStore,
      layoutEditorStore,
    };
  };

  const createRouter = () => {
    const mockPush = vi.fn();
    const $router = { push: mockPush };
    return { mockPush, $router };
  };

  describe("execute", () => {
    it("create metanode", () => {
      const { workflowStore } = createStore();

      componentOrMetanodeShortcuts.createMetanode.execute(
        mockShortcutContext(),
      );
      expect(workflowStore.collapseToContainer).toHaveBeenCalledWith({
        containerType: "metanode",
      });
    });

    it("create component", () => {
      const { workflowStore } = createStore();

      componentOrMetanodeShortcuts.createComponent.execute(
        mockShortcutContext(),
      );
      expect(workflowStore.collapseToContainer).toHaveBeenCalledWith({
        containerType: "component",
      });
    });

    it("open component or metanode", () => {
      const { mockPush, $router } = createRouter();

      componentOrMetanodeShortcuts.openComponentOrMetanode.execute(
        mockShortcutContext({ $router }),
      );
      expect(mockPush).toHaveBeenCalledWith({
        name: APP_ROUTES.WorkflowPage,
        params: {
          workflowId: "root:0",
          projectId: "activeTestProjectId",
        },
      });
    });

    it("unlocks a locked component or metanode", async () => {
      const { mockPush, $router } = createRouter();
      const { selectionStore, componentInteractionsStore } = createStore();

      // @ts-expect-error
      selectionStore.singleSelectedNode = createMetanode({
        id: "root:0",
        isLocked: true,
      });
      // success unlock
      componentInteractionsStore.unlockSubnode = vi
        .fn()
        .mockResolvedValue(true);
      await componentOrMetanodeShortcuts.openComponentOrMetanode.execute(
        mockShortcutContext({ $router }),
      );
      expect(componentInteractionsStore.unlockSubnode).toHaveBeenCalledWith({
        nodeId: "root:0",
      });

      expect(mockPush).toHaveBeenCalledWith({
        name: APP_ROUTES.WorkflowPage,
        params: {
          workflowId: "root:0",
          projectId: "activeTestProjectId",
        },
      });
    });

    it("cancels unlock of a locked component or metanode", () => {
      const { mockPush, $router } = createRouter();
      const { selectionStore, componentInteractionsStore } = createStore();

      // @ts-expect-error
      selectionStore.singleSelectedNode = createMetanode({
        id: "root:0",
        isLocked: true,
      });
      // fails/cancel unlock
      componentInteractionsStore.unlockSubnode = vi
        .fn()
        .mockResolvedValue(false);
      componentOrMetanodeShortcuts.openComponentOrMetanode.execute(
        mockShortcutContext({ $router }),
      );

      expect(componentInteractionsStore.unlockSubnode).toHaveBeenCalledWith({
        nodeId: "root:0",
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it("open parent workflow", () => {
      const { mockPush, $router } = createRouter();

      componentOrMetanodeShortcuts.openParentWorkflow.execute(
        mockShortcutContext({ $router }),
      );
      expect(mockPush).toHaveBeenCalledWith({
        name: APP_ROUTES.WorkflowPage,
        params: {
          workflowId: "direct:parent:id",
          projectId: "activeTestProjectId",
        },
        force: true,
        replace: true,
      });
    });

    it("expand container node", () => {
      const { workflowStore } = createStore();

      componentOrMetanodeShortcuts.expandMetanode.execute(
        mockShortcutContext(),
      );
      expect(workflowStore.expandContainerNode).toHaveBeenCalled();
    });

    it("open layout editor", () => {
      const { layoutEditorStore } = createStore();

      componentOrMetanodeShortcuts.openLayoutEditor.execute(
        mockShortcutContext(),
      );
      expect(layoutEditorStore.setLayoutContext).toHaveBeenCalled();
    });

    it("open layout editor by node ID", () => {
      const { layoutEditorStore } = createStore();

      componentOrMetanodeShortcuts.openLayoutEditorByNodeId.execute(
        mockShortcutContext(),
      );
      expect(layoutEditorStore.setLayoutContext).toHaveBeenCalled();
    });

    it("can lock a subnode", () => {
      const { componentInteractionsStore } = createStore();

      componentOrMetanodeShortcuts.lockSubnode.execute(mockShortcutContext());
      expect(componentInteractionsStore.lockSubnode).toHaveBeenCalledWith({
        nodeId: "root:0",
      });
    });

    it("disables lock when subnode is already locked", () => {
      const { selectionStore } = createStore();

      // @ts-expect-error
      selectionStore.singleSelectedNode = createMetanode({
        id: "root:0",
        isLocked: true,
      });
      expect(componentOrMetanodeShortcuts.lockSubnode.condition?.()).toBe(
        false,
      );
    });

    describe("editName", () => {
      it("opens the name editor", () => {
        const { nodeInteractionsStore } = createStore();

        componentOrMetanodeShortcuts.editName.execute(mockShortcutContext());
        expect(nodeInteractionsStore.openNameEditor).toHaveBeenCalledWith(
          "root:0",
        );
      });

      it("cannot rename when workflow is not writable", () => {
        const { workflowStore } = createStore();

        // @ts-expect-error
        workflowStore.isWritable = false;
        expect(componentOrMetanodeShortcuts.editName.condition?.()).toBe(false);
      });

      it.each([
        ["component", true],
        ["metanode", true],
        ["node", false],
      ])(
        'for nodes of kind: "%s" the condition should be "%s"',
        (kind, conditionValue) => {
          const { selectionStore } = createStore();

          // @ts-expect-error
          selectionStore.singleSelectedNode = {
            ...createMetanode({ id: "root:0" }),
            kind,
          };
          expect(componentOrMetanodeShortcuts.editName.condition?.()).toBe(
            conditionValue,
          );
        },
      );

      it.each([
        ["metanode", createMetanode({ id: "root:1", link: { url: "foo" } })],
        [
          "component",
          createComponentNode({ id: "root:1", link: { url: "foo" } }),
        ],
      ])("cannot rename if the %s is linked", (_, node) => {
        const { selectionStore } = createStore();

        // @ts-expect-error
        selectionStore.singleSelectedNode = node;
        expect(componentOrMetanodeShortcuts.editName.condition?.()).toBe(false);
      });
    });

    describe("openLayoutEditorByNodeId", () => {
      it("has not a component selected, button disabled", () => {
        const { selectionStore } = createStore();

        // @ts-expect-error
        selectionStore.singleSelectedNode.kind = "nothing";
        expect(
          componentOrMetanodeShortcuts.openLayoutEditorByNodeId.condition?.(),
        ).toBe(false);
      });

      it("has a component selected, button enabled", () => {
        const { selectionStore, uiControlsStore } = createStore();

        // @ts-expect-error
        selectionStore.singleSelectedNode = createComponentNode({
          id: "root:0",
        });
        uiControlsStore.canOpenLayoutEditor = false;
        expect(
          componentOrMetanodeShortcuts.openLayoutEditorByNodeId.condition?.(),
        ).toBe(false);

        uiControlsStore.canOpenLayoutEditor = true;
        expect(
          componentOrMetanodeShortcuts.openLayoutEditorByNodeId.condition?.(),
        ).toBe(true);
      });

      it("has a linked component selected, button disabled", () => {
        const { selectionStore } = createStore();

        // @ts-expect-error
        selectionStore.singleSelectedNode = createComponentNode({
          id: "root:0",
          link: { url: "random-link" },
        });
        expect(
          componentOrMetanodeShortcuts.openLayoutEditorByNodeId.condition?.(),
        ).toBe(false);
      });
    });
  });

  describe.each(["component", "metanode"])("create %s", (nodeKind) => {
    const shortcut = `create${capitalize(nodeKind)}`;

    it(`it can not create ${nodeKind} when canCollapse is false`, () => {
      const { selectionStore } = createStore();

      // @ts-expect-error
      selectionStore.getSelectedNodes = [
        { allowedActions: { canCollapse: "true" } },
      ];
      expect(componentOrMetanodeShortcuts[shortcut].condition?.()).toBe(true);

      // @ts-expect-error
      selectionStore.getSelectedNodes = [
        { allowedActions: { canCollapse: "false" } },
      ];
      expect(componentOrMetanodeShortcuts[shortcut].condition?.()).toBe(false);
    });

    it(`it can not create ${nodeKind} when workflow is not writable`, () => {
      const { selectionStore, workflowStore } = createStore();

      // @ts-expect-error
      workflowStore.isWritable = false;
      // @ts-expect-error
      selectionStore.getSelectedNodes = [
        { allowedActions: { canCollapse: "true" } },
      ];
      expect(componentOrMetanodeShortcuts[shortcut].condition?.()).toBe(false);
    });

    it(`it can not create ${nodeKind} when no node is selected`, () => {
      const { workflowStore } = createStore();

      // @ts-expect-error
      workflowStore.isWritable = false;
      expect(componentOrMetanodeShortcuts[shortcut].condition?.()).toBe(false);
    });
  });

  describe.each(["component", "metanode"])("expand %s", (nodeKind) => {
    const shortcut = `expand${capitalize(nodeKind)}`;

    it(`it allows to expand if a ${nodeKind} is selected and canExpand is true`, () => {
      const { selectionStore } = createStore();

      // @ts-expect-error
      selectionStore.singleSelectedNode = {
        kind: nodeKind,
        allowedActions: { canExpand: "false" },
      };
      expect(componentOrMetanodeShortcuts[shortcut].condition?.()).toBe(false);

      // @ts-expect-error
      selectionStore.singleSelectedNode = {
        kind: nodeKind,
        allowedActions: { canExpand: "true" },
      };
      expect(componentOrMetanodeShortcuts[shortcut].condition?.()).toBe(true);
    });

    it(`it can not expand ${nodeKind} when workflow is not writable`, () => {
      const { selectionStore, workflowStore } = createStore();

      // @ts-expect-error
      selectionStore.singleSelectedNode = {
        kind: nodeKind,
        allowedActions: { canExpand: "true" },
      };
      // @ts-expect-error
      workflowStore.isWritable = false;
      expect(componentOrMetanodeShortcuts[shortcut].condition?.()).toBe(false);
    });

    it(`it can not expand ${nodeKind} when it is linked`, () => {
      const { selectionStore } = createStore();

      // @ts-expect-error
      selectionStore.singleSelectedNode = {
        kind: nodeKind,
        link: { url: "random-link" },
        allowedActions: { canExpand: "true" },
      };
      expect(componentOrMetanodeShortcuts[shortcut].condition?.()).toBe(false);
    });

    it(`it can not expand ${nodeKind} when it is locked`, () => {
      const { selectionStore } = createStore();

      // @ts-expect-error
      selectionStore.singleSelectedNode = { kind: nodeKind, isLocked: true };
      expect(componentOrMetanodeShortcuts[shortcut].condition?.()).toBe(false);
    });
  });

  describe("openLayoutEditor", () => {
    it("is not a component, button disabled", () => {
      expect(componentOrMetanodeShortcuts.openLayoutEditor.condition?.()).toBe(
        false,
      );
    });

    it("is not a writable component, button disabled", () => {
      const { workflowStore } = createStore();

      // @ts-expect-error
      workflowStore.isWritable = false;
      workflowStore.activeWorkflow!.info.containerType =
        WorkflowInfo.ContainerTypeEnum.Component;
      expect(componentOrMetanodeShortcuts.openLayoutEditor.condition?.()).toBe(
        false,
      );
    });

    it("is a writable component, button enabled", () => {
      const { workflowStore, uiControlsStore } = createStore();

      workflowStore.activeWorkflow!.info.containerType =
        WorkflowInfo.ContainerTypeEnum.Component;
      uiControlsStore.canOpenLayoutEditor = false;
      expect(componentOrMetanodeShortcuts.openLayoutEditor.condition?.()).toBe(
        false,
      );

      uiControlsStore.canOpenLayoutEditor = true;
      expect(componentOrMetanodeShortcuts.openLayoutEditor.condition?.()).toBe(
        true,
      );
    });
  });

  describe.each([
    "deleteComponentPlaceholder",
    "retryComponentPlaceholderLoading",
    "cancelComponentPlaceholderLoading",
  ])("%s", (shortcut) => {
    it("is disabled if component placeholder isn't selected", () => {
      createStore();

      expect(componentOrMetanodeShortcuts[shortcut].condition?.()).toBe(false);
    });

    it("is disabled if workflow isn't writable", () => {
      const { workflowStore, selectionStore } = createStore();

      // @ts-expect-error
      workflowStore.isWritable = false;
      // @ts-expect-error
      selectionStore.getSelectedComponentPlaceholder =
        createComponentPlaceholder();
      expect(componentOrMetanodeShortcuts[shortcut].condition?.()).toBe(false);
    });

    it("is enabled when component placeholder is selected", () => {
      const { selectionStore } = createStore();

      // @ts-expect-error
      selectionStore.getSelectedComponentPlaceholder =
        createComponentPlaceholder();
      expect(componentOrMetanodeShortcuts[shortcut].condition?.()).toBe(true);
    });
  });
});
