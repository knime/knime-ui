import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { mockUserAgent } from "jest-useragent-mock";
import { useRoute } from "vue-router";

import { promise as promiseUtils } from "@knime/utils";

import { isBrowser, isDesktop, runInEnvironment } from "@/environment";
import { $bus } from "@/plugins/event-bus";
import { createSpaceProvider } from "@/test/factories";
import { mockEnvironment } from "@/test/utils/mockEnvironment";
import { mockStores } from "@/test/utils/mockStores";
import DevTools from "../application/DevTools.vue";
import DownloadBanner from "../application/DownloadBanner.vue";
import ErrorOverlay from "../application/ErrorOverlay/ErrorOverlay.vue";
import UpdateBanner from "../common/UpdateBanner.vue";

vi.mock("vue-router", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    // @ts-expect-error
    ...actual,
    useRouter: vi.fn(() => ({ push: () => {} })),
    useRoute: vi.fn(() => ({ meta: {} })),
  };
});

vi.mock("@/environment");

vi.mock(
  "@fontsource/roboto-condensed/files/roboto-condensed-all-400-normal.woff",
  () => ({ default: "font data" }),
);
vi.mock(
  "@fontsource/roboto-condensed/files/roboto-condensed-all-700-normal.woff",
  () => ({ default: "font data" }),
);

