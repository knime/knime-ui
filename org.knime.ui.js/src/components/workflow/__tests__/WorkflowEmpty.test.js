import { expect, describe, it } from "vitest";
import { shallowMount } from "@vue/test-utils";

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
    };

    const $store = mockVuexStore(storeConfig);
    return shallowMount(WorkflowEmpty, { global: { plugins: [$store] } });
  };

  it("renders text", () => {
    const wrapper = doShallowMount();

    expect(wrapper.text()).toMatch(
      "Start building your workflow by dropping your data or nodes here."
    );
  });

  it("calculates width and height of rect based on size of the viewBox", () => {
    const wrapper = doShallowMount();

    let rectangleProps = wrapper.find("rect").attributes();
    expect(Number(rectangleProps.x)).toBe(-500 + 25);
    expect(Number(rectangleProps.y)).toBe(-500 + 25);
    expect(Number(rectangleProps.height)).toBe(1000 - 50);
    expect(Number(rectangleProps.width)).toBe(1000 - 50);
  });
});
