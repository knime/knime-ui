import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, shallowMount } from "@vue/test-utils";
import { mockUserAgent } from "jest-useragent-mock";
import { useRoute } from "vue-router";

import { $bus } from "@/plugins/event-bus";
import * as uiControlsStore from "@/store/uiControls";
import { mockVuexStore } from "@/test/utils";
import { setEnvironment } from "@/test/utils/setEnvironment";
import ErrorOverlay from "../application/ErrorOverlay.vue";

vi.mock("vue-router", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    // @ts-ignore
    ...actual,
    useRouter: vi.fn(() => ({ push: () => {} })),
    useRoute: vi.fn(() => ({ meta: {} })),
  };
});

describe("KnimeUI.vue", () => {
  const doShallowMount = async ({
    initializeApplication = vi.fn().mockResolvedValue({}) as any,
    destroyApplication = vi.fn(),
    setHasClipboardSupport = vi.fn(),
    uiControlsOverrides = {},
  } = {}) => {
    // @ts-ignore: assign read-only property
    document.fonts = {
      load: vi.fn(() => Promise.resolve("dummy")),
    };

    const storeConfig = {
      uiControls: uiControlsStore,
      application: {
        mutations: {
          setHasClipboardSupport,
        },
        actions: {
          initializeApplication,
          destroyApplication,
        },
        state: {
          availableUpdates: {
            newReleases: [
              {
                isUpdatePossible: true,
                name: "KNIME Analytics Platform 5.0",
                shortName: "5.0",
              },
            ],
            bugfixes: ["Update1", "Update2"],
          },
          globalLoader: {},
        },
      },
      workflow: {
        state: {
          activeWorkflow: null,
        },
      },
    };

    const $store = mockVuexStore(storeConfig);
    $store.state.uiControls = {
      ...$store.state.uiControls,
      ...uiControlsOverrides,
    };

    const KnimeUI = (await import("../KnimeUI.vue")).default;

    const wrapper = shallowMount(KnimeUI, {
      global: {
        plugins: [$store],
        mocks: { $bus },
        stubs: {
          RouterView: true,
          HotkeyHandler: true,
        },
      },
    });

    await flushPromises();

    return {
      wrapper,
      $store,
      initializeApplication,
      destroyApplication,
      setHasClipboardSupport,
    };
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders UpdateBanner if showUpdateBanner in meta in router is true", async () => {
    // @ts-ignore
    useRoute.mockReturnValue({
      meta: { showUpdateBanner: true },
    });

    const { wrapper } = await doShallowMount();

    expect(wrapper.find("update-banner-stub").exists()).toBe(true);
    expect(wrapper.find(".main-content-with-banner").exists()).toBe(true);
  });

  it("catches errors", async () => {
    const { wrapper } = await doShallowMount({
      initializeApplication: vi.fn(() => {
        throw new TypeError("error");
      }),
    });

    const errorComponent = wrapper.findComponent(ErrorOverlay);
    expect(errorComponent.exists()).toBe(true);
    expect(errorComponent.props()).toMatchObject({
      message: "error",
      stack: expect.anything(),
    });
  });

  it("initiates", async () => {
    const { initializeApplication } = await doShallowMount();

    expect(initializeApplication).toHaveBeenCalledWith(expect.anything(), {
      $router: expect.anything(),
    });
    expect(document.fonts.load).toHaveBeenCalledWith("400 1em Roboto");
    expect(document.fonts.load).toHaveBeenCalledWith(
      "400 1em Roboto Condensed",
    );
    expect(document.fonts.load).toHaveBeenCalledWith(
      "700 1em Roboto Condensed",
    );
    expect(document.fonts.load).toHaveBeenCalledWith("400 1em Roboto Mono");
  });

  it("destroys application", async () => {
    const { wrapper, destroyApplication } = await doShallowMount();
    wrapper.unmount();

    expect(destroyApplication).toHaveBeenCalled();
  });

  it("shows download banner when required", async () => {
    const { wrapper, $store } = await doShallowMount();

    expect(wrapper.findComponent(".download-banner").exists()).toBe(false);

    $store.state.uiControls.shouldDisplayDownloadAPButton = true;
    await nextTick();

    expect(wrapper.findComponent(".download-banner").exists()).toBe(true);
  });

  it("sets CSS variable --app-main-content-height in desktop correctly", async () => {
    setEnvironment("DESKTOP");
    await doShallowMount();

    const style = getComputedStyle(document.documentElement);
    const appHeight = style
      .getPropertyValue("--app-main-content-height")
      .trim();

    expect(appHeight).toBe("calc(100vh - var(--app-header-height))");
  });

  it("sets CSS variable --app-main-content-height in browser correctly", async () => {
    setEnvironment("BROWSER");
    await doShallowMount();

    const style = getComputedStyle(document.documentElement);
    const appHeight = style
      .getPropertyValue("--app-main-content-height")
      .trim();

    expect(appHeight).toBe("100vh");
  });

  it("sets CSS variable --app-main-content-height with download banner correctly", async () => {
    setEnvironment("BROWSER");
    await doShallowMount({
      uiControlsOverrides: { shouldDisplayDownloadAPButton: true },
    });

    const style = getComputedStyle(document.documentElement);
    const appHeight = style
      .getPropertyValue("--app-main-content-height")
      .trim();

    expect(appHeight).toBe("calc(100vh - var(--app-download-banner-height))");
  });

  describe("clipboard support", () => {
    it.each([
      ["granted", true],
      ["prompt", true],
      ["denied", false],
    ])(
      "when clipboard permission state is %s, sets the clipboard support flag to %s",
      async (state, expectedValue) => {
        Object.assign(navigator, { permissions: { query: () => ({ state }) } });
        vi.spyOn(navigator.permissions, "query");
        const { setHasClipboardSupport } = await doShallowMount();
        expect(setHasClipboardSupport).toHaveBeenCalledWith(
          expect.anything(),
          expectedValue,
        );
      },
    );

    it("should set the clipboard support flag to false when permission request throws", async () => {
      Object.assign(navigator, {
        permissions: {
          query: () => {
            throw new Error("This is an error");
          },
        },
      });

      vi.spyOn(navigator.permissions, "query");
      Object.assign(navigator, { clipboard: {} });
      const { setHasClipboardSupport } = await doShallowMount();
      expect(setHasClipboardSupport).toHaveBeenCalledWith(
        expect.anything(),
        false,
      );
    });

    it("checks clipboard support for Firefox", async () => {
      mockUserAgent("Firefox");
      Object.assign(navigator, {
        permissions: {
          query: () => {
            throw new Error("This is an error");
          },
        },
      });
      Object.assign(navigator, { clipboard: { readText: () => "{}" } });
      vi.spyOn(navigator.clipboard, "readText");

      const { setHasClipboardSupport } = await doShallowMount();
      expect(setHasClipboardSupport).toHaveBeenCalledWith(
        expect.anything(),
        true,
      );
    });
  });
});