describe("KnimeUI.vue", () => {
  const mockFetch = vi.fn(() =>
    Promise.resolve({
      blob: () => new Blob(["mock"]),
    }),
  );

  beforeAll(() => {
    // @ts-expect-error
    window.fetch = mockFetch;
  });

  const doShallowMount = async ({
    initializeApplication = vi.fn().mockResolvedValue({}),
    uiControlsOverrides = {},
  } = {}) => {
    // @ts-expect-error assign read-only property
    document.fonts = {
      load: vi.fn(() => Promise.resolve("dummy")),
    };

    const mockedStores = mockStores();

    vi.mocked(
      mockedStores.lifecycleStore.initializeApplication,
    ).mockImplementation(initializeApplication);

    mockedStores.applicationStore.availableUpdates = {
      newReleases: [
        {
          isUpdatePossible: true,
          name: "KNIME Analytics Platform 5.0",
          shortName: "5.0",
        },
      ],
      bugfixes: ["Update1", "Update2"],
    };

    mockedStores.uiControlsStore.$patch(uiControlsOverrides);

    const KnimeUI = (await import("../KnimeUI.vue")).default;

    const wrapper = mount(KnimeUI, {
      global: {
        plugins: [mockedStores.testingPinia],
        mocks: { $bus },
        stubs: {
          AppHeader: true,
          ErrorOverlay: true,
          RouterView: true,
          HotkeyHandler: true,
          DownloadBanner: true,
          UpdateBanner: true,
          GlobalLoader: true,
          DownloadProgressPanel: true,
          UploadProgressPanel: true,
          KdsDynamicModalProvider: true,
          CreateWorkflowModal: true,
          ShortcutsOverviewDialog: true,
          DestinationPickerModal: true,
          ChangeHubItemVersionModal: true,
          ChangeLinkVariantModal: true,
          ToastStack: true,
          HintProvider: true,
          BlockUi: true,
          DevTools: true,
        },
      },
    });

    await flushPromises();

    return {
      wrapper,
      mockedStores,
      initializeApplication,
    };
  };

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("does not display the UpdateBanner when dismissedUpdateBanner is true", async () => {
    mockEnvironment("DESKTOP", { isBrowser, isDesktop });

    // @ts-expect-error
    useRoute.mockReturnValue({ meta: { showUpdateBanner: true } });

    const { wrapper, mockedStores } = await doShallowMount();

    expect(wrapper.findComponent(UpdateBanner).exists()).toBe(true);

    mockedStores.applicationStore.dismissedUpdateBanner = true;
    await nextTick();

    expect(wrapper.findComponent(UpdateBanner).exists()).toBe(false);
  });

  it("renders UpdateBanner if showUpdateBanner in meta in router is true", async () => {
    mockEnvironment("DESKTOP", { isBrowser, isDesktop });

    // @ts-expect-error
    useRoute.mockReturnValue({ meta: { showUpdateBanner: true } });

    const { wrapper } = await doShallowMount();
    await flushPromises();

    expect(wrapper.findComponent(UpdateBanner).exists()).toBe(true);
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

  it("hides devtools bar if dev mode is disabled", async () => {
    const { wrapper, mockedStores } = await doShallowMount();
    expect(wrapper.findComponent(DevTools).exists()).toBe(false);

    mockedStores.applicationSettingsStore.devMode = true;

    await nextTick();

    expect(wrapper.findComponent(DevTools).exists()).toBe(true);
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

  it("loads the provider space groups after the initializeApplication action has completed", async () => {
    // promise to resolve the initializeApplication action manually
    const { promise, resolve } = promiseUtils.createUnwrappedPromise<void>();
    const { mockedStores } = await doShallowMount({
      initializeApplication: vi.fn(() => promise),
    });

    mockedStores.spaceProvidersStore.spaceProviders = {
      provider1: createSpaceProvider({ id: "provider1" }),
    };

    await flushPromises();

    expect(
      mockedStores.spaceProvidersStore.fetchSpaceGroupsForProviders,
    ).not.toHaveBeenCalled();

    resolve();
    await flushPromises();
    expect(
      mockedStores.spaceProvidersStore.fetchSpaceGroupsForProviders,
    ).toHaveBeenCalledOnce();
  });

  it("destroys application", async () => {
    const { wrapper, mockedStores } = await doShallowMount();
    wrapper.unmount();

    expect(mockedStores.lifecycleStore.destroyApplication).toHaveBeenCalled();
  });

  it("shows download banner when required", async () => {
    mockEnvironment("BROWSER", { isBrowser, isDesktop });
    const { wrapper, mockedStores } = await doShallowMount();

    expect(wrapper.findComponent(DownloadBanner).exists()).toBe(false);

    mockedStores.uiControlsStore.shouldDisplayDownloadAPButton = true;
    await nextTick();

    expect(wrapper.findComponent(DownloadBanner).exists()).toBe(true);
  });

  describe("height layout variants", () => {
    describe("desktop", () => {
      it("sets inset-top variant", async () => {
        vi.mocked(runInEnvironment).mockImplementation(
          // eslint-disable-next-line new-cap
          (matcher) => matcher.DESKTOP?.(),
        );
        mockEnvironment("DESKTOP", { isBrowser, isDesktop });
        const { wrapper } = await doShallowMount();

        expect(wrapper.find(".main-content").classes()).toEqual([
          "main-content",
          "inset-top",
        ]);
      });

      it("sets inset-both variant", async () => {
        vi.mocked(runInEnvironment).mockImplementation(
          // eslint-disable-next-line new-cap
          (matcher) => matcher.DESKTOP?.(),
        );
        mockEnvironment("DESKTOP", { isBrowser, isDesktop });
        // @ts-expect-error
        useRoute.mockReturnValue({ meta: { showUpdateBanner: true } });

        const { wrapper } = await doShallowMount();

        expect(wrapper.find(".main-content").classes()).toEqual([
          "main-content",
          "inset-both",
        ]);
      });
    });

    describe("browser", () => {
      it("sets inset-top variant", async () => {
        vi.mocked(runInEnvironment).mockImplementation(
          // eslint-disable-next-line new-cap
          (matcher) => matcher.BROWSER?.(),
        );
        mockEnvironment("BROWSER", { isBrowser, isDesktop });
        const { wrapper } = await doShallowMount();

        expect(wrapper.find(".main-content").classes()).toEqual([
          "main-content",
          "full",
        ]);
      });

      it("sets inset-both variant", async () => {
        vi.mocked(runInEnvironment).mockImplementation(
          // eslint-disable-next-line new-cap
          (matcher) => matcher.BROWSER?.(),
        );
        mockEnvironment("BROWSER", { isBrowser, isDesktop });

        const { wrapper, mockedStores } = await doShallowMount();
        mockedStores.uiControlsStore.shouldDisplayDownloadAPButton = true;
        await nextTick();

        expect(wrapper.find(".main-content").classes()).toEqual([
          "main-content",
          "inset-bottom",
        ]);
      });
    });
  });

  describe("clipboard support", () => {
    beforeEach(() => {
      mockEnvironment("BROWSER", { isBrowser, isDesktop });
    });

    it.each([
      ["granted", true],
      ["prompt", true],
      ["denied", false],
    ])(
      "when clipboard permission state is %s, sets the clipboard support flag to %s",
      async (state, expectedValue) => {
        Object.assign(navigator, { permissions: { query: () => ({ state }) } });
        vi.spyOn(navigator.permissions, "query");
        const { mockedStores } = await doShallowMount();
        expect(
          mockedStores.applicationSettingsStore.setHasClipboardSupport,
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
      const { mockedStores } = await doShallowMount();
      expect(
        mockedStores.applicationSettingsStore.setHasClipboardSupport,
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

      const { mockedStores } = await doShallowMount();
      expect(
        mockedStores.applicationSettingsStore.setHasClipboardSupport,
      ).toHaveBeenCalledWith(true);
    });
  });
});
