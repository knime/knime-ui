import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, shallowMount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { mockUserAgent } from "jest-useragent-mock";
import { useRoute } from "vue-router";

import { $bus } from "@/plugins/event-bus";
import { useApplicationStore } from "@/store/application/application";
import { useLifecycleStore } from "@/store/application/lifecycle";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { useWorkflowStore } from "@/store/workflow/workflow";
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

vi.mock("@/environment", async () => {
  const actual = await vi.importActual("@/environment");

  return {
    ...actual,
    DynamicEnvRenderer: {},
    isDesktop: false,
  };
});

describe("KnimeUI.vue", () => {
  const doShallowMount = async ({
    initializeApplication = vi.fn().mockResolvedValue({}) as any,
    uiControlsOverrides = {},
  } = {}) => {
    // @ts-ignore: assign read-only property
    document.fonts = {
      load: vi.fn(() => Promise.resolve("dummy")),
    };

    const testingPinia = createTestingPinia({
      stubActions: true,
      createSpy: vi.fn,
    });
    const uiControlsStore = useUIControlsStore(testingPinia);
    const lifecycleStore = useLifecycleStore(testingPinia);
    const applicationStore = useApplicationStore(testingPinia);
    const applicationSettingsStore = useApplicationSettingsStore(testingPinia);
    const workflowStore = useWorkflowStore(testingPinia);

    vi.mocked(lifecycleStore.initializeApplication).mockImplementation(
      initializeApplication,
    );

    applicationStore.availableUpdates = {
      newReleases: [
        {
          isUpdatePossible: true,
          name: "KNIME Analytics Platform 5.0",
          shortName: "5.0",
        },
      ],
      bugfixes: ["Update1", "Update2"],
    };

    uiControlsStore.$patch(uiControlsOverrides);

    const KnimeUI = (await import("../KnimeUI.vue")).default;

    const wrapper = shallowMount(KnimeUI, {
      global: {
        plugins: [testingPinia],
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
      uiControlsStore,
      lifecycleStore,
      applicationStore,
      applicationSettingsStore,
      workflowStore,
      initializeApplication,
    };
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not display the UpdateBanner when dismissedUpdateBanner is true", async () => {
    // @ts-ignore
    useRoute.mockReturnValue({
      meta: { showUpdateBanner: true },
    });

    const { wrapper, applicationStore } = await doShallowMount();

    expect(wrapper.find("update-banner-stub").exists()).toBe(true);

    applicationStore.dismissedUpdateBanner = true;
    await nextTick();

    expect(wrapper.find("update-banner-stub").exists()).toBe(false);
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

    expect(initializeApplication).toHaveBeenCalledWith({
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
    const { wrapper, lifecycleStore } = await doShallowMount();
    wrapper.unmount();

    expect(lifecycleStore.destroyApplication).toHaveBeenCalled();
  });

  it("shows download banner when required", async () => {
    const { wrapper, uiControlsStore } = await doShallowMount();

    expect(wrapper.findComponent(".download-banner").exists()).toBe(false);

    uiControlsStore.shouldDisplayDownloadAPButton = true;
    await nextTick();

    expect(wrapper.findComponent(".download-banner").exists()).toBe(true);
  });

  // FIXME
  // eslint-disable-next-line vitest/no-disabled-tests
  it.skip("sets CSS variable --app-main-content-height in desktop correctly", async () => {
    // setEnvironment("DESKTOP");
    vi.resetModules();
    await doShallowMount();

    const style = getComputedStyle(document.documentElement);
    const appHeight = style
      .getPropertyValue("--app-main-content-height")
      .trim();

    expect(appHeight).toBe("calc(100vh - var(--app-header-height))");
  });

  // FIXME
  // eslint-disable-next-line vitest/no-disabled-tests
  it.skip("sets CSS variable --app-main-content-height in browser correctly", async () => {
    setEnvironment("BROWSER");
    await doShallowMount();

    const style = getComputedStyle(document.documentElement);
    const appHeight = style
      .getPropertyValue("--app-main-content-height")
      .trim();

    expect(appHeight).toBe("100vh");
  });

  // FIXME
  // eslint-disable-next-line vitest/no-disabled-tests
  it.skip("sets CSS variable --app-main-content-height with download banner correctly", async () => {
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
        const { applicationSettingsStore } = await doShallowMount();
        expect(
          applicationSettingsStore.setHasClipboardSupport,
        ).toHaveBeenCalledWith(expectedValue);
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
      const { applicationSettingsStore } = await doShallowMount();
      expect(
        applicationSettingsStore.setHasClipboardSupport,
      ).toHaveBeenCalledWith(false);
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

      const { applicationSettingsStore } = await doShallowMount();
      expect(
        applicationSettingsStore.setHasClipboardSupport,
      ).toHaveBeenCalledWith(true);
    });
  });
});
