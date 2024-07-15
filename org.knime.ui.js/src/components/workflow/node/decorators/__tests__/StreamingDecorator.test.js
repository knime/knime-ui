import { expect, describe, it } from "vitest";
import { shallowMount } from "@vue/test-utils";

import * as $colors from "@/style/colors";

import StreamingDecorator from "../StreamingDecorator.vue";

describe("StreamingDecorator.vue", () => {
  let doShallowMount = (executionInfo, backgroundType) =>
    shallowMount(StreamingDecorator, {
      props: { executionInfo, backgroundType },
      global: { mocks: { $colors } },
    });

  describe("symbol", () => {
    it("draws arrow for streamable nodes", () => {
      const wrapper = doShallowMount({ jobManager: { type: "streaming" } });
      expect(wrapper.find("path.streamable").exists()).toBe(true);
      expect(wrapper.find("path.not-streamable").exists()).toBe(false);
    });

    it("draws X for unstreamable nodes", () => {
      const wrapper = doShallowMount({ streamable: false });
      expect(wrapper.find("path.streamable").exists()).toBe(false);
      expect(wrapper.find("path.not-streamable").exists()).toBe(true);
    });
  });

  describe("background", () => {
    it("draws no background for streamable nodes", () => {
      const wrapper = doShallowMount({ streamable: true }, "Reader");
      expect(wrapper.find("rect").exists()).toBe(false);
    });

    it("draws background for unstreamable nodes of known type", () => {
      const wrapper = doShallowMount({ streamable: false }, "Manipulator");
      expect(wrapper.find("rect").attributes().fill).toBe(
        $colors.nodeBackgroundColors.Manipulator,
      );
    });

    it("draws no background for unstreamable nodes of unknown type", () => {
      const wrapper = doShallowMount({ streamable: false }, "unknown type");
      expect(wrapper.find("rect").exists()).toBe(false);
    });
  });
});
