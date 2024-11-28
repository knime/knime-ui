import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import type { Workflow } from "@/api/custom-types";
import {
  SpaceItemReference,
  WorkflowInfo,
} from "@/api/gateway-api/generated-api";
import * as applicationStore from "@/store/application";
import * as uiControlsStore from "@/store/uiControls";
import * as workflowStore from "@/store/workflow";
import { createWorkflow } from "@/test/factories";
import { mockVuexStore } from "@/test/utils";
import { setEnvironment } from "@/test/utils/setEnvironment";
import RemoteWorkflowInfo from "../RemoteWorkflowInfo.vue";
import StreamingInfo from "../StreamingInfo.vue";
import WorkflowInfoBar from "../WorkflowInfoBar.vue";

describe("WorkflowInfoBar.vue", () => {
  const doMount = ({
    workflow,
    origin,
  }: { workflow?: Workflow; origin?: SpaceItemReference } = {}) => {
    const $store = mockVuexStore({
      workflow: workflowStore,
      application: {
        ...applicationStore,
        getters: {
          ...applicationStore.getters,
          activeProjectOrigin: () => origin || null,
        },
      },
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

  it("should render info bar for versioned workflows not in their latest version", () => {
    setEnvironment("DESKTOP");

    const workflow = createWorkflow({
      info: {
        providerType: WorkflowInfo.ProviderTypeEnum.HUB,
      },
    });

    const origin = {
      itemId: "itemId",
      providerId: "providerId",
      spaceId: "spaceId",
      ancestorItemIds: [],
      version: {
        version: 1,
        author: "author",
        authorAccountId: "authorAccountId",
        createdOn: "createdOn",
        description: "description",
        title: "Testversion123",
      },
    };

    const { wrapper } = doMount({ workflow, origin });

    expect(wrapper.text()).toMatch(
      `You are currently viewing version "${origin.version.title}" of this workflow.`,
    );
  });
});
