import { afterEach } from "node:test";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import type { ClientRectObject } from "@floating-ui/vue";

import type { DataValueViewConfig } from "@knime/ui-extension-service";

import { useDataValueViewSize } from "../useDataValueView";

import UseDataValueViewTestComponent from "./UseDataValueViewTestComponent.vue";

describe("useDataValueView", () => {
  const mountTestComponent = () =>
    mount(UseDataValueViewTestComponent, { attachTo: document.body });

  let testComponent: ReturnType<typeof mountTestComponent>;

  beforeEach(() => {
    testComponent = mountTestComponent();
  });

  const anchor: ClientRectObject = {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  };
  const config: DataValueViewConfig = {
    anchor,
    colIndex: 0,
    rowIndex: 0,
  };

  it("opens the data value view", async () => {
    testComponent.vm.open(config);
    await flushPromises();
    expect(testComponent.find("#data-value-view").exists()).toBe(true);
  });

  describe("closing the data value view", () => {
    beforeEach(async () => {
      vi.useFakeTimers();
      testComponent.vm.open(config);
      await vi.runAllTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const getDataValueView = () => testComponent.find("#data-value-view");

    it("closes the data value view after a delay", async () => {
      testComponent.vm.close();
      await vi.runAllTimers();
      expect(getDataValueView().exists()).toBe(false);
    });

    it("does not close the data value view immediately after opening", async () => {
      testComponent.vm.open(config);
      testComponent.vm.close();
      await vi.runAllTimers();
      expect(getDataValueView().exists()).toBe(true);
    });

    it("does close the data value view immediately after opening if withoutDelay is true", async () => {
      testComponent.vm.open(config);
      testComponent.vm.close({ withoutDelay: true });
      await vi.runAllTimers();
      expect(getDataValueView().exists()).toBe(false);
    });

    it("does not close the data value view if a new one is opened immediately afterwards", async () => {
      testComponent.vm.open(config);
      await vi.runAllTimers();
      testComponent.vm.close();
      vi.advanceTimersByTime(100);
      expect(getDataValueView().exists()).toBe(true);
      testComponent.vm.open(config);
      await vi.runAllTimers();
      expect(getDataValueView().exists()).toBe(true);
    });

    it("closes the data value view on click outside", async () => {
      window.dispatchEvent(new Event("click"));
      await vi.runAllTimers();
      expect(getDataValueView().exists()).toBe(false);
    });
  });

  describe("dragging the data value view", () => {
    let dataValueView: ReturnType<typeof testComponent.find>;

    beforeEach(async () => {
      vi.useFakeTimers();
      testComponent.vm.open(config);
      await vi.runAllTimers();

      dataValueView = testComponent.find("#data-value-view");

      await dataValueView.trigger("mousedown");
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const moveMouse = (x: number, y: number) =>
      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: x, clientY: y }),
      );

    it("drags the data value view", async () => {
      expect(dataValueView.attributes("is-dragging")).toBe("true");

      moveMouse(10, 10);
      moveMouse(10, -20);
      await flushPromises();

      expect(testComponent.vm.styles.left).toBe("10px");
      expect(testComponent.vm.styles.top).toBe("-20px");

      await window.dispatchEvent(new Event("mouseup"));
      expect(dataValueView.attributes("is-dragging")).toBe("false");
    });

    describe("keeping the position", () => {
      beforeEach(async () => {
        moveMouse(10, 10);
        await flushPromises();
        await window.dispatchEvent(new Event("mouseup"));
      });

      it("keeps the position when calling open on an already opened data value view", async () => {
        testComponent.vm.open({ ...config, rowIndex: 1 });
        await flushPromises();
        expect(testComponent.vm.styles.left).toBe("10px");
      });

      it("resets the position when closing and reopening the data value view", async () => {
        testComponent.vm.close();
        await vi.runAllTimers();
        testComponent.vm.open(config);
        expect(testComponent.vm.styles.left).toBe("0px");
      });
    });
  });
});

describe("useDataValueViewSize", () => {
  it.each([
    [3000, { width: 780, height: 487.5 }], // max width
    [720 / 0.35 /** ~ 2057 */, { width: 720, height: 450 }], //
    [1085, { width: 380, height: 237.5 }], // min width
  ])(
    "determines the data value view size from the windows width (%s px)",
    (windowInnerWidth, { width: expectedWidth, height: expectedHeight }) => {
      const { width, height } = useDataValueViewSize();

      window.innerWidth = windowInnerWidth;
      window.dispatchEvent(new Event("resize"));

      expect(width.value).toBe(expectedWidth);
      expect(height.value).toBe(expectedHeight);
    },
  );
});
