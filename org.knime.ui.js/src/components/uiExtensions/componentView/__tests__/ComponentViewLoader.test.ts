import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import { NodeState } from "@/api/gateway-api/generated-api.ts";
import ComponentViewLoader from "@/components/uiExtensions/componentView/ComponentViewLoader.vue";

const pageBuilderMountMock = vi.hoisted(() => vi.fn());

const mockUnmountShadowApp = vi.hoisted(() => vi.fn());

const mockLoadPage = vi.hoisted(() => vi.fn());

vi.mock("@/composables/usePageBuilder/usePageBuilder.ts", () => ({
  usePageBuilder: vi.fn().mockResolvedValue({
    mountShadowApp: pageBuilderMountMock,
    loadPage: mockLoadPage,
    unmountShadowApp: mockUnmountShadowApp,
  }),
}));

describe("ComponentViewLoader.vue", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const doMount = async (
    executionState = NodeState.ExecutionStateEnum.EXECUTED,
  ) => {
    const props = {
      projectId: "project",
      workflowId: "workflow",
      nodeId: "node",
      executionState,
    };

    const TestComponent = {
      template: `
        <Suspense>
          <ComponentViewLoader
            v-bind="$props"
          />
        </Suspense>
      `,
      components: { ComponentViewLoader },
      props,
    };

    const wrapper = mount(TestComponent, {
      props,
    });

    await nextTick();
    // wait for the fetch of the pagebuilder
    await flushPromises();

    return { wrapper };
  };

  it("should mount componentView and initialize PageBuilder", async () => {
    await doMount();
    expect(pageBuilderMountMock).toHaveBeenCalled();

    expect(mockLoadPage).toHaveBeenCalled();
  });

  it("shadowApp should be unmounted when component is unmounted", async () => {
    const { wrapper } = await doMount();

    expect(pageBuilderMountMock).toHaveBeenCalled();

    wrapper.unmount();
    expect(mockUnmountShadowApp).toHaveBeenCalled();
  });

  it("should mount componentView and load page when node is executed", async () => {
    const { wrapper } = await doMount(NodeState.ExecutionStateEnum.CONFIGURED);
    expect(mockLoadPage).not.toHaveBeenCalled();

    await wrapper.setProps({
      executionState: NodeState.ExecutionStateEnum.EXECUTED,
    });
    await nextTick();
    expect(mockLoadPage).toHaveBeenCalled();
  });
});
