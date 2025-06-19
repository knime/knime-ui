import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import SpaceExplorer from "@/components/spaces/SpaceExplorer.vue";
import { mockStores } from "@/test/utils/mockStores";
import SidebarSpaceExplorer from "../SidebarSpaceExplorer.vue";

vi.mock("@knime/components", async (importOriginal) => {
  const actual = await importOriginal();
  // @ts-expect-error
  return { ...actual, useToasts: vi.fn() };
});

describe("SidebarSpaceExplorer.vue", () => {
  const doMount = ({ activeProjectId = "proj1" } = {}) => {
    const { testingPinia, applicationStore, spaceOperationsStore } =
      mockStores();

    applicationStore.setActiveProjectId(activeProjectId);

    const wrapper = mount(SidebarSpaceExplorer, {
      global: { plugins: [testingPinia] },
    });

    return { wrapper, spaceOperationsStore };
  };

  it("passes the active project to the SpaceExplorer", async () => {
    const { wrapper } = doMount();

    await flushPromises();

    expect(wrapper.findComponent(SpaceExplorer).props().projectId).toBe(
      "proj1",
    );
  });

  it("should handle `currentSelectedItemIds`", async () => {
    const { wrapper, spaceOperationsStore } = doMount();

    await flushPromises();

    expect(
      wrapper.findComponent(SpaceExplorer).props("selectedItemIds"),
    ).toEqual([]);

    spaceOperationsStore.setCurrentSelectedItemIds(["1"]);
    await nextTick();

    expect(
      wrapper.findComponent(SpaceExplorer).props("selectedItemIds"),
    ).toEqual(["1"]);

    wrapper
      .findComponent(SpaceExplorer)
      .vm.$emit("update:selectedItemIds", ["2"]);

    await nextTick();
    expect(spaceOperationsStore.currentSelectedItemIds).toEqual(["2"]);

    wrapper.unmount();
    expect(spaceOperationsStore.currentSelectedItemIds).toEqual([]);
  });

  it("handle change of directory", async () => {
    const { wrapper, spaceOperationsStore } = doMount();

    await flushPromises();

    wrapper
      .findComponent(SpaceExplorer)
      .vm.$emit("changeDirectory", ["item33"]);
    await nextTick();

    expect(spaceOperationsStore.changeDirectory).toHaveBeenCalledWith({
      pathId: ["item33"],
      projectId: "proj1",
    });
  });
});
