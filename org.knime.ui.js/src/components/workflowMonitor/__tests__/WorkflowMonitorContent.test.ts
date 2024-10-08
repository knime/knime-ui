import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import type { Store } from "vuex";

import {
  ComponentNodeAndDescription,
  type WorkflowMonitorState,
} from "@/api/gateway-api/generated-api";
import * as nodeTemplatesStore from "@/store/nodeTemplates";
import * as selectionStore from "@/store/selection";
import * as workflowStore from "@/store/workflow";
import * as workflowMonitorStore from "@/store/workflowMonitor";
import {
  createComponentNode,
  createNativeNode,
  createWorkflow,
  createWorkflowMonitorMessage,
} from "@/test/factories";
import { mockVuexStore } from "@/test/utils";
import WorkflowMonitorContent from "../WorkflowMonitorContent.vue";
import WorkflowMonitorMessage from "../WorkflowMonitorMessage.vue";

describe("WorkflowMonitorContent.vue", () => {
  const doMount = () => {
    const $store = mockVuexStore({
      workflow: workflowStore,
      workflowMonitor: workflowMonitorStore,
      nodeTemplates: nodeTemplatesStore,
      selection: selectionStore,
    });

    $store.commit("workflowMonitor/setHasLoaded", true);

    const wrapper = mount(WorkflowMonitorContent, {
      global: { plugins: [$store] },
      attachTo: document.body,
    });

    return { wrapper, $store };
  };

  const initState = async ($store: Store<any>) => {
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

    $store.commit("workflowMonitor/setCurrentState", workflowMonitorState);
    $store.commit("workflow/setActiveWorkflow", workflow);
    await nextTick();
  };

  const initStateComponent = async ($store: Store<any>) => {
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

    $store.commit("workflowMonitor/setCurrentState", workflowMonitorState);
    $store.commit("workflow/setActiveWorkflow", workflow);
    await nextTick();
  };

  it("should render", async () => {
    const { wrapper, $store } = doMount();

    expect(wrapper.find(".empty-message").exists()).toBe(true);
    expect(wrapper.find("[data-test-id='errors']").isVisible()).toBe(false);
    expect(wrapper.find("[data-test-id='warnings']").isVisible()).toBe(false);

    await initState($store);

    expect(wrapper.find(".empty-message").exists()).toBe(false);
    expect(wrapper.find("[data-test-id='errors']").isVisible()).toBe(true);
    expect(wrapper.find("[data-test-id='warnings']").isVisible()).toBe(true);
  });

  it("should show component info", async () => {
    const { wrapper, $store } = doMount();

    await initStateComponent($store);

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
    const { wrapper, $store } = doMount();

    const dispatchSpy = vi.spyOn($store, "dispatch");

    await initState($store);

    wrapper
      .find('[data-test-id="errors"]')
      .findComponent(WorkflowMonitorMessage)
      .vm.$emit("showIssue");

    await nextTick();

    expect(dispatchSpy).toHaveBeenCalledWith(
      "workflowMonitor/navigateToIssue",
      { message: $store.state.workflowMonitor.currentState.errors.at(0) },
    );
  });

  it("should set the prop to highlight messages", async () => {
    const { wrapper, $store } = doMount();

    await initState($store);

    expect(
      wrapper
        .find('[data-test-id="errors"]')
        .findComponent(WorkflowMonitorMessage)
        .props("isHighlighted"),
    ).toBe(false);

    await $store.dispatch("selection/selectNode", "root:1");

    expect(
      wrapper
        .find('[data-test-id="errors"]')
        .findComponent(WorkflowMonitorMessage)
        .props("isHighlighted"),
    ).toBe(true);
  });
});
