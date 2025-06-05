import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { API } from "@api";

import { NodeState } from "@/api/gateway-api/generated-api";
import LoadingIndicator from "@/components/uiExtensions/LoadingIndicator.vue";
import ComponentViewLoader from "@/components/uiExtensions/componentView/ComponentViewLoader.vue";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";

const mockedAPI = deepMocked(API);

const pageBuilderMountMock = vi.hoisted(() => vi.fn());
const mockUnmountShadowApp = vi.hoisted(() => vi.fn());
const mockLoadPage = vi.hoisted(() => vi.fn());
const isDirtyMock = vi.hoisted(() => vi.fn());
const isDefaultMock = vi.hoisted(() => vi.fn());
const hasPageMock = vi.hoisted(() => vi.fn());
const updateAndReexecuteMock = vi.hoisted(() => vi.fn());
const onDirtyChangeCallback = vi.hoisted(() => vi.fn());

// Mock usePageBuilder to capture the onDirty callback
vi.mock("@/composables/usePageBuilder/usePageBuilder.ts", () => ({
  usePageBuilder: vi.fn().mockImplementation((_, callback) => {
    onDirtyChangeCallback.mockImplementation(callback);
    return Promise.resolve({
      mountShadowApp: pageBuilderMountMock,
      loadPage: mockLoadPage,
      isDirty: isDirtyMock,
      isDefault: isDefaultMock,
      hasPage: hasPageMock,
      updateAndReexecute: updateAndReexecuteMock,
      unmountShadowApp: mockUnmountShadowApp,
    });
  }),
}));

const mockIsReexecuting = vi
  .fn()
  .mockImplementation((nodeId) => nodeId === "node");
vi.mock("@/composables/usePageBuilder/useReexecutingState", () => ({
  useReexecutingCompositeViewState: () => ({
    isReexecuting: mockIsReexecuting,
  }),
}));

describe("ComponentViewLoader.vue", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const doMount = async (
    executionState = NodeState.ExecutionStateEnum.EXECUTED,
  ) => {
    const mockedStores = mockStores();

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
      global: {
        plugins: [mockedStores.testingPinia],
      },
    });

    await nextTick();
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
    await flushPromises();
    expect(
      mockedAPI.component.deactivateAllComponentDataServices,
    ).toHaveBeenCalled();
    expect(mockUnmountShadowApp).toHaveBeenCalled();
  });

  it("should mount componentView and load page when node is executed", async () => {
    const { wrapper } = await doMount(NodeState.ExecutionStateEnum.CONFIGURED);
    expect(mockLoadPage).not.toHaveBeenCalled();

    await wrapper.setProps({
      executionState: NodeState.ExecutionStateEnum.EXECUTED,
    });

    expect(mockLoadPage).toHaveBeenCalled();
  });

  it("shows LoadingIndicator when reexecuting and no page", async () => {
    hasPageMock.mockReturnValue(false);
    mockIsReexecuting.mockImplementation((nodeId) => nodeId === "node");

    const { wrapper } = await doMount();

    const loadingIndicator = wrapper.findComponent(LoadingIndicator);
    expect(loadingIndicator).toBeDefined();
  });

  it("emits error when mounting fails", async () => {
    const errorMessage = "Failed to mount";
    pageBuilderMountMock.mockImplementationOnce(() => {
      throw new Error(errorMessage);
    });
    const { wrapper } = await doMount();

    const componentViewLoader = wrapper.findComponent(ComponentViewLoader);

    expect(componentViewLoader.emitted("loadingStateChange")).toContainEqual([
      {
        value: "error",
        message: `Failed to initialize PageBuilder: ${errorMessage}`,
      },
    ]);
  });

  it("emits loading states correctly during mount", async () => {
    const { wrapper } = await doMount();

    const componentViewLoader = wrapper.findComponent(ComponentViewLoader);

    expect(componentViewLoader.emitted("loadingStateChange")).toEqual([
      [{ value: "loading", message: "Loading page" }],
      [{ value: "ready" }],
      [{ value: "loading", message: "Loading view" }],
      [{ value: "ready" }],
    ]);
  });

  it("emits pagebuilderHasPage as false when no page exists", async () => {
    hasPageMock.mockReturnValue(false);
    const { wrapper } = await doMount();

    const componentViewLoader = wrapper.findComponent(ComponentViewLoader);

    expect(componentViewLoader.emitted("pagebuilderHasPage")).toEqual([
      [false],
    ]);
  });

  it("unmounts and remounts when projectId, workflowId, or nodeId changes", async () => {
    const { wrapper } = await doMount();
    expect(pageBuilderMountMock).toHaveBeenCalledTimes(1);

    await wrapper.setProps({ nodeId: "new-node-id" });
    await flushPromises();

    expect(
      mockedAPI.component.deactivateAllComponentDataServices,
    ).toHaveBeenCalled();
    expect(mockUnmountShadowApp).toHaveBeenCalled();
    expect(pageBuilderMountMock).toHaveBeenCalledTimes(2);
  });

  it("logs error when deactivating data services fails", async () => {
    const error = new Error("Deactivation failed");
    vi.spyOn(consola, "error").mockImplementation(() => {});
    mockedAPI.component.deactivateAllComponentDataServices.mockImplementationOnce(
      () => {
        throw error;
      },
    );

    const { wrapper } = await doMount();
    wrapper.unmount();

    expect(
      mockedAPI.component.deactivateAllComponentDataServices,
    ).toHaveBeenCalled();
    expect(consola.error).toHaveBeenCalled();
    expect(mockUnmountShadowApp).toHaveBeenCalled();
  });
});
