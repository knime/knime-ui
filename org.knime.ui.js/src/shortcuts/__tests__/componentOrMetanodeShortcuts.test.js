import { describe, expect, it, vi } from "vitest";

import { APP_ROUTES } from "@/router/appRoutes";
import { createComponentNode, createMetanode } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import componentOrMetanodeShortcuts from "../componentOrMetanodeShortcuts";

const capitalize = (str) => str.charAt(0).toUpperCase().concat(str.slice(1));

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
    } = mockStores();

    applicationStore.activeProjectId = "activeTestProjectId";
    workflowStore.activeWorkflow = {
      info: {
        containerType: "project",
      },
      parents: [
        {
          containerId: "root:parent",
        },
        {
          containerId: "direct:parent:id",
        },
      ],
    };
    selectionStore.singleSelectedNode = createMetanode({ id: "root:0" });

    return {
      applicationStore,
      workflowStore,
      selectionStore,
      componentInteractionsStore,
      desktopInteractionsStore,
      nodeInteractionsStore,
      uiControlsStore,
    };
  };

  const createRouter = () => {
    const mockPush = vi.fn();
    const $router = {
      push: mockPush,
    };

    return { mockPush, $router };
  };

  describe("execute", () => {
    it("create metanode", () => {
      const { workflowStore } = createStore();

      componentOrMetanodeShortcuts.createMetanode.execute();
      expect(workflowStore.collapseToContainer).toHaveBeenCalledWith({
        containerType: "metanode",
      });
    });

    it("create component", () => {
      const { workflowStore } = createStore();

      componentOrMetanodeShortcuts.createComponent.execute();
      expect(workflowStore.collapseToContainer).toHaveBeenCalledWith({
        containerType: "component",
      });
    });

    it("open component or metanode", () => {
      const { mockPush, $router } = createRouter();

      componentOrMetanodeShortcuts.openComponentOrMetanode.execute({
        $router,
      });
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

      selectionStore.singleSelectedNode = createMetanode({
        id: "root:0",
        isLocked: true,
      });
      // success unlock
      componentInteractionsStore.unlockSubnode.mockResolvedValue(true);
      await componentOrMetanodeShortcuts.openComponentOrMetanode.execute({
        $router,
      });
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

      selectionStore.singleSelectedNode = createMetanode({
        id: "root:0",
        isLocked: true,
      });
      // fails/cancel unlock
      componentInteractionsStore.unlockSubnode.mockResolvedValue(false);
      componentOrMetanodeShortcuts.openComponentOrMetanode.execute({
        $router,
      });

      expect(componentInteractionsStore.unlockSubnode).toHaveBeenCalledWith({
        nodeId: "root:0",
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it("open parent workflow", () => {
      const { mockPush, $router } = createRouter();

      componentOrMetanodeShortcuts.openParentWorkflow.execute({
        $router,
      });
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

      componentOrMetanodeShortcuts.expandMetanode.execute();
      expect(workflowStore.expandContainerNode).toHaveBeenCalled();
    });

    it("open layout editor", () => {
      const { desktopInteractionsStore } = createStore();

      componentOrMetanodeShortcuts.openLayoutEditor.execute();
      expect(desktopInteractionsStore.openLayoutEditor).toHaveBeenCalled();
    });

    it("can lock a subnode", () => {
      const { componentInteractionsStore } = createStore();

      componentOrMetanodeShortcuts.lockSubnode.execute();
      expect(componentInteractionsStore.lockSubnode).toHaveBeenCalledWith({
        nodeId: "root:0",
      });
    });

    it("disables lock when subnode is already locked", () => {
      const { selectionStore } = createStore();

      selectionStore.singleSelectedNode = createMetanode({
        id: "root:0",
        isLocked: true,
      });
      expect(
        componentOrMetanodeShortcuts.lockSubnode.condition({}),
      ).toBeFalsy();
    });

    describe("editName", () => {
      it("opens the name editor", () => {
        const { nodeInteractionsStore } = createStore();

        componentOrMetanodeShortcuts.editName.execute();
        expect(nodeInteractionsStore.openNameEditor).toHaveBeenCalledWith(
          "root:0",
        );
      });

      it("cannot rename when workflow is not writable", () => {
        const { workflowStore } = createStore();

        workflowStore.isWritable = false;
        expect(componentOrMetanodeShortcuts.editName.condition()).toBe(false);
      });

      it.each([
        ["component", true],
        ["metanode", true],
        ["node", false],
      ])(
        'for nodes of kind: "%s" the condition should be "%s"',
        (kind, conditionValue) => {
          const { selectionStore } = createStore();

          selectionStore.singleSelectedNode.kind = kind;
          expect(componentOrMetanodeShortcuts.editName.condition()).toBe(
            conditionValue,
          );
        },
      );

      it("cannot rename if the selected node is linked", () => {
        const { selectionStore } = createStore();

        selectionStore.singleSelectedNode = createComponentNode({
          id: "root:0",
          link: true,
        });
        expect(componentOrMetanodeShortcuts.editName.condition()).toBe(false);
      });
    });

    describe("openLayoutEditorByNodeId", () => {
      it("has not a component selected, button disabled", () => {
        const { selectionStore } = createStore();

        selectionStore.singleSelectedNode.kind = "nothing";
        expect(
          componentOrMetanodeShortcuts.openLayoutEditorByNodeId.condition({}),
        ).toBeFalsy();
      });

      it("has a component selected, button enabled", () => {
        const { selectionStore, uiControlsStore } = createStore();

        selectionStore.singleSelectedNode = createComponentNode({
          id: "root:0",
        });
        uiControlsStore.canOpenComponentLayoutEditor = false;
        expect(
          componentOrMetanodeShortcuts.openLayoutEditorByNodeId.condition({}),
        ).toBeFalsy();

        uiControlsStore.canOpenComponentLayoutEditor = true;
        expect(
          componentOrMetanodeShortcuts.openLayoutEditorByNodeId.condition({}),
        ).toBeTruthy();
      });

      it("has a linked component selected, button disabled", () => {
        const { selectionStore } = createStore();

        selectionStore.singleSelectedNode = createComponentNode({
          id: "root:0",
          link: "random-link",
        });
        expect(
          componentOrMetanodeShortcuts.openLayoutEditorByNodeId.condition({}),
        ).toBeFalsy();
      });
    });
  });

  describe.each([["component"], ["metanode"]])("create %s", (nodeKind) => {
    const shortcut = `create${capitalize(nodeKind)}`;

    it(`it can not create ${nodeKind} when canCollapse is false`, () => {
      const { selectionStore } = createStore();

      selectionStore.getSelectedNodes = [
        { allowedActions: { canCollapse: "true" } },
      ];
      expect(componentOrMetanodeShortcuts[shortcut].condition()).toBe(true);

      selectionStore.getSelectedNodes = [
        { allowedActions: { canCollapse: "false" } },
      ];
      expect(componentOrMetanodeShortcuts[shortcut].condition()).toBe(false);
    });

    it(`it can not create ${nodeKind} when workflow is not writable`, () => {
      const { selectionStore, workflowStore } = createStore();

      workflowStore.isWritable = false;
      selectionStore.getSelectedNodes = [
        { allowedActions: { canCollapse: "true" } },
      ];
      expect(componentOrMetanodeShortcuts[shortcut].condition()).toBe(false);
    });

    it(`it can not create ${nodeKind} when no node is selected`, () => {
      const { workflowStore } = createStore();

      workflowStore.isWritable = false;
      expect(componentOrMetanodeShortcuts[shortcut].condition()).toBe(false);
    });
  });

  describe.each([["component"], ["metanode"]])("expand %s", (nodeKind) => {
    const shortcut = `expand${capitalize(nodeKind)}`;

    it(`it allows to expand if a ${nodeKind} is selected and canExpand is true`, () => {
      const { selectionStore } = createStore();

      selectionStore.singleSelectedNode = {
        kind: nodeKind,
        allowedActions: {
          canExpand: "false",
        },
      };
      expect(componentOrMetanodeShortcuts[shortcut].condition()).toBe(false);

      selectionStore.singleSelectedNode = {
        kind: nodeKind,
        allowedActions: {
          canExpand: "true",
        },
      };
      expect(componentOrMetanodeShortcuts[shortcut].condition()).toBe(true);
    });

    it(`it can not expand ${nodeKind} when workflow is not writable`, () => {
      const { selectionStore, workflowStore } = createStore();

      selectionStore.singleSelectedNode = {
        kind: nodeKind,
        allowedActions: {
          canExpand: "true",
        },
      };
      workflowStore.isWritable = false;
      expect(componentOrMetanodeShortcuts[shortcut].condition()).toBe(false);
    });

    it(`it can not expand ${nodeKind} when it is linked`, () => {
      const { selectionStore } = createStore();

      selectionStore.singleSelectedNode = {
        kind: nodeKind,
        link: "random-link",
        allowedActions: {
          canExpand: "true",
        },
      };
      expect(componentOrMetanodeShortcuts[shortcut].condition()).toBe(false);
    });

    it(`it can not expand ${nodeKind} when it is locked`, () => {
      const { selectionStore } = createStore();

      selectionStore.singleSelectedNode = {
        kind: nodeKind,
        isLocked: true,
      };

      expect(componentOrMetanodeShortcuts[shortcut].condition()).toBe(false);
    });
  });

  describe("openLayoutEditor", () => {
    it("is not a component, button disabled", () => {
      expect(
        componentOrMetanodeShortcuts.openLayoutEditor.condition(),
      ).toBeFalsy();
    });

    it("is not a writable component, button disabled", () => {
      const { workflowStore } = createStore();

      workflowStore.isWritable = false;
      workflowStore.activeWorkflow.info.containerType = "component";
      expect(
        componentOrMetanodeShortcuts.openLayoutEditor.condition(),
      ).toBeFalsy();
    });

    it("is a writable component, button enabled", () => {
      const { workflowStore, uiControlsStore } = createStore();

      workflowStore.activeWorkflow.info.containerType = "component";
      uiControlsStore.canOpenComponentLayoutEditor = false;
      expect(componentOrMetanodeShortcuts.openLayoutEditor.condition()).toBe(
        false,
      );

      uiControlsStore.canOpenComponentLayoutEditor = true;
      expect(componentOrMetanodeShortcuts.openLayoutEditor.condition()).toBe(
        true,
      );
    });
  });
});
