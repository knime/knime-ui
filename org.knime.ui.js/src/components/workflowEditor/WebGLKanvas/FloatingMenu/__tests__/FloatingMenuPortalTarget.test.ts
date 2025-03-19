import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import { mockStores } from "@/test/utils/mockStores";
import FloatingMenuPortalTarget from "../FloatingMenuPortalTarget.vue";

describe("FloatingMenuPortalTarget", () => {
  it("should calculate position based on canvas anchor", async () => {
    const mockedStores = mockStores();
    const wrapper = mount(FloatingMenuPortalTarget, {
      global: {
        plugins: [mockedStores.testingPinia],
      },
    });

    expect(wrapper.find("div.floating-menu-portal").exists()).toBe(false);

    mockedStores.webglCanvasStore.zoomFactor = 1;
    mockedStores.webglCanvasStore.canvasOffset = { x: 20, y: 40 };
    mockedStores.webglCanvasStore.canvasAnchor = {
      isOpen: true,
      anchor: {
        x: 100,
        y: 100,
      },
    };
    await nextTick();

    expect(wrapper.find("div.floating-menu-portal").exists()).toBe(true);
    expect(wrapper.find("div.floating-menu-portal").attributes("style")).toBe(
      "left: 120px; top: 140px;",
    );

    mockedStores.webglCanvasStore.zoomFactor = 2;
    await nextTick();

    expect(wrapper.find("div.floating-menu-portal").attributes("style")).toBe(
      "left: 220px; top: 240px;",
    );

    mockedStores.webglCanvasStore.zoomFactor = 0.5;
    await nextTick();

    expect(wrapper.find("div.floating-menu-portal").attributes("style")).toBe(
      "left: 70px; top: 90px;",
    );

    mockedStores.webglCanvasStore.zoomFactor = 1;
    mockedStores.webglCanvasStore.canvasOffset = { x: 30, y: 0 };
    mockedStores.webglCanvasStore.canvasAnchor = {
      isOpen: true,
      anchor: {
        x: 100,
        y: 100,
      },
    };
    await nextTick();

    expect(wrapper.find("div.floating-menu-portal").attributes("style")).toBe(
      "left: 130px; top: 100px;",
    );

    mockedStores.webglCanvasStore.zoomFactor = 1;
    mockedStores.webglCanvasStore.canvasOffset = { x: 30, y: 20 };
    mockedStores.webglCanvasStore.canvasAnchor = {
      isOpen: true,
      anchor: {
        x: 50,
        y: 50,
      },
    };
    await nextTick();

    expect(wrapper.find("div.floating-menu-portal").attributes("style")).toBe(
      "left: 80px; top: 70px;",
    );
  });
});
