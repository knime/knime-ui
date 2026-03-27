import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import { KaiInquiry } from "@/api/gateway-api/generated-api";
import { createKaiInquiry } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import KaiInquiryCard from "../KaiInquiryCard.vue";
import MultiChoiceInquiryCard from "../MultiChoiceInquiryCard.vue";
import PermissionInquiryCard from "../PermissionInquiryCard.vue";
import SingleChoiceInquiryCard from "../SingleChoiceInquiryCard.vue";

describe("KaiInquiryCard", () => {
  type ComponentProps = InstanceType<typeof KaiInquiryCard>["$props"];

  const doMount = ({ props }: { props?: Partial<ComponentProps> } = {}) => {
    const mockedStores = mockStores();
    const wrapper = mount(KaiInquiryCard, {
      props: {
        inquiry: createKaiInquiry(),
        chainType: "build",
        ...props,
      },
      global: { plugins: [mockedStores.testingPinia] },
    });
    return { wrapper };
  };

  it("renders PermissionInquiryCard for permission inquiries", () => {
    const { wrapper } = doMount({
      props: {
        inquiry: createKaiInquiry({
          inquiryType: KaiInquiry.InquiryTypeEnum.Permission,
        }),
      },
    });

    expect(wrapper.findComponent(PermissionInquiryCard).exists()).toBe(true);
    expect(wrapper.findComponent(SingleChoiceInquiryCard).exists()).toBe(false);
    expect(wrapper.findComponent(MultiChoiceInquiryCard).exists()).toBe(false);
  });

  it("renders SingleChoiceInquiryCard for singleChoice inquiries", () => {
    const { wrapper } = doMount({
      props: {
        inquiry: createKaiInquiry({
          inquiryType: KaiInquiry.InquiryTypeEnum.SingleChoice,
        }),
      },
    });

    expect(wrapper.findComponent(SingleChoiceInquiryCard).exists()).toBe(true);
    expect(wrapper.findComponent(MultiChoiceInquiryCard).exists()).toBe(false);
    expect(wrapper.findComponent(PermissionInquiryCard).exists()).toBe(false);
  });

  it("renders MultiChoiceInquiryCard for multipleChoice inquiries", () => {
    const { wrapper } = doMount({
      props: {
        inquiry: createKaiInquiry({
          inquiryType: KaiInquiry.InquiryTypeEnum.MultipleChoice,
        }),
      },
    });

    expect(wrapper.findComponent(MultiChoiceInquiryCard).exists()).toBe(true);
    expect(wrapper.findComponent(SingleChoiceInquiryCard).exists()).toBe(false);
    expect(wrapper.findComponent(PermissionInquiryCard).exists()).toBe(false);
  });

  it("passes inquiry and chainType to the singleChoice child card", () => {
    const inquiry = createKaiInquiry({
      inquiryType: KaiInquiry.InquiryTypeEnum.SingleChoice,
    });

    const { wrapper } = doMount({
      props: { inquiry, chainType: "qa" },
    });

    const child = wrapper.findComponent(SingleChoiceInquiryCard);
    expect(child.props("inquiry")).toEqual(inquiry);
    expect(child.props("chainType")).toBe("qa");
  });

  it("passes inquiry and chainType to the multipleChoice child card", () => {
    const inquiry = createKaiInquiry({
      inquiryType: KaiInquiry.InquiryTypeEnum.MultipleChoice,
    });

    const { wrapper } = doMount({
      props: { inquiry, chainType: "qa" },
    });

    const child = wrapper.findComponent(MultiChoiceInquiryCard);
    expect(child.props("inquiry")).toEqual(inquiry);
    expect(child.props("chainType")).toBe("qa");
  });

  it("throws for unsupported inquiry types instead of falling back silently", () => {
    expect(() =>
      doMount({
        props: {
          inquiry: createKaiInquiry({
            inquiryType: "unexpected" as KaiInquiry.InquiryTypeEnum,
          }),
        },
      }),
    ).toThrow("Unsupported inquiry type: unexpected");
  });
});
