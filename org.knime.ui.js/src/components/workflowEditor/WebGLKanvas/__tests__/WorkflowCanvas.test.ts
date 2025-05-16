import { describe, expect, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";

import { mockStores } from "@/test/utils/mockStores";
import { KANVAS_ID } from "@/util/getKanvasDomElement";
import WorkflowCanvas from "../WorkflowCanvas.vue";

describe("WorkflowCanvas.vue", () => {
  it("should set the correct attributes on canvas wrapper", () => {
    const mockedStores = mockStores();

    // @ts-expect-error
    window.ResizeObserver = vi.fn(() => ({ observe: () => {} }));

    const wrapper = shallowMount(WorkflowCanvas, {
      global: {
        plugins: [mockedStores.testingPinia],
      },
    });

    expect(wrapper.attributes("tabindex")).toBe("0");
    expect(wrapper.attributes("id")).toBe(KANVAS_ID);
  });
});
