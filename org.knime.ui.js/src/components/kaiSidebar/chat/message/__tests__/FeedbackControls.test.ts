import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import FeedbackControls from "../FeedbackControls.vue";

describe("FeedbackControls", () => {
  it("renders the feedback controls if submitFeedback is not null", () => {
    const wrapper = mount(FeedbackControls, {
      props: {
        submitFeedback: vi.fn(),
        showControls: true,
      },
    });

    expect(wrapper.find(".feedback-controls").exists()).toBe(true);
  });

  it("does not render the feedback controls if submitFeedback is null", () => {
    const wrapper = mount(FeedbackControls, {
      props: {
        submitFeedback: null,
        showControls: true,
      },
    });

    expect(wrapper.find(".feedback-controls").exists()).toBe(false);
  });

  it("shows the feedback controls if showControls is true", () => {
    const wrapper = mount(FeedbackControls, {
      props: {
        submitFeedback: vi.fn(),
        showControls: true,
      },
    });

    const htmlElement = wrapper.find(".feedback-controls")
      .element as HTMLElement;
    expect(htmlElement.style.display).not.toBe("none");
  });

  it("does not show the feedback controls if showControls is false", () => {
    const wrapper = mount(FeedbackControls, {
      props: {
        submitFeedback: vi.fn(),
        showControls: false,
      },
    });

    const htmlElement = wrapper.find(".feedback-controls")
      .element as HTMLElement;
    expect(htmlElement.style.display).toBe("none");
  });

  it("calls submitFeedback with true when thumbs-up button is clicked", async () => {
    const submitFeedbackMock = vi.fn();
    const wrapper = mount(FeedbackControls, {
      props: {
        submitFeedback: submitFeedbackMock,
        showControls: true,
      },
    });

    await wrapper.find(".thumbs-up").trigger("click");

    expect(submitFeedbackMock).toHaveBeenCalledWith({
      comment: "",
      isPositive: true,
    });
  });

  it("calls submitFeedback with false when thumbs-down button is clicked", async () => {
    const submitFeedbackMock = vi.fn();
    const wrapper = mount(FeedbackControls, {
      props: {
        submitFeedback: submitFeedbackMock,
        showControls: true,
      },
    });

    await wrapper.find(".thumbs-down").trigger("click");

    expect(submitFeedbackMock).toHaveBeenCalledWith({
      comment: "",
      isPositive: false,
    });
  });

  it("shows thank you message when submitFeedback is set to null", async () => {
    const wrapper = mount(FeedbackControls, {
      props: {
        submitFeedback: vi.fn(),
        showControls: true,
      },
    });

    await wrapper.setProps({ submitFeedback: null });
    await nextTick();

    expect(wrapper.find(".thank-you").exists()).toBe(true);
  });

  it("hides thank you message after the specified delay time", async () => {
    vi.useFakeTimers();

    const wrapper = mount(FeedbackControls, {
      props: {
        submitFeedback: vi.fn(),
        showControls: true,
      },
    });

    await wrapper.setProps({ submitFeedback: null });
    await nextTick();

    expect(wrapper.find(".thank-you").exists()).toBe(true);

    vi.advanceTimersByTime(1000);
    await nextTick();

    expect(wrapper.find(".thank-you").exists()).toBe(false);

    vi.useRealTimers();
  });
});
