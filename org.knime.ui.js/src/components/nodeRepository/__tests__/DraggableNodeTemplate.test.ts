import { expect, describe, beforeEach, afterEach, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import * as Vue from "vue";
import { deepMocked, mockBoundingRect, mockVuexStore } from "@/test/utils";

import {
  NativeNodeInvariants,
  PortType,
  type NodeTemplate,
} from "@/api/gateway-api/generated-api";
import { API } from "@api";

import * as panelStore from "@/store/panel";
import * as worflowStore from "@/store/workflow";
import * as nodeTemplatesStore from "@/store/nodeTemplates";
import * as selectionStore from "@/store/selection";
import { createAvailablePortTypes, createWorkflow } from "@/test/factories";

import DraggableNodeTemplate from "../DraggableNodeTemplate.vue";

const mockedAPI = deepMocked(API);

let KnimeMIME: string;
vi.mock("@/composables/useDropNode", () => ({
  useDropNode: () => ({ KnimeMIME }),
}));

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
    component: true,
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  const doMount = ({ props = {}, isWritable = null } = {}) => {
    const defaultProps = { nodeTemplate: baseNodeTemplate };

    const $store = mockVuexStore({
      application: {
        state: {
          availablePortTypes: createAvailablePortTypes({
            "org.port.mockId": {
              kind: PortType.KindEnum.Table,
              color: "mockColor",
              name: "mockport",
            },
          }),
        },
      },
      panel: panelStore,
      workflow: {
        ...worflowStore,
        getters: {
          ...worflowStore.getters,
          isWritable: isWritable || (() => true),
        },
      },
      canvas: {
        getters: {
          getVisibleFrame: () =>
            vi.fn().mockReturnValue({
              left: 0,
              top: 0,
              width: 500,
              height: 500,
            }),
        },
      },
      nodeTemplates: nodeTemplatesStore,
      selection: selectionStore,
    });

    const workflow = createWorkflow();
    $store.commit("workflow/setActiveWorkflow", workflow);

    const wrapper = mount(DraggableNodeTemplate, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [$store],
        mocks: { $shapes: { nodeSize: 32 } },
      },
    });

    return { wrapper, $store };
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
      // @ts-ignore
      Document.prototype.getElementById = vi.fn(() => ({
        clientWidth: 1920,
        clientHeight: 1080,
        scrollLeft: 10,
        scrollTop: 10,
      }));
    });

    it("adds node to workflow on double click", async () => {
      const { wrapper } = doMount();

      wrapper.find(".node").trigger("dblclick");
      await Vue.nextTick();

      expect(mockedAPI.workflowCommand.AddNode).toHaveBeenCalledWith(
        expect.objectContaining({ position: { x: 235, y: 170 } }),
      );
    });

    it("looks for free space to position node if there is already a node", async () => {
      const { wrapper, $store } = doMount();
      $store.state.workflow.activeWorkflow.nodes["root:2"].position = {
        x: 234,
        y: 171.5,
      };

      wrapper.find(".node").trigger("dblclick");
      await Vue.nextTick();

      expect(mockedAPI.workflowCommand.AddNode).toHaveBeenCalledWith(
        expect.objectContaining({ position: { x: 355, y: 290 } }),
      );
    });

    it("does nothing on double click if workflow it not writeable", async () => {
      const { wrapper } = doMount({ isWritable: () => false });

      wrapper.find(".node").trigger("dblclick");
      await Vue.nextTick();

      expect(mockedAPI.workflowCommand.AddNode).not.toHaveBeenCalled();
    });

    it("takes single selected node into account", async () => {
      const { wrapper, $store } = doMount();
      $store.state.workflow.activeWorkflow.nodes["root:2"].position = {
        x: 100,
        y: 100,
      };
      $store.state.selection.selectedNodes = {
        "root:2": true,
      };

      wrapper.find(".node").trigger("dblclick");
      await Vue.nextTick();

      expect(mockedAPI.workflowCommand.AddNode).toHaveBeenCalledWith(
        expect.objectContaining({
          position: { x: 220, y: 100 },
          sourceNodeId: "root:2",
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
      expect(document.body.childNodes.length).toBe(0);

      // add node preview clone
      wrapper.trigger("dragstart", testEvent);

      expect(document.body.childNodes.length).toBe(1);
      expect(document.body.childNodes[0]).toBe(wrapper.vm.dragGhost);
      expect(wrapper.vm.dragGhost).toBeTruthy();

      // remove node preview clone
      wrapper.trigger("dragend", { dataTransfer: { dropEffect: "" } });

      expect(document.body.childNodes.length).toBe(0);
      expect(wrapper.vm.dragGhost).toBeFalsy();
    });

    it("sets a ghostImage", () => {
      const { wrapper } = doMount();

      wrapper.trigger("dragstart", testEvent);

      const clonedNodePreview = wrapper.vm.dragGhost;

      // Correct Styling
      expect(clonedNodePreview.style.position).toBe("absolute");
      expect(clonedNodePreview.style.left).toBe("-100px");
      expect(clonedNodePreview.style.top).toBe("0px");
      expect(clonedNodePreview.style.width).toBe("70px");
      expect(clonedNodePreview.style.height).toBe("70px");

      expect(testEvent.dataTransfer.setDragImage).toHaveBeenCalledWith(
        wrapper.vm.dragGhost,
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
        KnimeMIME,
        JSON.stringify({
          className: "class-name",
          settings: "encoded-settings",
        }),
      );
    });

    it("changes cursor when dragged in write-protected mode", () => {
      const { wrapper } = doMount({ isWritable: () => false });

      wrapper.trigger("drag");
      const node = wrapper.find(".node");

      expect(node.attributes().style).toBe("cursor: not-allowed;");
    });

    it("removes style from node when dragging ends", () => {
      const { wrapper } = doMount({ isWritable: () => false });

      wrapper.trigger("drag");
      const node = wrapper.find(".node");

      expect(node.attributes().style).toBe("cursor: not-allowed;");

      wrapper.trigger("dragend", { dataTransfer: { dropEffect: "" } });

      expect(node.attributes().style).toBe("cursor: pointer;");
    });

    it("closes description panel when dragging starts", async () => {
      const { wrapper, $store } = doMount();
      $store.state.panel.isExtensionPanelOpen = true;
      await wrapper.trigger("dragstart", testEvent);

      expect($store.state.panel.isExtensionPanelOpen).toBe(false);
    });

    it("emits event to show node description when dragging is aborted", async () => {
      const { wrapper, $store } = doMount({ props: { isSelected: true } });
      $store.state.panel.isExtensionPanelOpen = true;

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
      const { wrapper, $store } = doMount();
      expect($store.state.nodeTemplates.draggedTemplateData).toBeNull();
      await wrapper.trigger("dragstart", testEvent);

      expect($store.state.nodeTemplates.draggedTemplateData).not.toBeNull();
    });

    it("sets isDraggingNode as false when dragging ends", async () => {
      const { wrapper, $store } = doMount();
      await wrapper.trigger("dragend", { dataTransfer: { dropEffect: "" } });

      expect($store.state.nodeTemplates.draggedTemplateData).toBeNull();
    });
  });
});
