import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { API } from "@api";

import { NodeState } from "@/api/gateway-api/generated-api";
import LoadingIndicator from "@/components/uiExtensions/LoadingIndicator.vue";
import CompositeViewLoader from "@/components/uiExtensions/compositeView/CompositeViewLoader.vue";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";

const mockedAPI = deepMocked(API);

const pageBuilderMountMock = vi.fn();
const mockUnmountShadowApp = vi.fn();
const mockLoadPage = vi.fn();
const isDirtyMock = vi.fn();
const isDefaultMock = vi.fn();
const hasPageMock = vi.fn();
const updateAndReexecuteMock = vi.fn();

describe("CompositeViewLoader.vue", () => {
  beforeAll(() => {
    import.meta.env.PROD = true;
    import.meta.env.DEV = false;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  type DoMountOptions = {
    executionState?: NodeState.ExecutionStateEnum;
    isReexecuting?: boolean;
  };

  const doMount = async (options: DoMountOptions = {}) => {
    const {
      executionState = NodeState.ExecutionStateEnum.EXECUTED,
      isReexecuting = false,
    } = options;
    const mockedStores = mockStores();

    vi.mocked(
      mockedStores.compositeViewStore.getPageBuilder,
    ).mockImplementation(() => {
      return Promise.resolve({
        mountShadowApp: pageBuilderMountMock,
        loadPage: mockLoadPage,
        isDirty: isDirtyMock,
        isDefault: isDefaultMock,
        hasPage: hasPageMock,
        updateAndReexecute: updateAndReexecuteMock,
        unmountShadowApp: mockUnmountShadowApp,
      } as any);
    });

    vi.mocked(mockedStores.compositeViewStore.isReexecuting).mockImplementation(
      () => isReexecuting,
    );

    const props = {
      projectId: "project",
      workflowId: "workflow",
      nodeId: "node",
      executionState,
    };

    const TestComponent = {
      template: `
        <Suspense>
          <CompositeViewLoader
            v-bind="$props"
          />
        </Suspense>
      `,
      components: { CompositeViewLoader },
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

    return { wrapper, compositeViewStore: mockedStores.compositeViewStore };
  };

  it("should mount componentView and initialize PageBuilder", async () => {
    const { compositeViewStore } = await doMount();
    expect(compositeViewStore.getPageBuilder).toHaveBeenCalled();

    expect(mockLoadPage).toHaveBeenCalled();
  });

  it("shadowApp should be unmounted when component is unmounted", async () => {
    const { wrapper } = await doMount();

    expect(pageBuilderMountMock).toHaveBeenCalled();

    wrapper.unmount();
    await flushPromises();
    expect(
      mockedAPI.compositeview.deactivateAllCompositeViewDataServices,
    ).toHaveBeenCalled();
    expect(mockUnmountShadowApp).toHaveBeenCalled();
  });

  it("should mount componentView and load page when node is executed", async () => {
    const { wrapper } = await doMount({
      executionState: NodeState.ExecutionStateEnum.CONFIGURED,
    });
    expect(mockLoadPage).not.toHaveBeenCalled();

    await wrapper.setProps({
      executionState: NodeState.ExecutionStateEnum.EXECUTED,
    });

    expect(mockLoadPage).toHaveBeenCalled();
  });

  it("shows LoadingIndicator when reexecuting and no page", async () => {
    hasPageMock.mockReturnValue(false);

    const { wrapper } = await doMount({ isReexecuting: true });

    const loadingIndicator = wrapper.findComponent(LoadingIndicator);
    expect(loadingIndicator).toBeDefined();
  });

  it("emits error when mounting fails", async () => {
    const errorMessage = "Failed to mount";
    pageBuilderMountMock.mockImplementationOnce(() => {
      throw new Error(errorMessage);
    });
    const { wrapper } = await doMount();

    const compositeViewLoader = wrapper.findComponent(CompositeViewLoader);

    expect(compositeViewLoader.emitted("loadingStateChange")).toContainEqual([
      {
        value: "error",
        message: `Failed to initialize PageBuilder: ${errorMessage}`,
      },
    ]);
  });

  it("emits loading states correctly during mount", async () => {
    const { wrapper } = await doMount();

    const compositeViewLoader = wrapper.findComponent(CompositeViewLoader);

    expect(compositeViewLoader.emitted("loadingStateChange")).toEqual([
      [{ value: "loading", message: "Loading page" }],
      [{ value: "ready" }],
      [{ value: "loading", message: "Loading view" }],
      [{ value: "ready" }],
    ]);
  });

  it("emits pagebuilderHasPage as false when no page exists", async () => {
    hasPageMock.mockReturnValue(false);
    const { wrapper } = await doMount();

    const compositeViewLoader = wrapper.findComponent(CompositeViewLoader);

    expect(compositeViewLoader.emitted("pagebuilderHasPage")).toEqual([
      [false],
    ]);
  });

  it("unmounts and remounts when projectId, workflowId, or nodeId changes", async () => {
    const { wrapper } = await doMount();
    expect(pageBuilderMountMock).toHaveBeenCalledTimes(1);

    await wrapper.setProps({ nodeId: "new-node-id" });
    await flushPromises();

    expect(
      mockedAPI.compositeview.deactivateAllCompositeViewDataServices,
    ).toHaveBeenCalled();
    expect(mockUnmountShadowApp).toHaveBeenCalled();
    expect(pageBuilderMountMock).toHaveBeenCalledTimes(2);
  });

  it("logs error when deactivating data services fails", async () => {
    const error = new Error("Deactivation failed");
    vi.spyOn(consola, "error").mockImplementation(() => {});
    mockedAPI.compositeview.deactivateAllCompositeViewDataServices.mockImplementationOnce(
      () => {
        throw error;
      },
    );

    const { wrapper } = await doMount();
    wrapper.unmount();

    expect(
      mockedAPI.compositeview.deactivateAllCompositeViewDataServices,
    ).toHaveBeenCalled();
    expect(consola.error).toHaveBeenCalled();
    expect(mockUnmountShadowApp).toHaveBeenCalled();
  });
});
