import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import { mockStores } from "@/test/utils/mockStores";
import FeedbackControls from "../FeedbackControls.vue";

describe("FeedbackControls", () => {
  const interactionId = "some-interaction-id";

  const doMount = ({
    isFeedbackProcessed = false,
  }: { isFeedbackProcessed?: boolean } = {}) => {
    const isFeedbackProcessedMock = vi
      .fn()
      .mockReturnValue(isFeedbackProcessed);

    const mockedStores = mockStores();

    // @ts-ignore
    mockedStores.aiAssistantStore.isFeedbackProcessed = isFeedbackProcessedMock;

    const props = { interactionId };
    const wrapper = mount(FeedbackControls, {
      props,
      global: {
        plugins: [mockedStores.testingPinia],
      },
    });

    return { wrapper, mockedStores };
  };

  it("renders the feedback controls", () => {
    const { wrapper } = doMount();

    expect(wrapper.find(".feedback-controls").exists()).toBe(true);
  });

  it("does not render the feedback controls if feedback is processed", () => {
    const { wrapper } = doMount({ isFeedbackProcessed: true });

    expect(wrapper.find(".feedback-controls").exists()).toBe(false);
  });

  it("calls submitFeedback with true when thumbs-up button is clicked", async () => {
    const { wrapper, mockedStores } = doMount();

    await wrapper.find(".thumbs-up").trigger("click");

    expect(mockedStores.aiAssistantStore.submitFeedback).toHaveBeenCalledWith({
      interactionId,
      feedback: {
        comment: "",
        isPositive: true,
      },
    });
  });

  it("calls submitFeedback with false when thumbs-down button is clicked", async () => {
    const { wrapper, mockedStores } = doMount();

    await wrapper.find(".thumbs-down").trigger("click");

    expect(mockedStores.aiAssistantStore.submitFeedback).toHaveBeenCalledWith({
      interactionId,
      feedback: {
        comment: "",
        isPositive: false,
      },
    });
  });

  it("shows and then hides thank you message when feedback button is clicked", async () => {
    vi.useFakeTimers();

    const { wrapper } = doMount();

    await wrapper.find(".thumbs-up").trigger("click");
    await nextTick();

    expect(wrapper.find(".thank-you").exists()).toBe(true);

    vi.advanceTimersByTime(1000);
    await flushPromises();

    expect(wrapper.find(".thank-you").exists()).toBe(false);

    vi.useRealTimers();
  });
});
