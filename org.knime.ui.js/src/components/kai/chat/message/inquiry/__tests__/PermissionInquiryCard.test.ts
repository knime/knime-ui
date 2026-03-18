import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import { KdsButton, KdsCheckbox } from "@knime/kds-components";

import { KaiInquiry } from "@/api/gateway-api/generated-api";
import { createKaiInquiry } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import PermissionInquiryCard from "../PermissionInquiryCard.vue";

describe("PermissionInquiryCard", () => {
  type ComponentProps = InstanceType<typeof PermissionInquiryCard>["$props"];

  const permissionInquiry = createKaiInquiry({
    inquiryType: KaiInquiry.InquiryTypeEnum.Permission,
    title: "Allow data sampling?",
    description: "K-AI wants to sample data from your workflow.",
    metadata: { actionId: "sampleData" },
    timeoutSeconds: 0,
    defaultOptionId: "deny",
  });

  const defaultProps: ComponentProps = {
    inquiry: permissionInquiry,
    chainType: "build",
  };

  const doMount = ({ props }: { props?: Partial<ComponentProps> } = {}) => {
    const mockedStores = mockStores();
    const wrapper = mount(PermissionInquiryCard, {
      props: { ...defaultProps, ...props },
      global: { plugins: [mockedStores.testingPinia] },
    });
    return { wrapper, mockedStores };
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("rendering", () => {
    it("renders title and description from the inquiry", () => {
      const { wrapper } = doMount();

      expect(wrapper.find(".header").text()).toBe("Allow data sampling?");
      expect(wrapper.find(".description").text()).toBe(
        "K-AI wants to sample data from your workflow.",
      );
    });

    it("renders buttons for each option", () => {
      const { wrapper } = doMount();

      const buttons = wrapper.findAllComponents(KdsButton);
      expect(buttons).toHaveLength(2);
      expect(buttons[0].props("label")).toBe("Deny");
      expect(buttons[1].props("label")).toBe("Allow");
    });

    it("renders buttons with correct variants based on style", () => {
      const { wrapper } = doMount();

      const buttons = wrapper.findAllComponents(KdsButton);
      expect(buttons[0].props("variant")).toBe("transparent");
      expect(buttons[1].props("variant")).toBe("filled");
    });

    it("always renders the 'Remember choice' checkbox", () => {
      const { wrapper } = doMount();

      const checkbox = wrapper.findComponent(KdsCheckbox);
      expect(checkbox.exists()).toBe(true);
      expect(checkbox.props("label")).toBe("Remember choice");
      expect(checkbox.props("subText")).toBe(
        "This will be saved for current workflow",
      );
    });
  });

  describe("responding", () => {
    it("calls respondToInquiry when a button is clicked", async () => {
      const { wrapper, mockedStores } = doMount();

      await wrapper.findAllComponents(KdsButton)[1].trigger("click");

      expect(
        mockedStores.aiAssistantStore.respondToInquiry,
      ).toHaveBeenCalledWith({
        chainType: "build",
        selectedOptionIds: ["allow"],
        suffix: undefined,
      });
    });

    it("only responds once even if multiple buttons are clicked", async () => {
      const { wrapper, mockedStores } = doMount();

      const buttons = wrapper.findAllComponents(KdsButton);
      await buttons[0].trigger("click");
      await buttons[1].trigger("click");

      expect(
        mockedStores.aiAssistantStore.respondToInquiry,
      ).toHaveBeenCalledOnce();
    });
  });

  describe("settings persistence", () => {
    it("persists permission with suffix 'Saved' when checkbox is checked", async () => {
      const { wrapper, mockedStores } = doMount();

      await wrapper.findComponent(KdsCheckbox).setValue(true);
      await wrapper.findAllComponents(KdsButton)[1].trigger("click");

      expect(
        mockedStores.aiSettingsStore.setPermissionForActionForActiveProject,
      ).toHaveBeenCalledWith("sampleData", "allow");
      expect(
        mockedStores.aiAssistantStore.respondToInquiry,
      ).toHaveBeenCalledWith({
        chainType: "build",
        selectedOptionIds: ["allow"],
        suffix: "Saved",
      });
    });

    it("does not persist permission when checkbox is unchecked", async () => {
      const { wrapper, mockedStores } = doMount();

      await wrapper.findAllComponents(KdsButton)[1].trigger("click");

      expect(
        mockedStores.aiSettingsStore.setPermissionForActionForActiveProject,
      ).not.toHaveBeenCalled();
    });

    it("does not persist permission when inquiry has no actionId", async () => {
      const { wrapper, mockedStores } = doMount({
        props: {
          inquiry: createKaiInquiry({ metadata: {} }),
        },
      });

      await wrapper.findComponent(KdsCheckbox).setValue(true);
      await wrapper.findAllComponents(KdsButton)[1].trigger("click");

      expect(
        mockedStores.aiSettingsStore.setPermissionForActionForActiveProject,
      ).not.toHaveBeenCalled();
    });
  });

  describe("auto-select timer", () => {
    it("auto-selects the default option when timer expires", async () => {
      const { mockedStores } = doMount({
        props: {
          inquiry: createKaiInquiry({
            timeoutSeconds: 3,
            defaultOptionId: "deny",
          }),
        },
      });

      vi.advanceTimersByTime(3000);
      await nextTick();

      expect(
        mockedStores.aiAssistantStore.respondToInquiry,
      ).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ selectedOptionIds: ["deny"] }),
      );
      // Verify no further calls after timer fires
      vi.advanceTimersByTime(5000);
    });

    it("shows countdown on the default button in the final 15 seconds", async () => {
      const { wrapper } = doMount({
        props: {
          inquiry: createKaiInquiry({
            timeoutSeconds: 60,
            defaultOptionId: "deny",
          }),
        },
      });

      const denyButton = wrapper.findAllComponents(KdsButton)[0];
      expect(denyButton.props("label")).toBe("Deny");

      vi.advanceTimersByTime(45000);
      await nextTick();

      expect(denyButton.props("label")).toBe("Deny (15)");
    });

    it("falls back to first secondary option when defaultOptionId doesn't match", async () => {
      const { mockedStores } = doMount({
        props: {
          inquiry: createKaiInquiry({
            timeoutSeconds: 2,
            defaultOptionId: "nonexistent",
          }),
        },
      });

      vi.advanceTimersByTime(2000);
      await nextTick();

      expect(
        mockedStores.aiAssistantStore.respondToInquiry,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ selectedOptionIds: ["deny"] }),
      );
    });
  });

  describe("unmount behavior", () => {
    it("responds with default option on unmount if not yet resolved", () => {
      const { wrapper, mockedStores } = doMount();

      wrapper.unmount();

      expect(
        mockedStores.aiAssistantStore.respondToInquiry,
      ).toHaveBeenCalledOnce();
    });

    it("does not respond on unmount if already resolved", async () => {
      const { wrapper, mockedStores } = doMount();

      await wrapper.findAllComponents(KdsButton)[0].trigger("click");
      wrapper.unmount();

      expect(
        mockedStores.aiAssistantStore.respondToInquiry,
      ).toHaveBeenCalledOnce();
    });
  });
});
