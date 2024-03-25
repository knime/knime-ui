import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ApplyState,
  UIExtensionPushEvents,
  ViewState,
} from "@knime/ui-extension-service";
import { flushPromises, mount } from "@vue/test-utils";
import { mockVuexStore } from "@/test/utils";
import { nextTick } from "vue";

describe("useNodeConfigAPI", () => {
  afterEach(() => {
    vi.resetModules();
  });

  const setup = async () => {
    const { useNodeConfigAPI } = await import("../useNodeConfigAPI");

    return useNodeConfigAPI();
  };

  const doMountTestComponent = async () => {
    const UseNodeConfigAPI = await import("./UseNodeConfigAPI.test.vue");

    const executeNodes = vi.fn();
    const $store = mockVuexStore({
      workflow: {
        actions: { executeNodes },
      },
    });

    const testWrapper = mount(UseNodeConfigAPI.default, {
      props: {
        nodeId: "node1",
        execute: true,
      },
      global: { plugins: [$store] },
    });

    return { testWrapper, executeNodes };
  };

  describe("setters", () => {
    it("should setDirtyState", async () => {
      const { dirtyState, setDirtyState } = await setup();

      expect(dirtyState.value).toEqual({
        apply: ApplyState.CLEAN,
        view: ViewState.CLEAN,
      });

      setDirtyState({ apply: ApplyState.CONFIG, view: ViewState.CONFIG });

      expect(dirtyState.value).toEqual({
        apply: ApplyState.CONFIG,
        view: ViewState.CONFIG,
      });
    });

    it("should setLatestPublishedData", async () => {
      const { lastestPublishedData, setLatestPublishedData } = await setup();

      expect(lastestPublishedData.value).toBeNull();

      setLatestPublishedData({ some: "data" });

      expect(lastestPublishedData.value).toEqual({ some: "data" });
    });

    it("should setEventDispatcher", async () => {
      const { setEventDispatcher, applySettings } = await setup();

      const eventDispatcher = vi.fn();
      setEventDispatcher(eventDispatcher);

      applySettings("");
      expect(eventDispatcher).toHaveBeenCalledWith({
        eventType: UIExtensionPushEvents.EventTypes.ApplyDataEvent,
      });
    });
  });

  describe("apply settings", () => {
    it("should resolve `applySettings` after a call to `setApplyComplete`", async () => {
      const { testWrapper, executeNodes } = await doMountTestComponent();

      await testWrapper.find('[data-testid="applySettings"]').trigger("click");

      await flushPromises();
      expect(executeNodes).not.toHaveBeenCalled();

      await testWrapper
        .find('[data-testid="setApplyComplete"]')
        .trigger("click", { dataSet: { isApplied: true } });

      expect(executeNodes).toHaveBeenCalled();
    });

    it("should not execute nodes after applying settings", async () => {
      const { testWrapper, executeNodes } = await doMountTestComponent();

      await testWrapper.find('[data-testid="applySettings"]').trigger("click");

      await flushPromises();
      expect(executeNodes).not.toHaveBeenCalled();

      await testWrapper
        .find('[data-testid="setApplyComplete"]')
        .trigger("click", { dataSet: { isApplied: false } });

      expect(executeNodes).not.toHaveBeenCalled();
    });
  });

  describe("shared state", () => {
    it("should share `dirtyState` among consumers of the composable", async () => {
      const { setDirtyState } = await setup();
      const { testWrapper: testWrapper1 } = await doMountTestComponent();
      const { testWrapper: testWrapper2 } = await doMountTestComponent();

      expect(testWrapper1.find('[data-testid="dirtyState"]').text()).toEqual(
        JSON.stringify({
          apply: ApplyState.CLEAN,
          view: ViewState.CLEAN,
        }),
      );
      expect(testWrapper2.find('[data-testid="dirtyState"]').text()).toEqual(
        JSON.stringify({
          apply: ApplyState.CLEAN,
          view: ViewState.CLEAN,
        }),
      );

      setDirtyState({ apply: ApplyState.CONFIG, view: ViewState.EXEC });

      await nextTick();

      expect(testWrapper1.find('[data-testid="dirtyState"]').text()).toEqual(
        JSON.stringify({
          apply: ApplyState.CONFIG,
          view: ViewState.EXEC,
        }),
      );
      expect(testWrapper2.find('[data-testid="dirtyState"]').text()).toEqual(
        JSON.stringify({
          apply: ApplyState.CONFIG,
          view: ViewState.EXEC,
        }),
      );
    });

    it("should share `latestPublishedData` among consumers of the composable", async () => {
      const { setLatestPublishedData } = await setup();
      const { testWrapper: testWrapper1 } = await doMountTestComponent();
      const { testWrapper: testWrapper2 } = await doMountTestComponent();

      expect(
        testWrapper1.find('[data-testid="lastestPublishedData"]').text(),
      ).toBe("null");

      expect(
        testWrapper2.find('[data-testid="lastestPublishedData"]').text(),
      ).toBe("null");

      setLatestPublishedData({ some: "data" });

      await nextTick();

      expect(
        testWrapper1.find('[data-testid="lastestPublishedData"]').text(),
      ).toBe(JSON.stringify({ some: "data" }));

      expect(
        testWrapper2.find('[data-testid="lastestPublishedData"]').text(),
      ).toBe(JSON.stringify({ some: "data" }));
    });
  });
});
