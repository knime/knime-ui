import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import type { Store } from "vuex";
import { mockVuexStore } from "@/test/utils";

import * as nodeTemplatesStore from "@/store/nodeTemplates";
import * as workflowMonitorStore from "@/store/workflowMonitor";
import type { WorkflowMonitorState } from "@/api/gateway-api/generated-api";
import { createWorkflowMonitorMessage } from "@/test/factories";
import WorkflowMonitorContent from "../WorkflowMonitorContent.vue";
import WorkflowMonitorMessage from "../WorkflowMonitorMessage.vue";

describe("WorkflowMonitorContent.vue", () => {
  const doMount = () => {
    const $store = mockVuexStore({
      workflow: { activeWorkflow: null },
      workflowMonitor: workflowMonitorStore,
      nodeTemplates: nodeTemplatesStore,
    });

    $store.commit("workflowMonitor/setHasLoaded", true);

    const wrapper = mount(WorkflowMonitorContent, {
      global: { plugins: [$store] },
    });

    return { wrapper, $store };
  };

  const initState = async ($store: Store<any>) => {
    const workflowMonitorState: WorkflowMonitorState = {
      errors: [
        createWorkflowMonitorMessage({
          nodeId: "root:1",
          message: "something is really bad with this node",
        }),
      ],
      warnings: [
        createWorkflowMonitorMessage({
          nodeId: "root:1",
          message: "something is ok-ish with this node",
        }),
      ],
    };

    $store.commit("workflowMonitor/setCurrentState", workflowMonitorState);
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
    expect(wrapper.find("[data-test-id='warnings']").isVisible()).toBe(false);

    $store.commit("workflowMonitor/setActiveFilter", "SHOW_ALL");
    await nextTick();

    expect(wrapper.find("[data-test-id='errors']").isVisible()).toBe(true);
    expect(wrapper.find("[data-test-id='warnings']").isVisible()).toBe(true);
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
});
