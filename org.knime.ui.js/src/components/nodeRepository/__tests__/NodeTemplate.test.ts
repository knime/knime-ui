import { describe, vi, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { mockVuexStore } from "@/test/utils";

import * as nodeRepositoryStore from "@/store/nodeRepository";

import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";
import CircleHelp from "webapps-common/ui/assets/img/icons/circle-help.svg";

import NodeTemplate from "../NodeTemplate.vue";

describe("NodeTemplate.vue", () => {
  const defaultProps: {
    nodeTemplate: Object;
    isSelected: Boolean;
    isHighlighted: Boolean;
    showFloatingHelpIcon: Boolean;
  } = {
    nodeTemplate: {
      id: "node_1",
      name: "Test",
    },
    isSelected: false,
    isHighlighted: false,
    showFloatingHelpIcon: true,
  };

  const doMount = ({ props = {}, mocks = {} } = {}) => {
    const $store = mockVuexStore({
      nodeRepository: {
        ...nodeRepositoryStore,
        state: {
          isDescriptionPanelOpen: false,
        },
      },
    });

    const dispatchSpy = vi.spyOn($store, "dispatch");
    const commitSpy = vi.spyOn($store, "commit");

    const wrapper = mount(NodeTemplate, {
      props: { ...defaultProps, ...props },
      global: {
        mocks: { ...mocks },
        plugins: [$store],
      },
    });

    return { wrapper, $store, dispatchSpy, commitSpy };
  };

  it("opens the description panel when clicked", async () => {
    const { wrapper, commitSpy, dispatchSpy } = doMount();

    expect(
      wrapper.findComponent(FunctionButton).findComponent(CircleHelp).exists()
    ).toBe(true);

    await wrapper.findComponent(FunctionButton).vm.$emit("click");

    expect(dispatchSpy).toHaveBeenCalledWith(
      "nodeRepository/openDescriptionPanel"
    );
    expect(commitSpy).toHaveBeenCalledWith("nodeRepository/setSelectedNode", {
      id: "node_1",
      name: "Test",
    });
  });

  it("closes the description panel if node is selected and panel is opened", async () => {
    const { wrapper, dispatchSpy, $store } = doMount({
      props: {
        isSelected: true,
      },
    });
    $store.state.nodeRepository.isDescriptionPanelOpen = true;

    await wrapper.findComponent(FunctionButton).vm.$emit("click");

    expect(dispatchSpy).toHaveBeenCalledWith(
      "nodeRepository/closeDescriptionPanel"
    );
  });

  it("does not show question mark icon for quick add node menu", () => {
    const { wrapper } = doMount({
      props: {
        showFloatingHelpIcon: false,
      },
    });

    expect(wrapper.findComponent(FunctionButton).exists()).toBe(false);
  });

  it("it adds class when node is hovered over", async () => {
    const { wrapper } = doMount();

    await wrapper.find(".node").trigger("pointerenter");
    const button = wrapper.find(".description-icon");

    expect(button.classes()).toContain("hovered-icon");

    await wrapper.find(".node").trigger("pointerleave");

    expect(button.classes()).not.toContain("hovered-icon");
  });
});
