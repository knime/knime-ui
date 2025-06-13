import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import { ValueSwitch } from "@knime/components";

import { useCanvasRendererUtils } from "@/components/workflowEditor/util/canvasRenderer";
import { isBrowser, isDesktop } from "@/environment";
import { mockEnvironment } from "@/test/utils/mockEnvironment";
import { mockStores } from "@/test/utils/mockStores";
import DevTools from "../DevTools.vue";

vi.mock("@/environment");

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

  afterEach(() => {
    // reset renderer
    currentRenderer.value = "SVG";
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
    const toggler = wrapper.findComponent(ValueSwitch);
    toggler.setValue("WebGL");
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
});
