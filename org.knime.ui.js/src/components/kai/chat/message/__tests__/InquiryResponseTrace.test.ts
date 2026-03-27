import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import CircleCheckIcon from "@knime/styles/img/icons/circle-check.svg";
import CircleCloseIcon from "@knime/styles/img/icons/circle-close.svg";
import CircleInfoIcon from "@knime/styles/img/icons/circle-info.svg";

import { KaiInquiry, KaiInquiryOption } from "@/api/gateway-api/generated-api";
import { FREEFORM_OPTION_ID } from "@/store/ai/constants";
import type { InquiryTrace } from "@/store/ai/types";
import InquiryResponseTrace from "../InquiryResponseTrace.vue";

describe("InquiryResponseTrace", () => {
  type ComponentProps = InstanceType<typeof InquiryResponseTrace>["$props"];

  const permissionTrace: InquiryTrace = {
    inquiry: {
      inquiryId: "inq-1",
      inquiryType: KaiInquiry.InquiryTypeEnum.Permission,
      title: "Allow data sampling?",
      description: "K-AI wants to sample data.",
      options: [
        {
          id: "deny",
          label: "Deny",
          style: KaiInquiryOption.StyleEnum.Secondary,
        },
        {
          id: "allow",
          label: "Allow",
          style: KaiInquiryOption.StyleEnum.Primary,
        },
      ],
      timeoutSeconds: 60,
      defaultOptionId: "deny",
    },
    selectedOptionIds: ["allow"],
    freeformInput: null,
  };

  const choiceTrace: InquiryTrace = {
    inquiry: {
      inquiryId: "inq-2",
      inquiryType: KaiInquiry.InquiryTypeEnum.SingleChoice,
      title: "What next?",
      description: "Pick a direction.",
      options: [
        { id: "opt-a", label: "Option A" },
        { id: "opt-b", label: "Option B" },
      ],
      timeoutSeconds: 60,
      defaultOptionId: "opt-a",
    },
    selectedOptionIds: ["opt-a"],
    freeformInput: null,
  };

  const doMount = ({ props }: { props?: Partial<ComponentProps> } = {}) => {
    const wrapper = mount(InquiryResponseTrace, {
      props: { trace: permissionTrace, ...props },
    });
    return { wrapper };
  };

  describe("icon", () => {
    it("shows CircleInfoIcon for choice inquiries", () => {
      const { wrapper } = doMount({ props: { trace: choiceTrace } });

      expect(wrapper.findComponent(CircleInfoIcon).exists()).toBe(true);
      expect(wrapper.findComponent(CircleCheckIcon).exists()).toBe(false);
      expect(wrapper.findComponent(CircleCloseIcon).exists()).toBe(false);
    });

    it("shows CircleCheckIcon when the selected permission option is primary", () => {
      const { wrapper } = doMount();

      expect(wrapper.findComponent(CircleCheckIcon).exists()).toBe(true);
      expect(wrapper.findComponent(CircleCloseIcon).exists()).toBe(false);
    });

    it("shows CircleCloseIcon when the selected permission option is secondary", () => {
      const { wrapper } = doMount({
        props: {
          trace: { ...permissionTrace, selectedOptionIds: ["deny"] },
        },
      });

      expect(wrapper.findComponent(CircleCloseIcon).exists()).toBe(true);
      expect(wrapper.findComponent(CircleCheckIcon).exists()).toBe(false);
    });

    it("shows CircleCloseIcon when no option is selected (skipped)", () => {
      const { wrapper } = doMount({
        props: {
          trace: {
            ...permissionTrace,
            selectedOptionIds: [],
            freeformInput: null,
          },
        },
      });

      expect(wrapper.findComponent(CircleCloseIcon).exists()).toBe(true);
    });
  });

  describe("content", () => {
    it("renders the inquiry title", () => {
      const { wrapper } = doMount();

      expect(wrapper.find(".title").text()).toBe("Allow data sampling?");
    });

    it("renders the selected option's label", () => {
      const { wrapper } = doMount();

      expect(wrapper.find(".option-label").text()).toBe("Allow");
    });

    it("falls back to the selected option id when the option is not found", () => {
      const { wrapper } = doMount({
        props: {
          trace: {
            ...permissionTrace,
            selectedOptionIds: ["unknown-id"],
          },
        },
      });

      expect(wrapper.find(".option-label").text()).toBe("unknown-id");
    });

    it("appends the suffix in parentheses", () => {
      const { wrapper } = doMount({
        props: {
          trace: { ...permissionTrace, suffix: "Saved" },
        },
      });

      expect(wrapper.find(".option-label").text()).toBe("Allow (Saved)");
    });

    it("does not append parentheses when suffix is absent", () => {
      const { wrapper } = doMount();

      expect(wrapper.find(".option-label").text()).toBe("Allow");
    });
  });

  describe("skipped", () => {
    it("renders 'Skipped' when neither options nor freeform are provided", () => {
      const { wrapper } = doMount({
        props: {
          trace: {
            ...choiceTrace,
            selectedOptionIds: [],
            freeformInput: null,
          },
        },
      });

      expect(wrapper.find(".option-label").text()).toBe("Skipped");
    });

    it("renders 'Skipped (Timed out)' when suffix is provided", () => {
      const { wrapper } = doMount({
        props: {
          trace: {
            ...choiceTrace,
            selectedOptionIds: [],
            freeformInput: null,
            suffix: "Timed out",
          },
        },
      });

      expect(wrapper.find(".option-label").text()).toBe("Skipped (Timed out)");
    });
  });

  describe("freeform response", () => {
    it("renders the freeform response text when provided", () => {
      const { wrapper } = doMount({
        props: {
          trace: {
            ...choiceTrace,
            selectedOptionIds: [FREEFORM_OPTION_ID],
            freeformInput: "I want something else entirely",
          },
        },
      });

      expect(wrapper.find(".option-label").text()).toBe(
        "I want something else entirely",
      );
    });

    it("is not considered skipped when freeform input is present", () => {
      const { wrapper } = doMount({
        props: {
          trace: {
            ...choiceTrace,
            selectedOptionIds: [FREEFORM_OPTION_ID],
            freeformInput: "My idea",
          },
        },
      });

      // Should not say "Skipped"
      expect(wrapper.find(".option-label").text()).not.toContain("Skipped");
    });

    it("renders multiple selected options on separate lines", () => {
      const { wrapper } = doMount({
        props: {
          trace: {
            ...choiceTrace,
            inquiry: {
              ...choiceTrace.inquiry,
              inquiryType: KaiInquiry.InquiryTypeEnum.MultipleChoice,
              options: [
                { id: "opt-a", label: "Option A" },
                { id: "opt-b", label: "Option B" },
                { id: "opt-c", label: "Option C" },
              ],
            },
            selectedOptionIds: ["opt-a", "opt-c"],
          },
        },
      });

      const optionLines = wrapper.find(".option-label").findAll("span");
      expect(optionLines).toHaveLength(2);
      expect(optionLines[0].text()).toBe("Option A");
      expect(optionLines[1].text()).toBe("Option C");
    });

    it("renders selected options together with freeform input", () => {
      const { wrapper } = doMount({
        props: {
          trace: {
            ...choiceTrace,
            selectedOptionIds: ["opt-a", FREEFORM_OPTION_ID],
            freeformInput: "extra",
          },
        },
      });

      const optionLines = wrapper.find(".option-label").findAll("span");
      expect(optionLines).toHaveLength(2);
      expect(optionLines[0].text()).toBe("Option A");
      expect(optionLines[1].text()).toBe("+ extra");
    });

    it("shows CircleInfoIcon for multipleChoice inquiries", () => {
      const { wrapper } = doMount({
        props: {
          trace: {
            ...choiceTrace,
            inquiry: {
              ...choiceTrace.inquiry,
              inquiryType: KaiInquiry.InquiryTypeEnum.MultipleChoice,
            },
            selectedOptionIds: ["opt-a", "opt-b"],
          },
        },
      });

      expect(wrapper.findComponent(CircleInfoIcon).exists()).toBe(true);
      expect(wrapper.findComponent(CircleCheckIcon).exists()).toBe(false);
      expect(wrapper.findComponent(CircleCloseIcon).exists()).toBe(false);
    });
  });
});
