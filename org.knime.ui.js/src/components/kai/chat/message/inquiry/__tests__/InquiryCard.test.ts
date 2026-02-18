import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import { KdsButton, KdsCheckbox } from "@knime/kds-components";

import type { KaiInquiryOption } from "@/api/gateway-api/generated-api";
import InquiryCard from "../InquiryCard.vue";

describe("InquiryCard", () => {
  type ComponentProps = InstanceType<typeof InquiryCard>["$props"];

  const defaultOptions: KaiInquiryOption[] = [
    { id: "cancel", label: "Cancel", style: "secondary" },
    { id: "confirm", label: "Confirm", style: "primary" },
  ];

  const defaultProps: ComponentProps = {
    title: "Test Title",
    description: "Test description text",
    options: defaultOptions,
  };

  const doMount = ({ props }: { props?: Partial<ComponentProps> } = {}) => {
    const wrapper = mount(InquiryCard, {
      props: { ...defaultProps, ...props },
    });

    return { wrapper };
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("rendering", () => {
    it("renders title and description", () => {
      const { wrapper } = doMount();

      expect(wrapper.find(".header").text()).toBe("Test Title");
      expect(wrapper.find(".description").text()).toBe("Test description text");
    });

    it("renders buttons for each option", () => {
      const { wrapper } = doMount();

      const buttons = wrapper.findAllComponents(KdsButton);
      expect(buttons).toHaveLength(2);
      expect(buttons[0].props("label")).toBe("Cancel");
      expect(buttons[1].props("label")).toBe("Confirm");
    });

    it("renders buttons with correct variants", () => {
      const { wrapper } = doMount();

      const buttons = wrapper.findAllComponents(KdsButton);
      expect(buttons[0].props("variant")).toBe("transparent");
      expect(buttons[1].props("variant")).toBe("filled");
    });

    it("renders arbitrary number of options", () => {
      const { wrapper } = doMount({
        props: {
          options: [
            { id: "a", label: "Option A", style: "secondary" },
            { id: "b", label: "Option B", style: "secondary" },
            { id: "c", label: "Option C", style: "primary" },
          ],
        },
      });

      const buttons = wrapper.findAllComponents(KdsButton);
      expect(buttons).toHaveLength(3);
      expect(buttons[0].props("label")).toBe("Option A");
      expect(buttons[1].props("label")).toBe("Option B");
      expect(buttons[2].props("label")).toBe("Option C");
    });

    it("does not render accent bar by default", () => {
      const { wrapper } = doMount();

      expect(wrapper.find(".card-container").classes()).not.toContain(
        "highlighted",
      );
    });

    it("renders accent bar when highlighted is true", () => {
      const { wrapper } = doMount({
        props: { highlighted: true },
      });

      expect(wrapper.find(".card-container").classes()).toContain(
        "highlighted",
      );
    });
  });

  describe("checkbox", () => {
    it("does not render checkbox by default", () => {
      const { wrapper } = doMount();

      expect(wrapper.findComponent(KdsCheckbox).exists()).toBe(false);
    });

    it("renders checkbox when checkbox prop is provided", () => {
      const { wrapper } = doMount({
        props: { checkbox: { label: "Remember this" } },
      });

      const checkbox = wrapper.findComponent(KdsCheckbox);
      expect(checkbox.exists()).toBe(true);
      expect(checkbox.props("label")).toBe("Remember this");
    });

    it("renders checkbox with helper text when provided", () => {
      const { wrapper } = doMount({
        props: {
          checkbox: {
            label: "Remember this",
            subText: "You can change this later",
          },
        },
      });

      const checkbox = wrapper.findComponent(KdsCheckbox);
      expect(checkbox.props("subText")).toBe("You can change this later");
    });
  });

  describe("emits", () => {
    it("emits respond with optionId and isCheckboxChecked: false when a button is clicked", async () => {
      const { wrapper } = doMount();

      const confirmButton = wrapper.findAllComponents(KdsButton)[1];
      await confirmButton.trigger("click");

      expect(wrapper.emitted("respond")).toHaveLength(1);
      expect(wrapper.emitted("respond")![0]).toEqual([
        { optionId: "confirm", isCheckboxChecked: false },
      ]);
    });

    it("emits respond with isCheckboxChecked: true when checkbox is checked", async () => {
      const { wrapper } = doMount({
        props: { checkbox: { label: "Remember this" } },
      });

      const checkbox = wrapper.findComponent(KdsCheckbox);
      await checkbox.setValue(true);

      const confirmButton = wrapper.findAllComponents(KdsButton)[1];
      await confirmButton.trigger("click");

      expect(wrapper.emitted("respond")![0]).toEqual([
        { optionId: "confirm", isCheckboxChecked: true },
      ]);
    });

    it("only emits once even if multiple buttons are clicked", async () => {
      const { wrapper } = doMount();

      const buttons = wrapper.findAllComponents(KdsButton);
      await buttons[0].trigger("click");
      await buttons[1].trigger("click");

      expect(wrapper.emitted("respond")).toHaveLength(1);
      expect(wrapper.emitted("respond")![0]).toEqual([
        { optionId: "cancel", isCheckboxChecked: false },
      ]);
    });
  });

  describe("auto-select timer", () => {
    it("does not show countdown when autoSelectAfter is not set", () => {
      const { wrapper } = doMount();

      const buttons = wrapper.findAllComponents(KdsButton);
      expect(buttons[0].props("label")).toBe("Cancel");
      expect(buttons[1].props("label")).toBe("Confirm");
    });

    it("shows countdown on the default option button", () => {
      const { wrapper } = doMount({
        props: { autoSelectAfter: 10, defaultOptionId: "cancel" },
      });

      const cancelButton = wrapper.findAllComponents(KdsButton)[0];
      expect(cancelButton.props("label")).toBe("Cancel (10)");
    });

    it("falls back to first secondary option when defaultOptionId is not set", () => {
      const { wrapper } = doMount({
        props: { autoSelectAfter: 10 },
      });

      // "cancel" is the first secondary option
      const cancelButton = wrapper.findAllComponents(KdsButton)[0];
      expect(cancelButton.props("label")).toBe("Cancel (10)");
    });

    it("decrements countdown every second", async () => {
      const { wrapper } = doMount({
        props: { autoSelectAfter: 10 },
      });

      const cancelButton = wrapper.findAllComponents(KdsButton)[0];
      expect(cancelButton.props("label")).toBe("Cancel (10)");

      vi.advanceTimersByTime(1000);
      await nextTick();
      expect(cancelButton.props("label")).toBe("Cancel (9)");

      vi.advanceTimersByTime(3000);
      await nextTick();
      expect(cancelButton.props("label")).toBe("Cancel (6)");
    });

    it("emits respond with default option when timer reaches zero", async () => {
      const { wrapper } = doMount({
        props: { autoSelectAfter: 3 },
      });

      expect(wrapper.emitted("respond")).toBeUndefined();

      vi.advanceTimersByTime(3000);
      await nextTick();

      expect(wrapper.emitted("respond")).toHaveLength(1);
      expect(wrapper.emitted("respond")![0]).toEqual([
        { optionId: "cancel", isCheckboxChecked: false },
      ]);
    });

    it("emits respond with isCheckboxChecked: true on timeout if checkbox is checked", async () => {
      const { wrapper } = doMount({
        props: {
          autoSelectAfter: 3,
          checkbox: { label: "Remember this" },
        },
      });

      const checkbox = wrapper.findComponent(KdsCheckbox);
      await checkbox.setValue(true);

      vi.advanceTimersByTime(3000);
      await nextTick();

      expect(wrapper.emitted("respond")![0]).toEqual([
        { optionId: "cancel", isCheckboxChecked: true },
      ]);
    });

    it("stops timer when a button is clicked", async () => {
      const { wrapper } = doMount({
        props: { autoSelectAfter: 10 },
      });

      const confirmButton = wrapper.findAllComponents(KdsButton)[1];
      await confirmButton.trigger("click");

      vi.advanceTimersByTime(10000);
      await nextTick();

      // Should only have the one emit from button click
      expect(wrapper.emitted("respond")).toHaveLength(1);
    });

    it("removes countdown from label after timer completes", async () => {
      const { wrapper } = doMount({
        props: { autoSelectAfter: 2 },
      });

      vi.advanceTimersByTime(2000);
      await nextTick();

      const cancelButton = wrapper.findAllComponents(KdsButton)[0];
      expect(cancelButton.props("label")).toBe("Cancel");
    });
  });

  describe("unmount behavior", () => {
    it("emits respond with default option when unmounted without user action", () => {
      const { wrapper } = doMount();

      expect(wrapper.emitted("respond")).toBeUndefined();

      wrapper.unmount();

      expect(wrapper.emitted("respond")).toHaveLength(1);
      expect(wrapper.emitted("respond")![0]).toEqual([
        { optionId: "cancel", isCheckboxChecked: false },
      ]);
    });

    it("emits respond with isCheckboxChecked: true on unmount if checkbox was checked", async () => {
      const { wrapper } = doMount({
        props: { checkbox: { label: "Remember this" } },
      });

      const checkbox = wrapper.findComponent(KdsCheckbox);
      await checkbox.setValue(true);

      wrapper.unmount();

      expect(wrapper.emitted("respond")![0]).toEqual([
        { optionId: "cancel", isCheckboxChecked: true },
      ]);
    });

    it("does not emit respond on unmount if user already clicked a button", async () => {
      const { wrapper } = doMount();

      const confirmButton = wrapper.findAllComponents(KdsButton)[1];
      await confirmButton.trigger("click");

      const emittedBeforeUnmount = wrapper.emitted("respond")!;
      expect(emittedBeforeUnmount).toHaveLength(1);

      wrapper.unmount();

      // Should still have only one emit (no additional emit on unmount)
      expect(emittedBeforeUnmount).toHaveLength(1);
    });

    it("does not emit respond on unmount if timer already auto-selected", async () => {
      const { wrapper } = doMount({
        props: { autoSelectAfter: 2 },
      });

      vi.advanceTimersByTime(2000);
      await nextTick();

      expect(wrapper.emitted("respond")).toHaveLength(1);

      const emittedRespond = wrapper.emitted("respond");

      wrapper.unmount();

      expect(emittedRespond).toHaveLength(1);
    });
  });
});
