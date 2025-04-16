import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, shallowMount } from "@vue/test-utils";

import { ComponentPlaceholder as ComponentPlaceholderType } from "@/api/gateway-api/generated-api";
import { createComponentPlaceholder } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import { getToastPresets } from "@/toastPresets";
import ComponentPlaceholder from "../ComponentPlaceholder.vue";

describe("ComponentPlaceholder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = { placeholder: createComponentPlaceholder() };

  const doMount = (props = {}) => {
    const { toastPresets } = getToastPresets();
    const mockedStores = mockStores();

    const wrapper = shallowMount(ComponentPlaceholder, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [mockedStores.testingPinia],
      },
    });

    return {
      wrapper,
      toastPresets,
      mockedStores,
    };
  };

  it("should show error toast if the state is ERROR", async () => {
    const { wrapper, toastPresets } = doMount();

    const componentLoadingFailedSpy = vi.spyOn(
      toastPresets.workflow,
      "componentLoadingFailed",
    );
    const placeholderData = {
      message: "Placeholder failed loading",
      details: "No details",
    };

    await wrapper.setProps({
      placeholder: {
        ...defaultProps.placeholder,
        state: ComponentPlaceholderType.StateEnum.ERROR,
        ...placeholderData,
      },
    });

    expect(componentLoadingFailedSpy).toHaveBeenCalledWith(placeholderData);
  });

  it("should show warning toast if the state is SUCCESSWITHWARNING", async () => {
    const { wrapper, toastPresets } = doMount();

    const componentLoadedWithWarningSpy = vi.spyOn(
      toastPresets.workflow,
      "componentLoadedWithWarning",
    );
    const placeholderData = {
      message: "There are some issues",
      details: "Fix this",
    };

    await wrapper.setProps({
      placeholder: {
        ...defaultProps.placeholder,
        state: ComponentPlaceholderType.StateEnum.SUCCESSWITHWARNING,
        ...placeholderData,
      },
    });

    expect(componentLoadedWithWarningSpy).toHaveBeenCalledWith(placeholderData);
  });

  it("should select a node if selection state hasnt changed and state of placeholder is SUCCESS", async () => {
    const { wrapper, mockedStores } = doMount();

    const componentId = "componentId1";

    await wrapper.setProps({
      placeholder: {
        ...defaultProps.placeholder,
        componentId,
        state: ComponentPlaceholderType.StateEnum.SUCCESS,
      },
    });

    expect(mockedStores.selectionStore.deselectAllObjects).toBeCalledWith([
      componentId,
    ]);
  });

  // TODO(NXT-3679) will be fixed in a follow-up
  it.todo(
    "should not select a node if selection state has changed",
    async () => {
      const { wrapper, mockedStores } = doMount();
      await flushPromises();
      await nextTick();

      const componentId = "componentId1";

      await mockedStores.selectionStore.selectNodes(["id1"]);
      await flushPromises();

      await wrapper.setProps({
        placeholder: {
          ...defaultProps.placeholder,
          componentId,
          state: ComponentPlaceholderType.StateEnum.SUCCESS,
        },
      });

      expect(mockedStores.selectionStore.deselectAllObjects).not.toBeCalled();
    },
  );
});
