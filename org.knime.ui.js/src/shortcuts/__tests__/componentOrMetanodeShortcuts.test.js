import { expect, describe, it, vi } from "vitest";
import componentOrMetanodeShortcuts from "../componentOrMetanodeShortcuts";
import { APP_ROUTES } from "@/router/appRoutes";

const capitalize = (str) => str.charAt(0).toUpperCase().concat(str.slice(1));

describe("componentOrMetanodeShortcuts", () => {
  const mockSelectedNode = { id: "root:0", allowedActions: {} };

  const createStore = ({
    containerType = "project",
    selectedNodes = [],
    selectedConnections = [],
    selectedAnnotations = [],
    singleSelectedNode = mockSelectedNode,
    isWorkflowWritable = true,
    getScrollContainerElement = vi.fn(),
    getNodeById = vi.fn(),
    getVisibleFrame = vi
      .fn()
      .mockReturnValue({ left: -500, top: -500, width: 1000, height: 1000 }),
  } = {}) => {
    const mockDispatch = vi.fn();
    const $store = {
      dispatch: mockDispatch,
      state: {
        application: {
          activeProjectId: "activeTestProjectId",
          hasClipboardSupport: true,
        },
        workflow: {
          activeWorkflow: {
            allowedActions: {},
            info: {
              containerType,
            },
            nodes: {
              node1: {
                position: {
                  x: 300,
                  y: 200,
                },
              },
            },
            parents: [
              {
                containerId: "root:parent",
              },
              {
                containerId: "direct:parent:id",
              },
            ],
          },
          quickAddNodeMenu: {
            isOpen: false,
            props: {},
            events: {},
          },
        },
        canvas: {
          getScrollContainerElement,
        },
      },
      getters: {
        "selection/selectedNodes": selectedNodes,
        "selection/selectedConnections": selectedConnections,
        "selection/singleSelectedNode": singleSelectedNode,
        "selection/selectedAnnotations": selectedAnnotations,
        "workflow/isWritable": isWorkflowWritable,
        "workflow/getNodeById": getNodeById,
        "canvas/getVisibleFrame": getVisibleFrame,
        "application/activeProjectOrigin": {
          providerId: "some-provider",
          spaceId: "some-space",
        },
      },
    };

    return { mockDispatch, $store };
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
      const { $store, mockDispatch } = createStore();
      componentOrMetanodeShortcuts.createMetanode.execute({ $store });
      expect(mockDispatch).toHaveBeenCalledWith(
        "workflow/collapseToContainer",
        { containerType: "metanode" },
      );
    });

    it("create component", () => {
      const { $store, mockDispatch } = createStore();
      componentOrMetanodeShortcuts.createComponent.execute({ $store });
      expect(mockDispatch).toHaveBeenCalledWith(
        "workflow/collapseToContainer",
        { containerType: "component" },
      );
    });

    it("open component or metanode", () => {
      const { mockPush, $router } = createRouter();
      const { $store } = createStore();
      componentOrMetanodeShortcuts.openComponentOrMetanode.execute({
        $store,
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
      const { $store, mockDispatch } = createStore({
        singleSelectedNode: {
          ...mockSelectedNode,
          isLocked: true,
        },
      });
      // success unlock
      mockDispatch.mockResolvedValue(true);
      await componentOrMetanodeShortcuts.openComponentOrMetanode.execute({
        $store,
        $router,
      });
      expect(mockDispatch).toHaveBeenCalledWith("workflow/unlockSubnode", {
        nodeId: mockSelectedNode.id,
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
      const { $store, mockDispatch } = createStore({
        singleSelectedNode: {
          ...mockSelectedNode,
          isLocked: true,
        },
      });
      // fails/cancel unlock
      mockDispatch.mockResolvedValue(false);
      componentOrMetanodeShortcuts.openComponentOrMetanode.execute({
        $store,
        $router,
      });

      expect(mockDispatch).toHaveBeenCalledWith("workflow/unlockSubnode", {
        nodeId: mockSelectedNode.id,
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it("open parent workflow", () => {
      const { mockPush, $router } = createRouter();
      const { $store } = createStore();
      componentOrMetanodeShortcuts.openParentWorkflow.execute({
        $store,
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
      const { $store, mockDispatch } = createStore();
      componentOrMetanodeShortcuts.expandMetanode.execute({ $store });
      expect(mockDispatch).toHaveBeenCalledWith("workflow/expandContainerNode");
    });

    it("open layout editor", () => {
      const { $store, mockDispatch } = createStore();
      componentOrMetanodeShortcuts.openLayoutEditor.execute({ $store });
      expect(mockDispatch).toHaveBeenCalledWith("workflow/openLayoutEditor");
    });

    it("can lock a subnode", () => {
      const { $store, mockDispatch } = createStore();

      componentOrMetanodeShortcuts.lockSubnode.execute({ $store });
      expect(mockDispatch).toHaveBeenCalledWith("workflow/lockSubnode", {
        nodeId: mockSelectedNode.id,
      });
    });

    it("disables lock when subnode is already locked", () => {
      const { $store } = createStore({
        singleSelectedNode: {
          isLocked: true,
        },
      });
      expect(
        componentOrMetanodeShortcuts.lockSubnode.condition({
          $store,
        }),
      ).toBeFalsy();
    });

    describe("editName", () => {
      it("opens the name editor", () => {
        const { $store, mockDispatch } = createStore();
        componentOrMetanodeShortcuts.editName.execute({ $store });
        expect(mockDispatch).toHaveBeenCalledWith(
          "workflow/openNameEditor",
          "root:0",
        );
      });

      it("cannot rename when workflow is not writable", () => {
        const { $store } = createStore();
        $store.getters["selection/singleSelectedNode"].kind = "component";
        $store.getters["workflow/isWritable"] = false;

        expect(
          componentOrMetanodeShortcuts.editName.condition({ $store }),
        ).toBe(false);
      });

      it.each([
        ["component", true],
        ["metanode", true],
        ["node", false],
      ])(
        'for nodes of kind: "%s" the condition should be "%s"',
        (kind, conditionValue) => {
          const { $store } = createStore();
          $store.getters["workflow/isWritable"] = true;
          $store.getters["selection/singleSelectedNode"].kind = kind;

          expect(
            componentOrMetanodeShortcuts.editName.condition({ $store }),
          ).toBe(conditionValue);
        },
      );

      it("cannot rename if the selected node is linked", () => {
        const { $store } = createStore();
        $store.getters["workflow/isWritable"] = true;
        $store.getters["selection/singleSelectedNode"].kind = "component";
        $store.getters["selection/singleSelectedNode"].link = true;

        expect(
          componentOrMetanodeShortcuts.editName.condition({ $store }),
        ).toBe(false);
      });
    });

    describe("openLayoutEditorByNodeId", () => {
      it("has not a component selected, button disabled", () => {
        const { $store } = createStore({
          singleSelectedNode: {
            kind: "nothing",
          },
        });
        expect(
          componentOrMetanodeShortcuts.openLayoutEditorByNodeId.condition({
            $store,
          }),
        ).toBeFalsy();
      });

      it("has a component selected, button enabled", () => {
        const { $store } = createStore({
          singleSelectedNode: {
            kind: "component",
          },
        });
        expect(
          componentOrMetanodeShortcuts.openLayoutEditorByNodeId.condition({
            $store,
          }),
        ).toBeTruthy();
      });

      it("has a linked component selected, button disabled", () => {
        const { $store } = createStore({
          singleSelectedNode: {
            kind: "component",
            link: "random-link",
          },
        });
        expect(
          componentOrMetanodeShortcuts.openLayoutEditorByNodeId.condition({
            $store,
          }),
        ).toBeFalsy();
      });
    });
  });

  describe.each([["component"], ["metanode"]])("create %s", (nodeKind) => {
    const shortcut = `create${capitalize(nodeKind)}`;

    it(`it can not create ${nodeKind} when canCollapse is false`, () => {
      const { $store } = createStore({
        selectedNodes: [{ allowedActions: { canCollapse: "true" } }],
      });

      expect(componentOrMetanodeShortcuts[shortcut].condition({ $store })).toBe(
        true,
      );

      $store.getters["selection/selectedNodes"] = [
        { allowedActions: { canCollapse: "false" } },
      ];
      expect(componentOrMetanodeShortcuts[shortcut].condition({ $store })).toBe(
        false,
      );
    });

    it(`it can not create ${nodeKind} when workflow is not writable`, () => {
      const { $store } = createStore({
        isWorkflowWritable: false,
        selectedNodes: [{ allowedActions: { canCollapse: "true" } }],
      });

      expect(componentOrMetanodeShortcuts[shortcut].condition({ $store })).toBe(
        false,
      );
    });

    it(`it can not create ${nodeKind} when no node is selected`, () => {
      const { $store } = createStore({ isWorkflowWritable: false });
      expect(componentOrMetanodeShortcuts[shortcut].condition({ $store })).toBe(
        false,
      );
    });
  });

  describe.each([["component"], ["metanode"]])("expand %s", (nodeKind) => {
    const shortcut = `expand${capitalize(nodeKind)}`;

    it(`it allows to expand if a ${nodeKind} is selected and canExpand is true`, () => {
      const { $store } = createStore({
        singleSelectedNode: {
          kind: nodeKind,
          allowedActions: {
            canExpand: "false",
          },
        },
      });

      expect(componentOrMetanodeShortcuts[shortcut].condition({ $store })).toBe(
        false,
      );
      $store.getters["selection/singleSelectedNode"] = {
        kind: nodeKind,
        allowedActions: {
          canExpand: "true",
        },
      };
      expect(componentOrMetanodeShortcuts[shortcut].condition({ $store })).toBe(
        true,
      );
    });

    it(`it can not expand ${nodeKind} when workflow is not writable`, () => {
      const { $store } = createStore({
        isWorkflowWritable: false,
        singleSelectedNode: {
          kind: nodeKind,
          allowedActions: {
            canExpand: "true",
          },
        },
      });

      expect(componentOrMetanodeShortcuts[shortcut].condition({ $store })).toBe(
        false,
      );
    });

    it(`it can not expand ${nodeKind} when it is linked`, () => {
      const { $store } = createStore({
        singleSelectedNode: {
          kind: nodeKind,
          link: "random-link",
          allowedActions: {
            canExpand: "true",
          },
        },
      });

      expect(componentOrMetanodeShortcuts[shortcut].condition({ $store })).toBe(
        false,
      );
    });

    it(`it can not expand ${nodeKind} when it is locked`, () => {
      const { $store } = createStore({
        singleSelectedNode: {
          kind: nodeKind,
          isLocked: true,
        },
      });

      expect(componentOrMetanodeShortcuts[shortcut].condition({ $store })).toBe(
        false,
      );
    });
  });

  describe("openLayoutEditor", () => {
    it("it is not a component, button disabled", () => {
      const { $store } = createStore();
      expect(
        componentOrMetanodeShortcuts.openLayoutEditor.condition({ $store }),
      ).toBeFalsy();
    });

    it("it is not a writable component, button disabled", () => {
      const { $store } = createStore({
        isWorkflowWritable: false,
        containerType: "component",
      });

      expect(
        componentOrMetanodeShortcuts.openLayoutEditor.condition({ $store }),
      ).toBeFalsy();
    });

    it("it is a writable component, button enabled", () => {
      const { $store } = createStore({
        isWorkflowWritable: true,
        containerType: "component",
      });
      expect(
        componentOrMetanodeShortcuts.openLayoutEditor.condition({ $store }),
      ).toBe(true);
    });
  });
});
