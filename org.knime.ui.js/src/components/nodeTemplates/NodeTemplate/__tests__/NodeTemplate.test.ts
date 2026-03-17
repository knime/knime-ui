import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { API } from "@api";

import { FunctionButton } from "@knime/components";
import CircleHelp from "@knime/styles/img/icons/circle-help.svg";

import { PortType } from "@/api/gateway-api/generated-api";
import {
  createAvailablePortTypes,
  createNodeTemplateWithExtendedPorts,
  createWorkflow,
} from "@/test/factories";
import { deepMocked, mockBoundingRect } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import NodeTemplate from "../NodeTemplate.vue";
import NodeTemplateIconMode from "../NodeTemplateIconMode.vue";
import NodeTemplateListMode from "../NodeTemplateListMode.vue";

const mockedAPI = deepMocked(API);

const { addComponentWithAutoPositioning, addNodeWithAutoPositioning } =
  vi.hoisted(() => ({
    addNodeWithAutoPositioning: vi.fn(),
    addComponentWithAutoPositioning: vi.fn(),
  }));

vi.mock("../../useAddNodeTemplateWithAutoPositioning", () => ({
  useAddNodeTemplateWithAutoPositioning: () => ({
    addNodeWithAutoPositioning,
    addComponentWithAutoPositioning,
  }),
}));

describe("NodeTemplate.vue", () => {
  type ComponentProps = InstanceType<typeof NodeTemplate>["$props"];
  const defaultProps: ComponentProps = {
    nodeTemplate: createNodeTemplateWithExtendedPorts({
      id: "node_1",
      name: "Test",
    }),
    isSelected: false,
    isHighlighted: false,
    allowShowingDetails: true,
    isDescriptionActive: false,
  };

  type MountOpts = {
    props?: Partial<ComponentProps>;
    mocks?: Record<string, unknown>;
  };

  const doMount = ({ props = {}, mocks = {} }: MountOpts = {}) => {
    const mockedStores = mockStores();

    mockedAPI.workflowCommand.AddNode.mockResolvedValue({
      newNodeId: "root:1",
    });

    mockedStores.applicationStore.setAvailablePortTypes(
      createAvailablePortTypes({
        "org.port.mockId": {
          kind: PortType.KindEnum.Table,
          color: "mockColor",
          name: "mock_port",
        },
      }),
    );

    (mockedStores.workflowStore as any).isWritable = true;
    mockedStores.workflowStore.setActiveWorkflow(createWorkflow());

    const wrapper = mount(NodeTemplate, {
      props: { ...defaultProps, ...props },
      global: {
        mocks: { ...mocks },
        plugins: [mockedStores.testingPinia],
      },
    });

    return { wrapper, mockedStores };
  };

  it("emits event when help icon is clicked", () => {
    const { wrapper } = doMount();

    expect(
      wrapper.findComponent(FunctionButton).findComponent(CircleHelp).exists(),
    ).toBe(true);

    wrapper.findComponent(FunctionButton).vm.$emit("click");

    expect(wrapper.emitted("toggleDetails")).toBeDefined();
  });

  it("does not show question mark icon for quick add node menu", () => {
    const { wrapper } = doMount({
      props: {
        allowShowingDetails: false,
      },
    });

    expect(wrapper.findComponent(FunctionButton).exists()).toBe(false);
  });

  it("adds class when node is hovered over", async () => {
    const { wrapper } = doMount();

    await wrapper.find(".node").trigger("pointerenter");
    const button = wrapper.find(".description-icon");

    expect(button.classes()).toContain("hovered-icon");

    await wrapper.find(".node").trigger("pointerleave");

    expect(button.classes()).not.toContain("hovered-icon");
  });

  it.each([
    ["icon" as const, NodeTemplateIconMode],
    ["list" as const, NodeTemplateListMode],
  ])(
    "renders the proper component for displayMode: %s",
    (displayMode, component) => {
      const { wrapper } = doMount({ props: { displayMode } });

      expect(wrapper.findComponent(component).exists()).toBe(true);
    },
  );

  describe("double click", () => {
    it("adds node to workflow on double click", async () => {
      const { wrapper } = doMount();

      addNodeWithAutoPositioning.mockResolvedValue({ newNodeId: "root:1" });
      await wrapper.find(".node").trigger("dblclick");
      await flushPromises();

      expect(addNodeWithAutoPositioning).toHaveBeenCalledWith({
        className:
          "org.knime.base.node.preproc.filter.column.DataColumnSpecFilterNodeFactory",
      });
      expect(wrapper.emitted("dblClickInsertNode")![0][0]).toEqual({
        newNodeId: "root:1",
        template: defaultProps.nodeTemplate,
      });
    });
  });

  describe("drag node", () => {
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
      mockBoundingRect({
        width: 70,
        height: 70,
      });

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

    it("closes description panel when dragging starts", async () => {
      const { wrapper, mockedStores } = doMount();
      mockedStores.panelStore.isExtensionPanelOpen = true;
      await wrapper.trigger("dragstart", testEvent);

      expect(mockedStores.panelStore.isExtensionPanelOpen).toBe(false);
    });
  });
});
