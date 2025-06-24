import { beforeEach, describe, expect, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";

import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import ComponentLoading from "../ComponentLoading.vue";

describe("ComponentLoading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const doMount = (props = {}) => {
    const defaultProps = {
      progress: 0,
    };

    const wrapper = shallowMount(ComponentLoading, {
      props: { ...defaultProps, ...props },
      global: {
        mocks: { $shapes, $colors },
      },
    });

    return {
      wrapper,
    };
  };

  it("should show correct progress", () => {
    const { wrapper } = doMount();

    expect(wrapper.find(".progress").text()).toBe("0%");
  });

  it("should show progress and progress border", () => {
    const { wrapper } = doMount({
      progress: 0.55,
    });

    expect(wrapper.find(".progress").text()).toBe("55%");
    expect(wrapper.find(".progress-border").exists()).toBe(true);
  });
});
