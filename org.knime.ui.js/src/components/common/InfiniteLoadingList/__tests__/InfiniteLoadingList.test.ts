import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import { createSlottedChildComponent } from "@/test/utils/slottedChildComponent";
import ScrollViewContainer from "../../ScrollViewContainer/ScrollViewContainer.vue";
import InfiniteLoadingList from "../InfiniteLoadingList.vue";

describe("InfiniteLoadingList.vue", () => {
  const doMount = () => {
    const fetchMore = vi.fn(() => new Promise((r) => setTimeout(r, 3000)));

    const props: InstanceType<typeof InfiniteLoadingList>["$props"] = {
      isLoading: false,
      fetchMore,
    };

    const slottedComponentTemplate = `<div
      id="slotted-component"
      v-bind="scope"
    ></div>`;

    const { renderSlot, getSlottedChildComponent, getSlottedStubProp } =
      createSlottedChildComponent({
        slottedComponentTemplate,
      });

    const wrapper = mount(InfiniteLoadingList, {
      props,
      slots: {
        default: renderSlot,
      },
    });

    return { wrapper, fetchMore, getSlottedChildComponent, getSlottedStubProp };
  };

  it("scrolls to top", async () => {
    const { wrapper } = doMount();
    (wrapper.vm.$refs.scroller as any).$el.scrollTop = 100;

    await wrapper.vm.scrollToTop();
    await nextTick();

    expect((wrapper.vm.$refs.scroller as any).$el.scrollTop).toBe(0);
  });

  it("scrolling to bottom load more results", async () => {
    vi.useFakeTimers();
    const { wrapper, fetchMore, getSlottedStubProp } = doMount();

    const scrollViewContainer = wrapper.findComponent(ScrollViewContainer);

    expect(getSlottedStubProp({ wrapper, propName: "isLoadingNextPage" })).toBe(
      false,
    );

    scrollViewContainer.vm.$emit("scrollBottom");
    await nextTick();

    expect(fetchMore).toHaveBeenCalled();

    expect(getSlottedStubProp({ wrapper, propName: "isLoadingNextPage" })).toBe(
      false,
    );

    await vi.advanceTimersByTimeAsync(1000);
    vi.runOnlyPendingTimers();
    await nextTick();
    expect(getSlottedStubProp({ wrapper, propName: "isLoadingNextPage" })).toBe(
      true,
    );

    await flushPromises();
    expect(getSlottedStubProp({ wrapper, propName: "isLoadingNextPage" })).toBe(
      false,
    );
  });
});
