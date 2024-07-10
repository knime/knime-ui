import { expect, describe, it } from "vitest";
import { nextTick } from "vue";
import { shallowMount } from "@vue/test-utils";

import ArrowDownIcon from "@knime/styles/img/icons/arrow-down.svg";
import CircleInfoIcon from "@knime/styles/img/icons/circle-info.svg";

import { mockVuexStore } from "@/test/utils/mockVuexStore";
import WorkflowEmpty from "../WorkflowEmpty.vue";

describe("WorkflowEmpty", () => {
  const doShallowMount = () => {
    const containerSize = {
      width: 1000,
      height: 1000,
    };

    const storeConfig = {
      canvas: {
        state: {
          containerSize,
        },
      },
      application: {
        state: {
          permissions: { canEditWorkflow: true },
        },
      },
    };

    const $store = mockVuexStore(storeConfig);
    const wrapper = shallowMount(WorkflowEmpty, {
      global: { plugins: [$store] },
    });
    return { wrapper, $store };
  };

  it("renders correctly", () => {
    const { wrapper } = doShallowMount();

    expect(wrapper.text()).toMatch(
      "Start building your workflow by dropping your data or nodes here.",
    );
    expect(wrapper.findComponent(ArrowDownIcon).exists()).toBe(true);
  });

  it("renders correctly (job viewer)", async () => {
    const { wrapper, $store } = doShallowMount();

    $store.state.application.permissions.canEditWorkflow = false;

    await nextTick();

    expect(wrapper.text()).toMatch("This workflow is empty.");
    expect(wrapper.findComponent(CircleInfoIcon).exists()).toBe(true);
  });

  it("calculates width and height of rect based on size of the viewBox", () => {
    const { wrapper } = doShallowMount();

    let rectangleProps = wrapper.find("rect").attributes();
    expect(Number(rectangleProps.x)).toBe(-500 + 25);
    expect(Number(rectangleProps.y)).toBe(-500 + 25);
    expect(Number(rectangleProps.height)).toBe(1000 - 50);
    expect(Number(rectangleProps.width)).toBe(1000 - 50);
  });
});
