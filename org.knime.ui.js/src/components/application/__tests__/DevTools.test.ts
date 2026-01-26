import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import { useKdsDarkMode, useKdsLegacyMode } from "@knime/kds-components";

import { useCanvasRendererUtils } from "@/components/workflowEditor/util/canvasRenderer";
import { isBrowser, isDesktop } from "@/environment";
import { mockEnvironment } from "@/test/utils/mockEnvironment";
import { mockStores } from "@/test/utils/mockStores";
import DevTools from "../DevTools.vue";

vi.mock("@/environment");

vi.mock("@knime/kds-components", async (importOriginal) => {
  const actual: any = await importOriginal();
  const mockCurrentMode = { value: "light" };
  const mockUseLegacyMode = { value: false };

  return {
    ...actual,
    useKdsDynamicModal: vi.fn().mockReturnValue({
      askConfirmation: vi.fn(),
    }),
    useKdsDarkMode: () => ({
      currentMode: mockCurrentMode,
    }),
    useKdsLegacyMode: () => ({
      legacyMode: mockUseLegacyMode,
    }),
  };
});

describe("DevTools.vue", () => {
  const doMount = () => {
    const mockedStores = mockStores();
    const wrapper = mount(DevTools, {
      global: {
        plugins: [mockedStores.testingPinia],
      },
    });

    return { wrapper, mockedStores };
  };

  const { currentRenderer } = useCanvasRendererUtils();

  const getRenderSwitch = (wrapper: any) =>
    wrapper.findComponent({
      name: "KdsValueSwitch",
      props: { "data-test-id": "canvas-renderer-toggler" },
    });

  afterEach(() => {
    // reset renderer
    currentRenderer.value = "SVG";
    // reset mocks
    vi.clearAllMocks();
    // reset dev flag (wird in mehreren Tests manipuliert)
    import.meta.env.DEV = false;
  });

  it("renders button to open browser inspector only on desktop", () => {
    mockEnvironment("DESKTOP", { isBrowser, isDesktop });
    expect(
      doMount().wrapper.find('[data-test-id="browser-devtools"]').exists(),
    ).toBe(true);

    mockEnvironment("BROWSER", { isBrowser, isDesktop });
    expect(
      doMount().wrapper.find('[data-test-id="browser-devtools"]').exists(),
    ).toBe(false);
  });

  it("renders button to reload app only on frontend dev mode", () => {
    import.meta.env.DEV = true;
    expect(doMount().wrapper.find('[data-test-id="reload-app"]').exists()).toBe(
      true,
    );

    import.meta.env.DEV = false;
    expect(doMount().wrapper.find('[data-test-id="reload-app"]').exists()).toBe(
      false,
    );
  });

  it("renders the canvas renderer toggler", async () => {
    import.meta.env.DEV = true;
    const { wrapper } = doMount();

    expect(currentRenderer.value).toBe("SVG");

    const renderSwitch = getRenderSwitch(wrapper);
    expect(renderSwitch.exists()).toBe(true);

    await renderSwitch.setValue("WebGL");

    await nextTick();
    expect(currentRenderer.value).toBe("WebGL");
  });

  it("renders button to toggle canvas debug mode (only webgl)", async () => {
    const { wrapper, mockedStores } = doMount();

    expect(mockedStores.webglCanvasStore.isDebugModeEnabled).toBe(false);
    expect(
      wrapper.find('[data-test-id="canvas-debug-btn"]').attributes("disabled"),
    ).toBeDefined();
    currentRenderer.value = "WebGL";

    await nextTick();
    expect(
      wrapper.find('[data-test-id="canvas-debug-btn"]').attributes("disabled"),
    ).toBeUndefined();

    await wrapper.find('[data-test-id="canvas-debug-btn"]').trigger("click");
    expect(mockedStores.webglCanvasStore.isDebugModeEnabled).toBe(true);
  });

  describe("theme switch", () => {
    const getThemeSwitch = (wrapper: any) =>
      wrapper.findComponent({
        name: "KdsValueSwitch",
        props: { "data-test-id": "canvas-theme-toggler" },
      });

    it("initializes with current mode value from useDarkMode", async () => {
      const { wrapper } = doMount();
      const themeSwitch = getThemeSwitch(wrapper);

      expect(themeSwitch).toBeDefined();
      await nextTick();
      expect(themeSwitch.props("modelValue")).toBe("light");
    });

    it("switches to dark mode correctly", async () => {
      const { wrapper } = doMount();
      const { currentMode } = useKdsDarkMode();
      const { legacyMode } = useKdsLegacyMode();
      const themeSwitch = getThemeSwitch(wrapper);
      await themeSwitch.setValue("dark");

      await nextTick();
      expect(currentMode.value).toBe("dark");
      expect(legacyMode.value).toBe(false);
    });

    it("switches to light mode correctly", async () => {
      const { wrapper } = doMount();
      const { currentMode } = useKdsDarkMode();
      const { legacyMode } = useKdsLegacyMode();
      const themeSwitch = getThemeSwitch(wrapper);
      await themeSwitch.setValue("light");

      await nextTick();
      expect(currentMode.value).toBe("light");
      expect(legacyMode.value).toBe(false);
    });

    it("switches to system mode correctly", async () => {
      const { wrapper } = doMount();
      const { currentMode } = useKdsDarkMode();
      const { legacyMode } = useKdsLegacyMode();
      const themeSwitch = getThemeSwitch(wrapper);
      await themeSwitch.setValue("system");

      await nextTick();
      expect(currentMode.value).toBe("system");
      expect(legacyMode.value).toBe(false);
    });

    it("switches to legacy mode correctly", async () => {
      const { wrapper } = doMount();
      const { currentMode } = useKdsDarkMode();
      const { legacyMode } = useKdsLegacyMode();
      const themeSwitch = getThemeSwitch(wrapper);

      await themeSwitch.setValue("dark");
      await nextTick();
      expect(currentMode.value).toBe("dark");

      await themeSwitch.setValue("legacy");
      await nextTick();
      expect(legacyMode.value).toBe(true);
      expect(currentMode.value).toBe("light");
    });
  });
});
