import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import {
  KaiInquiry,
  type KaiInquiry as KaiInquiryType,
} from "@/api/gateway-api/generated-api";
import { createKaiInquiry } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import InquiryCard from "../InquiryCard.vue";
import KaiInquiryCard from "../KaiInquiryCard.vue";

describe("KaiInquiryCard", () => {
  type ComponentProps = InstanceType<typeof KaiInquiryCard>["$props"];

  const permissionInquiry = createKaiInquiry({
    description: "K-AI wants to sample data from your workflow.",
    metadata: { actionId: "sampleData" },
  });

  const confirmationInquiry = createKaiInquiry({
    inquiryId: "inq-2",
    inquiryType: KaiInquiry.InquiryTypeEnum.Confirmation,
    title: "Continue?",
    description: "K-AI wants to proceed with this step.",
    options: [
      { id: "cancel", label: "Cancel", style: "secondary" },
      { id: "confirm", label: "Confirm", style: "primary" },
    ],
    metadata: undefined,
  });

  const defaultProps: ComponentProps = {
    inquiry: permissionInquiry,
    chainType: "qa",
  };

  const doMount = ({ props }: { props?: Partial<ComponentProps> } = {}) => {
    const mockedStores = mockStores();
    const wrapper = mount(KaiInquiryCard, {
      props: { ...defaultProps, ...props },
      global: { plugins: [mockedStores.testingPinia] },
    });
    return { wrapper, mockedStores };
  };

  describe("rendering", () => {
    it("renders an InquiryCard with title, description, and options from the inquiry", () => {
      const { wrapper } = doMount();

      const card = wrapper.findComponent(InquiryCard);
      expect(card.exists()).toBe(true);
      expect(card.props("title")).toBe("Allow data sampling?");
      expect(card.props("description")).toBe(
        "K-AI wants to sample data from your workflow.",
      );
      expect(card.props("options")).toEqual(permissionInquiry.options);
    });

    it("passes timeoutSeconds and defaultOptionId to InquiryCard", () => {
      const inquiryWithTimeout: KaiInquiryType = {
        ...permissionInquiry,
        timeoutSeconds: 30,
        defaultOptionId: "deny",
      };

      const { wrapper } = doMount({
        props: { inquiry: inquiryWithTimeout },
      });

      const card = wrapper.findComponent(InquiryCard);
      expect(card.props("autoSelectAfter")).toBe(30);
      expect(card.props("defaultOptionId")).toBe("deny");
    });

    it("renders the 'Remember choice' checkbox for permission inquiries", () => {
      const { wrapper } = doMount();

      const card = wrapper.findComponent(InquiryCard);
      expect(card.props("checkbox")).toEqual({
        label: "Remember choice",
        subText: "This will be saved for current workflow",
      });
    });

    it("does not render a checkbox for confirmation inquiries", () => {
      const { wrapper } = doMount({
        props: { inquiry: confirmationInquiry },
      });

      const card = wrapper.findComponent(InquiryCard);
      expect(card.props("checkbox")).toBeUndefined();
    });
  });

  describe("responding", () => {
    it("calls respondToInquiry without saving or suffix when checkbox is unchecked", async () => {
      const { wrapper, mockedStores } = doMount();

      await wrapper.findComponent(InquiryCard).vm.$emit("respond", {
        optionId: "allow",
        isCheckboxChecked: false,
      });

      expect(
        mockedStores.aiSettingsStore.setPermissionForActionForActiveProject,
      ).not.toHaveBeenCalled();
      expect(
        mockedStores.aiAssistantStore.respondToInquiry,
      ).toHaveBeenCalledWith({
        chainType: "qa",
        selectedOptionId: "allow",
      });
    });

    it("persists permission and passes suffix 'Saved' when checkbox is checked on a permission inquiry with actionId", async () => {
      const { wrapper, mockedStores } = doMount();

      await wrapper.findComponent(InquiryCard).vm.$emit("respond", {
        optionId: "allow",
        isCheckboxChecked: true,
      });

      expect(
        mockedStores.aiSettingsStore.setPermissionForActionForActiveProject,
      ).toHaveBeenCalledWith("sampleData", "allow");
      expect(
        mockedStores.aiAssistantStore.respondToInquiry,
      ).toHaveBeenCalledWith({
        chainType: "qa",
        selectedOptionId: "allow",
        suffix: "Saved",
      });
    });

    it("does not persist permission for confirmation inquiries even if checkbox were somehow checked", async () => {
      const { wrapper, mockedStores } = doMount({
        props: { inquiry: confirmationInquiry },
      });

      await wrapper.findComponent(InquiryCard).vm.$emit("respond", {
        optionId: "confirm",
        isCheckboxChecked: true,
      });

      expect(
        mockedStores.aiSettingsStore.setPermissionForActionForActiveProject,
      ).not.toHaveBeenCalled();
      expect(
        mockedStores.aiAssistantStore.respondToInquiry,
      ).toHaveBeenCalledWith({
        chainType: "qa",
        selectedOptionId: "confirm",
      });
    });

    it("does not persist permission when permission inquiry has no actionId in metadata", async () => {
      const inquiryWithoutActionId: KaiInquiryType = {
        ...permissionInquiry,
        metadata: {},
      };

      const { wrapper, mockedStores } = doMount({
        props: { inquiry: inquiryWithoutActionId },
      });

      await wrapper.findComponent(InquiryCard).vm.$emit("respond", {
        optionId: "allow",
        isCheckboxChecked: true,
      });

      expect(
        mockedStores.aiSettingsStore.setPermissionForActionForActiveProject,
      ).not.toHaveBeenCalled();
    });

    it("passes the chainType to respondToInquiry", async () => {
      const { wrapper, mockedStores } = doMount({
        props: { chainType: "build" },
      });

      await wrapper.findComponent(InquiryCard).vm.$emit("respond", {
        optionId: "allow",
        isCheckboxChecked: false,
      });

      expect(
        mockedStores.aiAssistantStore.respondToInquiry,
      ).toHaveBeenCalledWith(expect.objectContaining({ chainType: "build" }));
    });
  });
});
