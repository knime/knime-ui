import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { API } from "@api";

import {
  NativeNodeInvariants,
  type NodeTemplate,
  PortType,
} from "@/api/gateway-api/generated-api";
import { createAvailablePortTypes, createWorkflow } from "@/test/factories";
import { deepMocked, mockBoundingRect } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import { KNIME_MIME } from "../../useDragNodeIntoCanvas";
import DraggableNodeTemplate from "../DraggableNodeTemplate.vue";

const mockedAPI = deepMocked(API);

describe("DraggableNodeTemplate", () => {
  const baseNodeTemplate: NodeTemplate = {
    name: "node-name",
    id: "node-id",
    nodeFactory: {
      className: "class-name",
      settings: "encoded-settings",
    },
    icon: "data:image/node-icon",
    type: NativeNodeInvariants.TypeEnum.Configuration,
    inPorts: [{ typeId: "org.port.mockId" }],
    outPorts: [{ typeId: "org.port.mockId" }],
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  const doMount = ({ props = {}, isWritable = true } = {}) => {
    const defaultProps = { nodeTemplate: baseNodeTemplate };

    mockedAPI.workflowCommand.AddNode.mockResolvedValue({
      newNodeId: "root:1",
    });

    const {
      testingPinia,
      workflowStore,
      canvasStore,
      applicationStore,
      selectionStore,
      nodeTemplatesStore,
      panelStore,
    } = mockStores();
    applicationStore.setAvailablePortTypes(
      createAvailablePortTypes({
        "org.port.mockId": {
          kind: PortType.KindEnum.Table,
          color: "mockColor",
          name: "mock_port",
        },
      }),
    );

    // @ts-expect-error
    workflowStore.isWritable = isWritable;
    workflowStore.setActiveWorkflow(createWorkflow());

    // @ts-expect-error
    canvasStore.getVisibleFrame = {
      left: 0,
      top: 0,
      width: 500,
      height: 500,
    };

    const wrapper = mount(DraggableNodeTemplate, {
      props: { ...defaultProps, ...props } as any,
      global: {
        plugins: [testingPinia],
        mocks: { $shapes: { nodeSize: 32 } },
      },
    });

    return {
      wrapper,
      workflowStore,
      selectionStore,
      panelStore,
      nodeTemplatesStore,
    };
  };

  it("shows node name in label", () => {
    const { wrapper } = doMount();

    expect(wrapper.find("span").text()).toBe("node-name");
  });

  it("never deselects a selected item via click", () => {
    const { wrapper } = doMount({ props: { isSelected: true } });

    const node = wrapper.find(".node");
    node.trigger("click");

    expect(wrapper.emitted("showNodeDescription")).toBeUndefined();
  });

  it("adds style if node is selected", () => {
    const { wrapper } = doMount({
      props: { isSelected: true, showFloatingHelpIcon: false },
    });

    const node = wrapper.find(".node");
    expect(node.classes()).toContain("selected");
  });

  describe("double click", () => {
    beforeEach(() => {
      // @ts-expect-error
      Document.prototype.getElementById = vi.fn(() => ({
        clientWidth: 1920,
        clientHeight: 1080,
        scrollLeft: 10,
        scrollTop: 10,
        focus: vi.fn(),
      }));
    });

    it("adds node to workflow on double click", async () => {
      const { wrapper } = doMount();

      await wrapper.find(".node").trigger("dblclick");
      await flushPromises();

      expect(mockedAPI.workflowCommand.AddNode).toHaveBeenCalledWith(
        expect.objectContaining({ position: { x: 235, y: 170 } }),
      );
    });

    it("looks for free space to position node if there is already a node", async () => {
      const { wrapper, workflowStore } = doMount();
      workflowStore.activeWorkflow!.nodes["root:2"].position = {
        x: 234,
        y: 171.5,
      };

      await wrapper.find(".node").trigger("dblclick");
      await flushPromises();

      expect(mockedAPI.workflowCommand.AddNode).toHaveBeenCalledWith(
        expect.objectContaining({ position: { x: 355, y: 290 } }),
      );
    });

    it("does nothing on double click if workflow it not writeable", async () => {
      const { wrapper } = doMount({ isWritable: false });

      await wrapper.find(".node").trigger("dblclick");

      expect(mockedAPI.workflowCommand.AddNode).not.toHaveBeenCalled();
    });

    it("takes single selected node into account", async () => {
      const { wrapper, workflowStore, selectionStore } = doMount();
      workflowStore.activeWorkflow!.nodes["root:2"].position = {
        x: 100,
        y: 100,
      };
      selectionStore.selectNodes(["root:2"]);
      await wrapper.find(".node").trigger("dblclick");
      await flushPromises();

      expect(mockedAPI.workflowCommand.AddNode).toHaveBeenCalledWith(
        expect.objectContaining({
          position: { x: 220, y: 100 },
          sourceNodeId: "root:2",
          nodeRelation: "SUCCESSORS",
        }),
      );
    });
  });

  describe("drag node", () => {
    beforeEach(() => {
      mockBoundingRect({
        width: 70,
        height: 70,
      });
    });

    afterEach(() => {
      // clean up document body to where nodePreview is cloned after each test
      document.body.childNodes.forEach((node) => {
        document.body.removeChild(node);
      });
    });

    const testEvent = {
      dataTransfer: {
        setData: vi.fn(),
        setDragImage: vi.fn(),
      },
    };

    it("adds and removes dragGhost to/from vm and document.body", () => {
      const { wrapper } = doMount();
      document.body.innerHTML = "";
      expect(document.body.childNodes.length).toBe(0);

      // add node preview clone
      wrapper.trigger("dragstart", testEvent);

      expect(document.body.childNodes.length).toBe(1);
      expect(document.body.childNodes[0]).toBe(
        document.body.querySelector("#draggable-node-ghost"),
      );

      // remove node preview clone
      wrapper.trigger("dragend", { dataTransfer: { dropEffect: "" } });

      expect(document.body.childNodes.length).toBe(0);
    });

    it("sets a ghostImage", () => {
      const { wrapper } = doMount();

      wrapper.trigger("dragstart", testEvent);

      const clonedNodePreview = document.body.querySelector(
        "#draggable-node-ghost",
      ) as HTMLElement;

      // Correct Styling
      expect(clonedNodePreview.style.position).toBe("absolute");
      expect(clonedNodePreview.style.left).toBe("-100px");
      expect(clonedNodePreview.style.top).toBe("0px");
      expect(clonedNodePreview.style.width).toBe("70px");
      expect(clonedNodePreview.style.height).toBe("70px");

      expect(testEvent.dataTransfer.setDragImage).toHaveBeenCalledWith(
        document.body.querySelector("#draggable-node-ghost"),
        35,
        35,
      );
    });

    it("sets dataTransfer types properly onDragStart", () => {
      const { wrapper } = doMount();
      wrapper.trigger("dragstart", testEvent);

      expect(testEvent.dataTransfer.setData).toHaveBeenCalledWith(
        "text/plain",
        "node-id",
      );
      expect(testEvent.dataTransfer.setData).toHaveBeenCalledWith(
        KNIME_MIME,
        JSON.stringify({
          type: "node",
          payload: {
            nodeFactory: {
              className: "class-name",
              settings: "encoded-settings",
            },
          },
        }),
      );
    });

    it("changes cursor when dragged in write-protected mode", () => {
      const { wrapper } = doMount({ isWritable: false });

      wrapper.trigger("drag");
      const node = wrapper.find(".node");

      expect(node.attributes().style).toBe("cursor: not-allowed;");
    });

    it("removes style from node when dragging ends", () => {
      const { wrapper } = doMount({ isWritable: false });

      wrapper.trigger("drag");
      const node = wrapper.find(".node");

      expect(node.attributes().style).toBe("cursor: not-allowed;");

      wrapper.trigger("dragend", { dataTransfer: { dropEffect: "" } });

      expect(node.attributes().style).toBe("cursor: pointer;");
    });

    it("closes description panel when dragging starts", async () => {
      const { wrapper, panelStore } = doMount();
      panelStore.isExtensionPanelOpen = true;
      await wrapper.trigger("dragstart", testEvent);

      expect(panelStore.isExtensionPanelOpen).toBe(false);
    });

    it("emits event to show node description when dragging is aborted", async () => {
      const { wrapper, panelStore } = doMount({ props: { isSelected: true } });
      panelStore.isExtensionPanelOpen = true;

      // start dragging while node is selected
      await wrapper.trigger("dragstart", testEvent);

      // abort dragging
      await wrapper.trigger("dragend", {
        dataTransfer: {
          dropEffect: "none", // this means abort
        },
      });

      expect(wrapper.emitted("showNodeDescription")).toBeDefined();
    });

    it("sets isDraggingNode as true when dragging starts", async () => {
      const { wrapper, nodeTemplatesStore } = doMount();
      expect(nodeTemplatesStore.draggedTemplateData).toBeNull();
      await wrapper.trigger("dragstart", testEvent);

      expect(nodeTemplatesStore.draggedTemplateData).not.toBeNull();
    });

    it("sets isDraggingNode as false when dragging ends", async () => {
      const { wrapper, nodeTemplatesStore } = doMount();
      await wrapper.trigger("dragend", { dataTransfer: { dropEffect: "" } });

      expect(nodeTemplatesStore.draggedTemplateData).toBeNull();
    });
  });
});
