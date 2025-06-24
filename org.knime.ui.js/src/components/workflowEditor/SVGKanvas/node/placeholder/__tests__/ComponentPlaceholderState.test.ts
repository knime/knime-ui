import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, shallowMount } from "@vue/test-utils";

import { ComponentPlaceholder } from "@/api/gateway-api/generated-api";
import * as $shapes from "@/style/shapes";
import { createComponentPlaceholder } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import NodeNameText from "../../name/NodeNameText.vue";
import ComponentError from "../ComponentError.vue";
import ComponentFloatingOptions from "../ComponentFloatingOptions.vue";
import ComponentLoading from "../ComponentLoading.vue";
import ComponentPlaceholderState from "../ComponentPlaceholderState.vue";

describe("ComponentPlaceholderState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = createComponentPlaceholder();

  const doMount = (props = {}) => {
    const mockedStores = mockStores();

    const wrapper = shallowMount(ComponentPlaceholderState, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [mockedStores.testingPinia],
        mocks: { $shapes },
      },
    });

    return {
      wrapper,
      mockedStores,
    };
  };

  it("should show name of the placeholder", () => {
    const { wrapper } = doMount();

    expect(wrapper.findComponent(NodeNameText).props()).toEqual(
      expect.objectContaining({
        value: "Component Placeholder",
        editable: false,
      }),
    );
  });

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

  it("should select component placeholder", async () => {
    const { wrapper, mockedStores } = doMount();

    await wrapper.find("g").trigger("pointerdown", {
      button: 0,
    });

    expect(
      mockedStores.selectionStore.selectComponentPlaceholder,
    ).toBeCalledWith(defaultProps.id);
  });

  it("should deselect component placeholder if already selected and isMultiselect", async () => {
    const { wrapper, mockedStores } = doMount();
    // @ts-expect-error
    mockedStores.selectionStore.getSelectedComponentPlaceholder = {
      id: defaultProps.id,
    };

    await wrapper.find("g").trigger("pointerdown", {
      button: 0,
      shiftKey: true,
    });

    expect(
      mockedStores.selectionStore.deselectComponentPlaceholder,
    ).toBeCalled();
  });

  it("should select component placeholder and toggle context menu", async () => {
    const { wrapper, mockedStores } = doMount();

    await wrapper.find("g").trigger("pointerdown", {
      button: 2,
    });
    await flushPromises();

    expect(
      mockedStores.selectionStore.selectComponentPlaceholder,
    ).toBeCalledWith(defaultProps.id);
    expect(
      mockedStores.canvasAnchoredComponentsStore.toggleContextMenu,
    ).toBeCalled();
  });
});
