import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import { KdsButton, KdsCheckbox } from "@knime/kds-components";

import PermissionRequestCard from "../PermissionRequestCard.vue";

describe("PermissionRequestCard", () => {
  type ComponentProps = InstanceType<typeof PermissionRequestCard>["$props"];

  const defaultProps: ComponentProps = {
    title: "Test Title",
    description: "Test description text",
  };

  const doMount = ({ props }: { props?: Partial<ComponentProps> } = {}) => {
    const wrapper = mount(PermissionRequestCard, {
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

    it("renders confirm and cancel buttons with default labels", () => {
      const { wrapper } = doMount();

      const buttons = wrapper.findAllComponents(KdsButton);
      expect(buttons).toHaveLength(2);
      expect(buttons[0].props("label")).toBe("Skip");
      expect(buttons[1].props("label")).toBe("Allow");
    });

    it("renders confirm and cancel buttons with custom labels", () => {
      const { wrapper } = doMount({
        props: {
          confirmLabel: "Accept",
          cancelLabel: "Decline",
        },
      });

      const buttons = wrapper.findAllComponents(KdsButton);
      expect(buttons[0].props("label")).toBe("Decline");
      expect(buttons[1].props("label")).toBe("Accept");
    });

    it("does not render accent bar by default", () => {
      const { wrapper } = doMount();

      expect(wrapper.find(".card-container").classes()).not.toContain(
        "with-accent-bar",
      );
    });

    it("renders accent bar when showAccentBar is true", () => {
      const { wrapper } = doMount({
        props: { showAccentBar: true },
      });

      expect(wrapper.find(".card-container").classes()).toContain(
        "with-accent-bar",
      );
    });
  });

  describe("checkbox", () => {
    it("does not render checkbox by default", () => {
      const { wrapper } = doMount();

      expect(wrapper.findComponent(KdsCheckbox).exists()).toBe(false);
    });

    it("renders checkbox when checkboxLabel is provided", () => {
      const { wrapper } = doMount({
        props: { checkboxLabel: "Remember this" },
      });

      const checkbox = wrapper.findComponent(KdsCheckbox);
      expect(checkbox.exists()).toBe(true);
      expect(checkbox.props("label")).toBe("Remember this");
    });

    it("renders checkbox with helper text when provided", () => {
      const { wrapper } = doMount({
        props: {
          checkboxLabel: "Remember this",
          checkboxHelperText: "You can change this later",
        },
      });

      const checkbox = wrapper.findComponent(KdsCheckbox);
      expect(checkbox.props("helperText")).toBe("You can change this later");
    });
  });

  describe("emits", () => {
    it("emits confirm with isCheckboxChecked: false when confirm button is clicked", async () => {
      const { wrapper } = doMount();

      const confirmButton = wrapper.findAllComponents(KdsButton)[1];
      await confirmButton.trigger("click");

      expect(wrapper.emitted("confirm")).toHaveLength(1);
      expect(wrapper.emitted("confirm")![0]).toEqual([
        { isCheckboxChecked: false },
      ]);
    });

    it("emits cancel with isCheckboxChecked: false when cancel button is clicked", async () => {
      const { wrapper } = doMount();

      const cancelButton = wrapper.findAllComponents(KdsButton)[0];
      await cancelButton.trigger("click");

      expect(wrapper.emitted("cancel")).toHaveLength(1);
      expect(wrapper.emitted("cancel")![0]).toEqual([
        { isCheckboxChecked: false },
      ]);
    });

    it("emits confirm with isCheckboxChecked: true when checkbox is checked", async () => {
      const { wrapper } = doMount({
        props: { checkboxLabel: "Remember this" },
      });

      const checkbox = wrapper.findComponent(KdsCheckbox);
      await checkbox.setValue(true);

      const confirmButton = wrapper.findAllComponents(KdsButton)[1];
      await confirmButton.trigger("click");

      expect(wrapper.emitted("confirm")![0]).toEqual([
        { isCheckboxChecked: true },
      ]);
    });

    it("emits cancel with isCheckboxChecked: true when checkbox is checked", async () => {
      const { wrapper } = doMount({
        props: { checkboxLabel: "Remember this" },
      });

      const checkbox = wrapper.findComponent(KdsCheckbox);
      await checkbox.setValue(true);

      const cancelButton = wrapper.findAllComponents(KdsButton)[0];
      await cancelButton.trigger("click");

      expect(wrapper.emitted("cancel")![0]).toEqual([
        { isCheckboxChecked: true },
      ]);
    });
  });

  describe("auto-cancel timer", () => {
    it("does not show countdown when autoCancelAfter is not set", () => {
      const { wrapper } = doMount();

      const cancelButton = wrapper.findAllComponents(KdsButton)[0];
      expect(cancelButton.props("label")).toBe("Skip");
    });

    it("shows countdown in cancel button label when autoCancelAfter is set", () => {
      const { wrapper } = doMount({
        props: { autoCancelAfter: 10 },
      });

      const cancelButton = wrapper.findAllComponents(KdsButton)[0];
      expect(cancelButton.props("label")).toBe("Skip (10)");
    });

    it("decrements countdown every second", async () => {
      const { wrapper } = doMount({
        props: { autoCancelAfter: 10 },
      });

      const cancelButton = wrapper.findAllComponents(KdsButton)[0];
      expect(cancelButton.props("label")).toBe("Skip (10)");

      vi.advanceTimersByTime(1000);
      await nextTick();
      expect(cancelButton.props("label")).toBe("Skip (9)");

      vi.advanceTimersByTime(3000);
      await nextTick();
      expect(cancelButton.props("label")).toBe("Skip (6)");
    });

    it("emits cancel when timer reaches zero", async () => {
      const { wrapper } = doMount({
        props: { autoCancelAfter: 3 },
      });

      expect(wrapper.emitted("cancel")).toBeUndefined();

      vi.advanceTimersByTime(3000);
      await nextTick();

      expect(wrapper.emitted("cancel")).toHaveLength(1);
      expect(wrapper.emitted("cancel")![0]).toEqual([
        { isCheckboxChecked: false },
      ]);
    });

    it("emits cancel with isCheckboxChecked: true on timeout if checkbox is checked", async () => {
      const { wrapper } = doMount({
        props: {
          autoCancelAfter: 3,
          checkboxLabel: "Remember this",
        },
      });

      const checkbox = wrapper.findComponent(KdsCheckbox);
      await checkbox.setValue(true);

      vi.advanceTimersByTime(3000);
      await nextTick();

      expect(wrapper.emitted("cancel")![0]).toEqual([
        { isCheckboxChecked: true },
      ]);
    });

    it("stops timer when confirm button is clicked", async () => {
      const { wrapper } = doMount({
        props: { autoCancelAfter: 10 },
      });

      const confirmButton = wrapper.findAllComponents(KdsButton)[1];
      await confirmButton.trigger("click");

      vi.advanceTimersByTime(10000);
      await nextTick();

      // Should only have the confirm emit, no cancel from timer
      expect(wrapper.emitted("confirm")).toHaveLength(1);
      expect(wrapper.emitted("cancel")).toBeUndefined();
    });

    it("stops timer when cancel button is clicked", async () => {
      const { wrapper } = doMount({
        props: { autoCancelAfter: 10 },
      });

      const cancelButton = wrapper.findAllComponents(KdsButton)[0];
      await cancelButton.trigger("click");

      vi.advanceTimersByTime(10000);
      await nextTick();

      // Should only have one cancel emit from button click, not two
      expect(wrapper.emitted("cancel")).toHaveLength(1);
    });

    it("removes countdown from label after timer completes", async () => {
      const { wrapper } = doMount({
        props: { autoCancelAfter: 2 },
      });

      vi.advanceTimersByTime(2000);
      await nextTick();

      const cancelButton = wrapper.findAllComponents(KdsButton)[0];
      expect(cancelButton.props("label")).toBe("Skip");
    });
  });

  describe("unmount behavior", () => {
    it("emits cancel when unmounted without user action", () => {
      const { wrapper } = doMount();

      expect(wrapper.emitted("cancel")).toBeUndefined();

      wrapper.unmount();

      expect(wrapper.emitted("cancel")).toHaveLength(1);
      expect(wrapper.emitted("cancel")![0]).toEqual([
        { isCheckboxChecked: false },
      ]);
    });

    it("emits cancel with isCheckboxChecked: true on unmount if checkbox was checked", async () => {
      const { wrapper } = doMount({
        props: { checkboxLabel: "Remember this" },
      });

      const checkbox = wrapper.findComponent(KdsCheckbox);
      await checkbox.setValue(true);

      wrapper.unmount();

      expect(wrapper.emitted("cancel")![0]).toEqual([
        { isCheckboxChecked: true },
      ]);
    });

    it("does not emit cancel on unmount if user already clicked confirm", async () => {
      const { wrapper } = doMount();

      const confirmButton = wrapper.findAllComponents(KdsButton)[1];
      await confirmButton.trigger("click");

      expect(wrapper.emitted("confirm")).toHaveLength(1);
      expect(wrapper.emitted("cancel")).toBeUndefined();

      wrapper.unmount();

      // Should still have no cancel emits
      expect(wrapper.emitted("cancel")).toBeUndefined();
    });

    it("does not emit cancel on unmount if user already clicked cancel", async () => {
      const { wrapper } = doMount();

      const cancelButton = wrapper.findAllComponents(KdsButton)[0];
      await cancelButton.trigger("click");

      expect(wrapper.emitted("cancel")).toHaveLength(1);

      // Keep reference to emitted events before unmount
      const emittedCancel = wrapper.emitted("cancel");

      wrapper.unmount();

      // Should still have only one cancel emit
      expect(emittedCancel).toHaveLength(1);
    });

    it("does not emit cancel on unmount if timer already auto-cancelled", async () => {
      const { wrapper } = doMount({
        props: { autoCancelAfter: 2 },
      });

      vi.advanceTimersByTime(2000);
      await nextTick();

      expect(wrapper.emitted("cancel")).toHaveLength(1);

      // Keep reference to emitted events before unmount
      const emittedCancel = wrapper.emitted("cancel");

      wrapper.unmount();

      // Should still have only one cancel emit from the timer
      expect(emittedCancel).toHaveLength(1);
    });
  });
});
