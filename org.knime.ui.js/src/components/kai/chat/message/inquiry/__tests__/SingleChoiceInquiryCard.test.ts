import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import {
  KdsButton,
  KdsRadioButtonGroup,
  KdsTextInput,
} from "@knime/kds-components";

import { KaiInquiry } from "@/api/gateway-api/generated-api";
import { FREEFORM_OPTION_ID } from "@/store/ai/constants";
import { createKaiInquiry } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import SingleChoiceInquiryCard from "../SingleChoiceInquiryCard.vue";

type ComponentProps = InstanceType<typeof SingleChoiceInquiryCard>["$props"];

const OPTIONS = [
  { id: "opt-a", label: "Option A" },
  { id: "opt-b", label: "Option B" },
  { id: "opt-c", label: "Option C" },
  { id: FREEFORM_OPTION_ID, label: "Type your own answer" },
];

const createInquiry = (
  overrides: Partial<Parameters<typeof createKaiInquiry>[0]> = {},
) =>
  createKaiInquiry({
    inquiryType: KaiInquiry.InquiryTypeEnum.SingleChoice,
    title: "What would you like to do?",
    description: "Pick a direction for the workflow.",
    options: OPTIONS,
    timeoutSeconds: 0,
    metadata: {},
    ...overrides,
  });

