import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import CircleCheckIcon from "@knime/styles/img/icons/circle-check.svg";
import CircleCloseIcon from "@knime/styles/img/icons/circle-close.svg";

import type { InquiryTrace } from "@/store/ai/types";
import InquiryResponseTrace from "../InquiryResponseTrace.vue";

describe("InquiryResponseTrace", () => {
  type ComponentProps = InstanceType<typeof InquiryResponseTrace>["$props"];

  const baseTrace: InquiryTrace = {
    inquiry: {
      inquiryId: "inq-1",
      inquiryType: "permission",
      title: "Allow data sampling?",
      description: "K-AI wants to sample data.",
      options: [
        { id: "deny", label: "Deny", style: "secondary" },
        { id: "allow", label: "Allow", style: "primary" },
      ],
    },
    selectedOptionId: "allow",
  };

  const doMount = ({ props }: { props?: Partial<ComponentProps> } = {}) => {
    const wrapper = mount(InquiryResponseTrace, {
      props: { trace: baseTrace, ...props },
    });
    return { wrapper };
  };

  describe("icon", () => {
    it("shows CircleCheckIcon when the selected option has primary style", () => {
      const { wrapper } = doMount();

      expect(wrapper.findComponent(CircleCheckIcon).exists()).toBe(true);
      expect(wrapper.findComponent(CircleCloseIcon).exists()).toBe(false);
    });

    it("shows CircleCloseIcon when the selected option has secondary style", () => {
      const { wrapper } = doMount({
        props: { trace: { ...baseTrace, selectedOptionId: "deny" } },
      });

      expect(wrapper.findComponent(CircleCloseIcon).exists()).toBe(true);
      expect(wrapper.findComponent(CircleCheckIcon).exists()).toBe(false);
    });

    it("shows CircleCloseIcon when the selected option is not found in options list", () => {
      const { wrapper } = doMount({
        props: { trace: { ...baseTrace, selectedOptionId: "unknown" } },
      });

      expect(wrapper.findComponent(CircleCloseIcon).exists()).toBe(true);
      expect(wrapper.findComponent(CircleCheckIcon).exists()).toBe(false);
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

    it("falls back to the selectedOptionId when the option is not found in the options list", () => {
      const { wrapper } = doMount({
        props: { trace: { ...baseTrace, selectedOptionId: "unknown-id" } },
      });

      expect(wrapper.find(".option-label").text()).toBe("unknown-id");
    });

    it("appends the suffix in parentheses when provided", () => {
      const { wrapper } = doMount({
        props: { trace: { ...baseTrace, suffix: "Saved" } },
      });

      expect(wrapper.find(".option-label").text()).toBe("Allow (Saved)");
    });

    it("appends 'Auto' suffix correctly", () => {
      const { wrapper } = doMount({
        props: {
          trace: { ...baseTrace, selectedOptionId: "deny", suffix: "Auto" },
        },
      });

      expect(wrapper.find(".option-label").text()).toBe("Deny (Auto)");
    });

    it("does not append parentheses when suffix is absent", () => {
      const { wrapper } = doMount();

      expect(wrapper.find(".option-label").text()).toBe("Allow");
    });
  });
});
