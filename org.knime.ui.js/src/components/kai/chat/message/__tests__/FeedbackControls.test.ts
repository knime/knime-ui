import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import * as aiAssistantStore from "@/store/aiAssistant";
import { mockVuexStore } from "@/test/utils";
import FeedbackControls from "../FeedbackControls.vue";

describe("FeedbackControls", () => {
  const interactionId = "some-interaction-id";

  const doMount = ({
    showControls = true,
    isFeedbackProcessed = false,
  }: { showControls?: boolean; isFeedbackProcessed?: boolean } = {}) => {
    const isFeedbackProcessedMock = vi
      .fn()
      .mockReturnValue(isFeedbackProcessed);
    const submitFeedbackMock = vi.fn();

    const $store = mockVuexStore({
      aiAssistant: {
        ...aiAssistantStore,
        getters: {
          isFeedbackProcessed: () => isFeedbackProcessedMock,
        },
        actions: {
          submitFeedback: submitFeedbackMock,
        },
      },
    });

    const props = { interactionId, showControls };
    const wrapper = mount(FeedbackControls, {
      props,
      global: {
        plugins: [$store],
      },
    });

    return { wrapper, $store, submitFeedbackMock };
  };

  it("renders the feedback controls if showControls is true and feedback is not processed yet", () => {
    const { wrapper } = doMount();

    expect(wrapper.find(".feedback-controls").exists()).toBe(true);
  });

  it("does not render the feedback controls if feedback is processed", () => {
    const { wrapper } = doMount({ isFeedbackProcessed: true });

    expect(wrapper.find(".feedback-controls").exists()).toBe(false);
  });

  it("shows the feedback controls if showControls is true", () => {
    const { wrapper } = doMount();

    const htmlElement = wrapper.find(".feedback-controls")
      .element as HTMLElement;
    expect(htmlElement.style.display).not.toBe("none");
  });

  it("does not show the feedback controls if showControls is false", () => {
    const { wrapper } = doMount({ showControls: false });

    const htmlElement = wrapper.find(".feedback-controls")
      .element as HTMLElement;
    expect(htmlElement.style.display).toBe("none");
  });

  it("calls submitFeedback with true when thumbs-up button is clicked", async () => {
    const { wrapper, submitFeedbackMock } = doMount();

    await wrapper.find(".thumbs-up").trigger("click");

    expect(submitFeedbackMock).toHaveBeenCalledWith(expect.anything(), {
      interactionId,
      feedback: {
        comment: "",
        isPositive: true,
      },
    });
  });

  it("calls submitFeedback with false when thumbs-down button is clicked", async () => {
    const { wrapper, submitFeedbackMock } = doMount();

    await wrapper.find(".thumbs-down").trigger("click");

    expect(submitFeedbackMock).toHaveBeenCalledWith(expect.anything(), {
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
