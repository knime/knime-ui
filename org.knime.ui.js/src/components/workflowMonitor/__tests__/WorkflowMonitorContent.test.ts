import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import {
  ComponentNodeAndDescription,
  type WorkflowMonitorState,
} from "@/api/gateway-api/generated-api";
import {
  createComponentNode,
  createNativeNode,
  createWorkflow,
  createWorkflowMonitorMessage,
} from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import WorkflowMonitorContent from "../WorkflowMonitorContent.vue";
import WorkflowMonitorMessage from "../WorkflowMonitorMessage.vue";

describe("WorkflowMonitorContent.vue", () => {
  const doMount = () => {
    const mockedStores = mockStores();

    mockedStores.workflowMonitorStore.setHasLoaded(true);

    const wrapper = mount(WorkflowMonitorContent, {
      global: { plugins: [mockedStores.testingPinia] },
      attachTo: document.body,
    });

    return { wrapper, mockedStores };
  };

  const initState = async (mockedStores: ReturnType<typeof mockStores>) => {
    const node1 = createNativeNode({ id: "root:1" });
    const node2 = createNativeNode({ id: "root:2" });

    const workflowMonitorState: WorkflowMonitorState = {
      errors: [
        createWorkflowMonitorMessage({
          nodeId: node1.id,
          message: "something is really bad with this node",
        }),
      ],
      warnings: [
        createWorkflowMonitorMessage({
          nodeId: node2.id,
          message: "something is ok-ish with this node",
        }),
      ],
    };

    const workflow = createWorkflow({
      nodes: { [node1.id]: node1, [node2.id]: node2 },
    });

    mockedStores.workflowMonitorStore.setCurrentState(workflowMonitorState);
    mockedStores.workflowStore.setActiveWorkflow(workflow);
    await nextTick();
    await flushPromises();
  };

  const initStateComponent = async (
    mockedStores: ReturnType<typeof mockStores>,
  ) => {
    const component1 = createComponentNode({ id: "root:1" });

    const workflowMonitorState: WorkflowMonitorState = {
      errors: [
        {
          name: "Some component",
          nodeId: "root:1:1",
          message: "error on this node inside the shared component",
          workflowId: "root",
          componentInfo: {
            name: "The Component",
            type: ComponentNodeAndDescription.TypeEnum.Manipulator,
            icon: "data:image/error-icon",
          },
        },
      ],
      warnings: [
        {
          name: "Some component",
          nodeId: "root:1:2",
          message:
            "something is ok-ish with this node inside the shared component",
          workflowId: "root",
          componentInfo: {
            name: "The Component",
            type: ComponentNodeAndDescription.TypeEnum.Manipulator,
            icon: "data:image/warn-icon",
          },
        },
      ],
    };
    const workflow = createWorkflow({
      nodes: { [component1.id]: component1 },
    });

    mockedStores.workflowMonitorStore.setCurrentState(workflowMonitorState);
    mockedStores.workflowStore.setActiveWorkflow(workflow);
    await nextTick();
  };

  it("should render", async () => {
    const { wrapper, mockedStores } = doMount();

    expect(wrapper.find(".empty-message").exists()).toBe(true);
    expect(wrapper.find("[data-test-id='errors']").isVisible()).toBe(false);
    expect(wrapper.find("[data-test-id='warnings']").isVisible()).toBe(false);

    await initState(mockedStores);

    expect(wrapper.find(".empty-message").exists()).toBe(false);
    expect(wrapper.find("[data-test-id='errors']").isVisible()).toBe(true);
    expect(wrapper.find("[data-test-id='warnings']").isVisible()).toBe(true);
  });

  it("should show component info", async () => {
    const { wrapper, mockedStores } = doMount();

    await initStateComponent(mockedStores);

    const errors = wrapper.find("[data-test-id='errors']");
    const warnings = wrapper.find("[data-test-id='warnings']");

    expect(errors.isVisible()).toBe(true);
    expect(warnings.isVisible()).toBe(true);

    expect(errors.find("image").attributes("href")).toBe(
      "data:image/error-icon",
    );

    expect(warnings.find("image").attributes("href")).toBe(
      "data:image/warn-icon",
    );
  });

  it("should call action to navigate to issue", async () => {
    const { wrapper, mockedStores } = doMount();

    await initState(mockedStores);

    wrapper
      .find('[data-test-id="errors"]')
      .findComponent(WorkflowMonitorMessage)
      .vm.$emit("showIssue");

    await nextTick();

    expect(
      mockedStores.workflowMonitorStore.navigateToIssue,
    ).toHaveBeenCalledWith({
      message: mockedStores.workflowMonitorStore.currentState.errors.at(0),
    });
  });

  it("should set the prop to highlight messages", async () => {
    const { wrapper, mockedStores } = doMount();

    await initState(mockedStores);

    expect(
      wrapper
        .find('[data-test-id="errors"]')
        .findComponent(WorkflowMonitorMessage)
        .props("isHighlighted"),
    ).toBe(false);

    await mockedStores.selectionStore.selectNodes(["root:1"]);
    await flushPromises();
    await nextTick();

    expect(
      wrapper
        .find('[data-test-id="errors"]')
        .findComponent(WorkflowMonitorMessage)
        .props("isHighlighted"),
    ).toBe(true);
  });
});
