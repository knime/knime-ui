import { beforeEach, describe, expect, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";

import CloseIcon from "@knime/styles/img/icons/cancel-execution.svg";
import ReExecutionIcon from "@knime/styles/img/icons/reexecution.svg";

import { mockStores } from "@/test/utils/mockStores";
import ComponentFloatingOptions from "../ComponentFloatingOptions.vue";

describe("ComponentFloatingOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const doMount = (props = {}) => {
    const defaultProps = {
      id: "id1",
      isError: true,
    };

    const mockedStores = mockStores();

    const wrapper = shallowMount(ComponentFloatingOptions, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [mockedStores.testingPinia],
      },
    });

    return {
      wrapper,
      mockedStores,
    };
  };

  it("should show re-execution icon and trigger this action if clicked", async () => {
    const { wrapper, mockedStores } = doMount();

    const button = wrapper.find(".floating-button");
    await button.trigger("click");

    expect(wrapper.findComponent(ReExecutionIcon).exists()).toBe(true);
    expect(
      mockedStores.componentInteractionsStore.cancelOrRetryComponentLoading,
    ).toBeCalledWith({ placeholderId: "id1", action: "retry" });
  });

  it("should show cancel icon and trigger this action if clicked", async () => {
    const { wrapper, mockedStores } = doMount({ isError: false });

    const button = wrapper.find(".floating-button");
    await button.trigger("click");

    expect(wrapper.findComponent(CloseIcon).exists()).toBe(true);
    expect(
      mockedStores.componentInteractionsStore.cancelOrRetryComponentLoading,
    ).toBeCalledWith({ placeholderId: "id1", action: "cancel" });
  });
});
