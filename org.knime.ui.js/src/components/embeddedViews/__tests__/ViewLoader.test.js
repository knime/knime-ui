import { expect, describe, afterEach, it, vi } from "vitest";
import * as Vue from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import ViewLoader from "../ViewLoader.vue";
import { createApp } from "vue";
import { useDynamicImport } from "../useDynamicImport";
import { mockVuexStore } from "@/test/utils";

vi.mock("../useDynamicImport", () => ({
  useDynamicImport: vi.fn().mockReturnValue({
    dynamicImport: vi.fn(),
  }),
}));

describe("ViewLoader.vue", () => {
  const flushRender = () => new Promise((r) => setTimeout(r, 0));

  const setupDynamicMockComponent = ({
    initialData,
    componentName = "MockComponent",
  } = {}) => {
    const MockComponent = {
      name: componentName,
      props: {
        initialData: {
          type: Object,
          default: () => ({}),
        },
      },
      render() {
        return Vue.h("div", {
          class: "mock-component",
          "data-initial": initialData,
        });
      },
    };

    const viewConfigLoaderFn = vi.fn(() =>
      Promise.resolve({
        resourceInfo: {
          type: "VUE_COMPONENT_LIB",
          id: "MockComponent",
        },
        initialData: initialData || JSON.stringify({ result: {} }),
      }),
    );

    const { dynamicImport } = useDynamicImport();

    dynamicImport.mockReturnValue({
      default: (shadowRoot) => {
        const holder = document.createElement("div");
        const app = createApp(MockComponent);
        app.mount(holder);
        shadowRoot.appendChild(holder);
        return { teardown: () => {} };
      },
    });

    return { dynamicImport, viewConfigLoaderFn };
  };

  const renderKey = "123";
  const doMount = (customProps = {}) => {
    const store = mockVuexStore({
      // TODO: NXT-1295 remove once api store is not needed
      api: {
        getters: {
          uiExtResourceLocation: () => () => {},
        },
      },
    });

    const defaultProps = {
      renderKey,
      viewConfigLoaderFn: vi.fn(),
      initKnimeService: vi.fn(),
      resourceLocationResolver: vi.fn(),
    };

    return mount(ViewLoader, {
      props: {
        ...defaultProps,
        ...customProps,
      },
      global: { plugins: [store] },
    });
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["load view", true],
    ["not load view", false],
  ])(
    "should %s on mount when the `loadOnMount` prop is set to %s",
    (testType, loadOnMount) => {
      const viewConfigLoaderFn = vi.fn();
      doMount({ viewConfigLoaderFn, loadOnMount });

      if (testType.includes("not")) {
        expect(viewConfigLoaderFn).not.toHaveBeenCalled();
      } else {
        expect(viewConfigLoaderFn).toHaveBeenCalled();
      }
    },
  );

  it("should reload view when renderKey changes", async () => {
    const viewConfigLoaderFn = vi.fn();
    const wrapper = doMount({ viewConfigLoaderFn, loadOnMount: false });

    await wrapper.setProps({ renderKey: "changed" });
    expect(viewConfigLoaderFn).toHaveBeenCalled();
  });

  it("should render the dynamic view component", async () => {
    const { dynamicImport, viewConfigLoaderFn } = setupDynamicMockComponent({
      initialData: JSON.stringify({ result: { myProp: "mock-prop" } }),
    });

    const wrapper = doMount({ viewConfigLoaderFn });

    await flushRender();

    expect(dynamicImport).toHaveBeenCalled();

    const loadContainer = wrapper.find(".view-loader-container");
    const mockComponent =
      loadContainer.element.shadowRoot.querySelector(".mock-component");
    expect(mockComponent.classList[0]).toBe("mock-component");
    expect(
      JSON.parse(mockComponent.getAttribute("data-initial")),
    ).toStrictEqual({
      result: { myProp: "mock-prop" },
    });
  });

  it("should emit state:ready when the component is loaded successfully", async () => {
    const { viewConfigLoaderFn } = setupDynamicMockComponent();

    const wrapper = doMount({ viewConfigLoaderFn });

    expect(wrapper.emitted("stateChange")[0][0]).toEqual({
      state: "loading",
      portKey: renderKey,
    });

    await flushRender();

    expect(wrapper.emitted("stateChange")[1][0]).toEqual({
      state: "ready",
      portKey: renderKey,
    });
  });

  it("should emit state:error when an error occurs while loading the component", async () => {
    const error = new Error("Error loading");
    const viewConfigLoaderFn = vi.fn(() => {
      throw error;
    });
    const wrapper = doMount({ viewConfigLoaderFn });

    expect(wrapper.emitted("stateChange")[0][0]).toEqual({
      state: "loading",
      portKey: renderKey,
    });

    await flushRender();

    expect(wrapper.emitted("stateChange")[1][0]).toEqual({
      state: "error",
      message: error,
      portKey: renderKey,
    });
  });

  it("should call initKnimeService", async () => {
    const { viewConfigLoaderFn } = setupDynamicMockComponent();

    const initKnimeService = vi.fn(() => ({ mockService: true }));

    doMount({ viewConfigLoaderFn, initKnimeService });

    await flushRender();

    expect(initKnimeService).toHaveBeenCalled();
  });

  it("should abort calls of pending view loads", async () => {
    vi.useFakeTimers();

    const { viewConfigLoaderFn } = setupDynamicMockComponent();
    const initKnimeService = vi.fn(() => ({ mockService: true }));

    // mounting will load the view
    const wrapper = doMount({ viewConfigLoaderFn, initKnimeService });

    // changing the renderkey will load the view a second time
    await wrapper.setProps({ renderKey: "changed" });
    expect(viewConfigLoaderFn).toHaveBeenCalledTimes(2);

    await flushPromises();
    vi.runAllTimers();

    // the first request was aborted, so the knime service was only called
    // for the second view load
    expect(initKnimeService).toHaveBeenCalledOnce();
    expect(wrapper.emitted("stateChange")).toEqual([
      [{ state: "loading", portKey: "123" }],
      [{ state: "loading", portKey: "changed" }],
      [{ state: "ready", portKey: "changed" }],
    ]);

    vi.useRealTimers();
  });

  it("should use the resourceLocationResolver", async () => {
    const { dynamicImport, viewConfigLoaderFn } = setupDynamicMockComponent();

    const resourceLocationResolver = vi.fn(() => "dummy-location");

    doMount({ viewConfigLoaderFn, resourceLocationResolver });

    await flushRender();

    expect(resourceLocationResolver).toHaveBeenCalled();
    expect(dynamicImport).toHaveBeenCalledWith("dummy-location");
  });
});
