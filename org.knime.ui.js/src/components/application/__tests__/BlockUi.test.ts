import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import { $bus } from "@/plugins/event-bus";
import BlockUi from "../BlockUi.vue";

describe("BlockUi", () => {
  const doMount = () => {
    const wrapper = mount(BlockUi, {
      props: {},
      global: {
        mocks: {
          $bus,
        },
      },
      attachTo: document.body,
    });
    return { wrapper };
  };

  it("should block the ui", async () => {
    const { wrapper } = doMount();
    const blocker = wrapper.find(".blocker");

    expect(blocker.isVisible()).toBe(false);
    $bus.emit("block-ui");
    await nextTick();
    expect(blocker.isVisible()).toBe(true);
  });

  it("should unblock the ui", async () => {
    const { wrapper } = doMount();
    const blocker = wrapper.find(".blocker");

    expect(blocker.isVisible()).toBe(false);
    $bus.emit("block-ui");
    await nextTick();
    expect(blocker.isVisible()).toBe(true);
    $bus.emit("unblock-ui");
    await nextTick();
    expect(blocker.isVisible()).toBe(false);
  });

  it("should darken background if configured to", async () => {
    const { wrapper } = doMount();
    const blocker = wrapper.find(".blocker");

    expect(blocker.isVisible()).toBe(false);
    $bus.emit("block-ui", {
      darkenBackground: true,
    });
    await nextTick();
    expect(blocker.isVisible()).toBe(true);
    expect(blocker.classes("darken-background")).toBe(true);
    $bus.emit("unblock-ui");
    await nextTick();
    expect(blocker.isVisible()).toBe(false);
    expect(blocker.classes("darken-background")).toBe(false);
  });
});