describe("SingleChoiceInquiryCard", () => {
  const doMount = (inquiry = createInquiry()) => {
    const mockedStores = mockStores();
    const wrapper = mount(SingleChoiceInquiryCard, {
      props: { inquiry, chainType: "build" } satisfies ComponentProps,
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

  it("renders title and description from the inquiry", () => {
    const { wrapper } = doMount();

    expect(wrapper.find(".header").text()).toBe("What would you like to do?");
    expect(wrapper.find(".description").text()).toBe(
      "Pick a direction for the workflow.",
    );
  });

  it("renders Skip and Confirm buttons", () => {
    const { wrapper } = doMount();

    const buttons = wrapper.findAllComponents(KdsButton);
    expect(buttons).toHaveLength(2);
    expect(buttons[0].props("label")).toBe("Skip");
    expect(buttons[0].props("variant")).toBe("transparent");
    expect(buttons[1].props("label")).toBe("Confirm");
    expect(buttons[1].props("variant")).toBe("filled");
  });

  it("renders a radio group with all options including freeform", () => {
    const { wrapper } = doMount();

    const radioGroup = wrapper.findComponent(KdsRadioButtonGroup);
    expect(radioGroup.exists()).toBe(true);

    const values = radioGroup.props("possibleValues") as Array<{
      id: string;
      text: string;
    }>;
    expect(values).toHaveLength(4);
    expect(values[0]).toMatchObject({ id: "opt-a", text: "Option A" });
    expect(values[3]).toMatchObject({
      id: FREEFORM_OPTION_ID,
      text: "Type your own answer",
    });
  });

  it("pre-selects defaultOptionId when it exists", () => {
    const { wrapper } = doMount(createInquiry({ defaultOptionId: "opt-b" }));

    expect(wrapper.findComponent(KdsRadioButtonGroup).props("modelValue")).toBe(
      "opt-b",
    );
  });

  it("falls back to the first option when defaultOptionId is missing", () => {
    const { wrapper } = doMount(createInquiry({ defaultOptionId: "missing" }));

    expect(wrapper.findComponent(KdsRadioButtonGroup).props("modelValue")).toBe(
      "opt-a",
    );
  });

  it("does not render freeform input field by default", () => {
    const { wrapper } = doMount();

    expect(wrapper.findComponent(KdsTextInput).exists()).toBe(false);
  });

  it("sends empty selectedOptionIds and null freeformInput on Skip click", async () => {
    const { wrapper, mockedStores } = doMount();

    await wrapper.findAllComponents(KdsButton)[0].trigger("click");

    expect(mockedStores.aiAssistantStore.respondToInquiry).toHaveBeenCalledWith(
      {
        chainType: "build",
        selectedOptionIds: [],
        freeformInput: null,
        suffix: undefined,
      },
    );
  });

  it("only responds once even if Skip and Confirm are both clicked", async () => {
    const { wrapper, mockedStores } = doMount();

    const buttons = wrapper.findAllComponents(KdsButton);
    await buttons[0].trigger("click");
    await buttons[1].trigger("click");

    expect(
      mockedStores.aiAssistantStore.respondToInquiry,
    ).toHaveBeenCalledOnce();
  });

  it("confirms the selected radio option", async () => {
    const { wrapper, mockedStores } = doMount();

    const radioGroup = wrapper.findComponent(KdsRadioButtonGroup);
    await radioGroup.vm.$emit("update:modelValue", "opt-b");

    await wrapper.findAllComponents(KdsButton)[1].trigger("click");

    expect(mockedStores.aiAssistantStore.respondToInquiry).toHaveBeenCalledWith(
      {
        chainType: "build",
        selectedOptionIds: ["opt-b"],
        freeformInput: null,
      },
    );
  });

  it("submits the freeform sentinel and text", async () => {
    const { wrapper, mockedStores } = doMount();

    await wrapper
      .findComponent(KdsRadioButtonGroup)
      .vm.$emit("update:modelValue", FREEFORM_OPTION_ID);
    await wrapper
      .findComponent(KdsTextInput)
      .vm.$emit("update:model-value", "typed text");
    await wrapper.findAllComponents(KdsButton)[1].trigger("click");

    expect(mockedStores.aiAssistantStore.respondToInquiry).toHaveBeenCalledWith(
      {
        chainType: "build",
        selectedOptionIds: [FREEFORM_OPTION_ID],
        freeformInput: "typed text",
      },
    );
  });

  it("shows the freeform input when the freeform radio option is selected", async () => {
    const { wrapper } = doMount();

    await wrapper
      .findComponent(KdsRadioButtonGroup)
      .vm.$emit("update:modelValue", FREEFORM_OPTION_ID);

    expect(wrapper.findComponent(KdsTextInput).exists()).toBe(true);
  });

  it("does not submit when confirm is clicked with freeform selected but no text", async () => {
    const { wrapper, mockedStores } = doMount();

    await wrapper
      .findComponent(KdsRadioButtonGroup)
      .vm.$emit("update:modelValue", FREEFORM_OPTION_ID);
    await wrapper.findAllComponents(KdsButton)[1].trigger("click");

    expect(
      mockedStores.aiAssistantStore.respondToInquiry,
    ).not.toHaveBeenCalled();
  });

  it("disables confirm when freeform is selected but empty", async () => {
    const { wrapper } = doMount();

    await wrapper
      .findComponent(KdsRadioButtonGroup)
      .vm.$emit("update:modelValue", FREEFORM_OPTION_ID);

    expect(wrapper.findAllComponents(KdsButton)[1].props("disabled")).toBe(
      true,
    );
  });

  it("auto-skips with 'Timed out' suffix when timer expires", async () => {
    const { mockedStores } = doMount(createInquiry({ timeoutSeconds: 3 }));

    vi.advanceTimersByTime(3000);
    await nextTick();

    expect(mockedStores.aiAssistantStore.respondToInquiry).toHaveBeenCalledWith(
      {
        chainType: "build",
        selectedOptionIds: [],
        freeformInput: null,
        suffix: "Timed out",
      },
    );
  });

  it("shows countdown on Skip button in the final 15 seconds", async () => {
    const { wrapper } = doMount(createInquiry({ timeoutSeconds: 60 }));

    const skipButton = wrapper.findAllComponents(KdsButton)[0];
    expect(skipButton.props("label")).toBe("Skip");

    vi.advanceTimersByTime(45000);
    await nextTick();

    expect(skipButton.props("label")).toBe("Skip (15)");
  });

  it("stops timer after user interaction", async () => {
    const { wrapper, mockedStores } = doMount(
      createInquiry({ timeoutSeconds: 10 }),
    );

    await wrapper.findAllComponents(KdsButton)[0].trigger("click");

    vi.advanceTimersByTime(10000);
    await nextTick();

    expect(
      mockedStores.aiAssistantStore.respondToInquiry,
    ).toHaveBeenCalledOnce();
  });

  it("skips on unmount if not yet resolved", () => {
    const { wrapper, mockedStores } = doMount();

    wrapper.unmount();

    expect(mockedStores.aiAssistantStore.respondToInquiry).toHaveBeenCalledWith(
      {
        chainType: "build",
        selectedOptionIds: [],
        freeformInput: null,
        suffix: undefined,
      },
    );
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
