import { expect, describe, afterEach, it, vi, beforeEach } from "vitest";
import { mockUserAgent } from "jest-useragent-mock";
import { shallowMount } from "@vue/test-utils";

import { mockVuexStore } from "@/test/utils";
import { $bus } from "@/plugins/event-bus";

describe("KnimeUI.vue", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  const doShallowMount = async ({
    environment = "BROWSER",
    routeMeta = { showUpdateBanner: false },
    initializeApplication = vi.fn().mockResolvedValue(),
    destroyApplication = vi.fn(),
    setHasClipboardSupport = vi.fn(),
  } = {}) => {
    vi.doMock("@/environment", async () => {
      const actual = await vi.importActual("@/environment");

      return {
        ...actual,
        environment,
        isDesktop: environment === "DESKTOP",
        isBrowser: environment === "BROWSER",
      };
    });

    document.fonts = {
      load: vi.fn(() => Promise.resolve("dummy")),
    };

    const storeConfig = {
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
    const $router = {
      currentRoute: {},
      push: vi.fn(),
    };

    const $route = {
      meta: routeMeta,
    };

    const KnimeUI = (await import("../KnimeUI.vue")).default;

    const wrapper = shallowMount(KnimeUI, {
      global: {
        plugins: [$store],
        mocks: { $router, $route, $bus },
        stubs: { RouterView: true, HotkeyHandler: true },
      },
    });

    await new Promise((r) => setTimeout(r, 0));

    return {
      wrapper,
      $store,
      $route,
      $router,
      initializeApplication,
      destroyApplication,
      setHasClipboardSupport,
    };
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders UpdateBanner if showUpdateBanner in meta in router is true", async () => {
    const { wrapper } = await doShallowMount({
      routeMeta: { showUpdateBanner: true },
      environment: "DESKTOP",
    });

    expect(wrapper.find("update-banner-stub").exists()).toBe(true);
    expect(wrapper.find(".main-content-with-banner").exists()).toBe(true);
  });

  it("catches errors in fetch hook", async () => {
    const { wrapper } = await doShallowMount({
      initializeApplication: vi.fn(() => {
        throw new TypeError("error");
      }),
    });

    const errorComponent = wrapper.findComponent(Error);
    expect(errorComponent.exists()).toBe(true);
    expect(errorComponent.props()).toMatchObject({
      message: "error",
      stack: expect.anything(),
    });
  });

  it("initiates", async () => {
    const { initializeApplication, $router } = await doShallowMount();

    expect(initializeApplication).toHaveBeenCalledWith(expect.anything(), {
      $router,
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
    await wrapper.unmount();

    expect(destroyApplication).toHaveBeenCalled();
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
