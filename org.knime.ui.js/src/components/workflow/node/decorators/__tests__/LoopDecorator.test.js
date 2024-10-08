import { describe, expect, it } from "vitest";
import { shallowMount } from "@vue/test-utils";

import * as $colors from "@/style/colors";
import LoopDecorator from "../LoopDecorator.vue";

describe("LoopDecorator.vue", () => {
  const doShallowMount = (loopStatus) =>
    shallowMount(LoopDecorator, {
      props: { loopStatus },
      global: { mocks: { $colors } },
    });

  it("does not render decorator when loopStatus is missing", () => {
    const wrapper = doShallowMount();
    expect(wrapper.find("g.pause").exists()).toBe(false);
    expect(wrapper.find("g.running").exists()).toBe(false);
  });

  it("renders decorator when loopStatus is paused", () => {
    const wrapper = doShallowMount("PAUSED");
    expect(wrapper.find("g.pause").exists()).toBe(true);
    expect(wrapper.find("g.running").exists()).toBe(false);
  });

  it("renders decorator when loopStatus is running", () => {
    const wrapper = doShallowMount("RUNNING");
    expect(wrapper.find("g.pause").exists()).toBe(false);
    expect(wrapper.find("g.running").exists()).toBe(true);
  });
});
