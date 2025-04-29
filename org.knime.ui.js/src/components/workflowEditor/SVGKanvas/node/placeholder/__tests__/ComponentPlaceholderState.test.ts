import { beforeEach, describe, expect, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";

import { ComponentPlaceholder } from "@/api/gateway-api/generated-api";
import * as $shapes from "@/style/shapes";
import { createComponentPlaceholder } from "@/test/factories";
import ComponentError from "../ComponentError.vue";
import ComponentFloatingOptions from "../ComponentFloatingOptions.vue";
import ComponentLoading from "../ComponentLoading.vue";
import ComponentPlaceholderState from "../ComponentPlaceholderState.vue";

describe("ComponentPlaceholderState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const doMount = (props = {}) => {
    const defaultProps = createComponentPlaceholder();

    const wrapper = shallowMount(ComponentPlaceholderState, {
      props: { ...defaultProps, ...props },
      global: {
        mocks: { $shapes },
      },
    });

    return {
      wrapper,
    };
  };

  it("should render ComponentLoading if state is LOADING", () => {
    const { wrapper } = doMount();

    expect(wrapper.findComponent(ComponentLoading).exists()).toBe(true);
  });

  it("should render ComponentError if state is ERROR", () => {
    const { wrapper } = doMount({
      state: ComponentPlaceholder.StateEnum.ERROR,
    });

    expect(wrapper.findComponent(ComponentError).exists()).toBe(true);
  });

  it("should render ComponentFloatingOptions if isHovering is true", async () => {
    const { wrapper } = doMount();

    expect(wrapper.findComponent(ComponentFloatingOptions).exists()).toBe(
      false,
    );
    await wrapper.find("g").trigger("mouseenter");

    expect(wrapper.findComponent(ComponentFloatingOptions).exists()).toBe(true);
  });
});
