import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { mockVuexStore } from "@/test/utils";

import * as workflowStore from "@/store/workflow";
import * as applicationStore from "@/store/application";
import * as uiControlsStore from "@/store/uiControls";
import { createWorkflow } from "@/test/factories";
import type { Workflow } from "@/api/custom-types";
import WorkflowInfoBar from "../WorkflowInfoBar.vue";
import { WorkflowInfo } from "@/api/gateway-api/generated-api";
import StreamingInfo from "../StreamingInfo.vue";
import RemoteWorkflowInfo from "../RemoteWorkflowInfo.vue";

describe("WorkflowInfoBar.vue", () => {
  const doMount = ({ workflow }: { workflow?: Workflow } = {}) => {
    const $store = mockVuexStore({
      workflow: workflowStore,
      application: applicationStore,
      uiControls: uiControlsStore,
    });

    $store.commit("workflow/setActiveWorkflow", workflow ?? createWorkflow());

    const wrapper = mount(WorkflowInfoBar, {
      global: {
        plugins: [$store],
      },
    });

    return { wrapper, $store };
  };

  it("should render info bar for linked workflows", () => {
    const workflow = createWorkflow({
      info: {
        linked: true,
        containerType: WorkflowInfo.ContainerTypeEnum.Component,
        providerType: WorkflowInfo.ProviderTypeEnum.LOCAL,
      },
    });
    const { wrapper } = doMount({ workflow });

    expect(wrapper.find(".linked").exists()).toBe(true);
    expect(wrapper.text()).toMatch(
      "This is a linked component and therefore cannot be edited",
    );
    expect(wrapper.findComponent(StreamingInfo).exists()).toBe(false);
    expect(wrapper.findComponent(RemoteWorkflowInfo).exists()).toBe(false);
  });

  it("should render info bar for nested linked workflows", () => {
    const workflow = createWorkflow({
      info: {
        linked: true,
        containerType: WorkflowInfo.ContainerTypeEnum.Component,
        providerType: WorkflowInfo.ProviderTypeEnum.LOCAL,
      },
      parents: [
        {
          containerType: WorkflowInfo.ContainerTypeEnum.Component,
          linked: true,
        },
      ],
    });
    const { wrapper } = doMount({ workflow });

    expect(wrapper.find(".linked").exists()).toBe(true);
    expect(wrapper.text()).toMatch(
      "This is a component inside a linked component and cannot be edited",
    );
    expect(wrapper.findComponent(StreamingInfo).exists()).toBe(false);
    expect(wrapper.findComponent(RemoteWorkflowInfo).exists()).toBe(false);
  });

  it("should render streaming icon", () => {
    const workflow = createWorkflow({
      info: {
        // any non-falsy value works for the purpose of the test
        jobManager: {},
        providerType: WorkflowInfo.ProviderTypeEnum.LOCAL,
      },
    });
    const { wrapper } = doMount({ workflow });

    expect(wrapper.findComponent(StreamingInfo).exists()).toBe(true);
    expect(wrapper.findComponent(RemoteWorkflowInfo).exists()).toBe(false);
  });

  it("should render info bar for remote workflows", () => {
    const workflow = createWorkflow({
      info: {
        providerType: WorkflowInfo.ProviderTypeEnum.HUB,
      },
    });
    const { wrapper } = doMount({ workflow });

    expect(wrapper.findComponent(StreamingInfo).exists()).toBe(false);
    expect(wrapper.findComponent(RemoteWorkflowInfo).exists()).toBe(true);
  });
});
