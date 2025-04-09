import { beforeAll, describe, expect, it, vi } from "vitest";
import { computed } from "vue";
import { mount } from "@vue/test-utils";

import type { Workflow } from "@/api/custom-types";
import {
  SpaceItemReference,
  WorkflowInfo,
} from "@/api/gateway-api/generated-api";
import { isBrowser, isDesktop } from "@/environment";
import { createWorkflow } from "@/test/factories";
import { mockEnvironment } from "@/test/utils/mockEnvironment";
import { mockStores } from "@/test/utils/mockStores";
import RemoteWorkflowInfo from "../RemoteWorkflowInfo.vue";
import StreamingInfo from "../StreamingInfo.vue";
import WorkflowInfoBar from "../WorkflowInfoBar.vue";

vi.mock("@/environment");

vi.mock("@/store/canvas/useCurrentCanvasStore", () => {
  return {
    useCurrentCanvasStore: () =>
      computed(() => ({ containerSize: { width: 100 } })),
  };
});

describe("WorkflowInfoBar.vue", () => {
  beforeAll(() => {
    mockEnvironment("DESKTOP", { isBrowser, isDesktop });
  });

  const doMount = ({
    workflow,
    origin,
  }: { workflow?: Workflow; origin?: SpaceItemReference } = {}) => {
    const mockedStores = mockStores();

    mockedStores.workflowStore.setActiveWorkflow(workflow ?? createWorkflow());

    // @ts-expect-error
    mockedStores.applicationStore.activeProjectOrigin = origin || null;

    const wrapper = mount(WorkflowInfoBar, {
      global: {
        plugins: [mockedStores.testingPinia],
      },
    });

    return { wrapper, ...mockedStores };
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
