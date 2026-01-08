import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { shallowMount } from "@vue/test-utils";

import { createWorkflow } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import { KANVAS_ID } from "@/util/workflow-canvas";
import WorkflowCanvas from "../WorkflowCanvas.vue";
import Kanvas from "../kanvas/Kanvas.vue";

describe("WorkflowCanvas.vue", () => {
  const doMount = () => {
    const mockedStores = mockStores();

    // @ts-expect-error
    window.ResizeObserver = vi.fn(() => ({ observe: () => {} }));

    mockedStores.workflowStore.setActiveWorkflow(createWorkflow());

    const wrapper = shallowMount(WorkflowCanvas, {
      global: {
        plugins: [mockedStores.testingPinia],
      },
    });

    return { wrapper, mockedStores };
  };

  it("should set the correct attributes on canvas wrapper", () => {
    const { wrapper } = doMount();

    expect(wrapper.attributes("tabindex")).toBe("0");
    expect(wrapper.attributes("id")).toBe(KANVAS_ID);
  });

  it("should not render Kanvas while a workflow is loading", async () => {
    const { wrapper, mockedStores } = doMount();
    expect(wrapper.findComponent(Kanvas).exists()).toBe(true);

    mockedStores.lifecycleStore.isLoadingWorkflow = true;
    await nextTick();
    expect(wrapper.findComponent(Kanvas).exists()).toBe(false);
  });
});
