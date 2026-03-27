import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import {
  KdsButton,
  KdsCheckboxGroup,
  KdsTextInput,
} from "@knime/kds-components";

import { KaiInquiry } from "@/api/gateway-api/generated-api";
import { FREEFORM_OPTION_ID } from "@/store/ai/constants";
import { createKaiInquiry } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import MultiChoiceInquiryCard from "../MultiChoiceInquiryCard.vue";

type ComponentProps = InstanceType<typeof MultiChoiceInquiryCard>["$props"];

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
    inquiryType: KaiInquiry.InquiryTypeEnum.MultipleChoice,
    title: "What would you like to do?",
    description: "Pick one or more directions for the workflow.",
    options: OPTIONS,
    timeoutSeconds: 0,
    metadata: {},
    ...overrides,
  });

describe("MultiChoiceInquiryCard", () => {
  const doMount = (inquiry = createInquiry()) => {
    const mockedStores = mockStores();
    const wrapper = mount(MultiChoiceInquiryCard, {
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
      "Pick one or more directions for the workflow.",
    );
  });

  it("renders a checkbox group with all options including freeform", () => {
    const { wrapper } = doMount();

    const checkboxGroup = wrapper.findComponent(KdsCheckboxGroup);
    expect(checkboxGroup.exists()).toBe(true);

    const values = checkboxGroup.props("possibleValues") as Array<{
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

  it("starts with no selections", () => {
    const { wrapper } = doMount();

    expect(wrapper.findComponent(KdsCheckboxGroup).props("modelValue")).toEqual(
      [],
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

  it("submits multiple selected options", async () => {
    const { wrapper, mockedStores } = doMount();

    const checkboxGroup = wrapper.findComponent(KdsCheckboxGroup);
    await checkboxGroup.vm.$emit("update:modelValue", ["opt-a", "opt-c"]);
    await wrapper.findAllComponents(KdsButton)[1].trigger("click");

    expect(mockedStores.aiAssistantStore.respondToInquiry).toHaveBeenCalledWith(
      {
        chainType: "build",
        selectedOptionIds: ["opt-a", "opt-c"],
        freeformInput: null,
      },
    );
  });

  it("submits regular selections together with freeform", async () => {
    const { wrapper, mockedStores } = doMount();

    const checkboxGroup = wrapper.findComponent(KdsCheckboxGroup);
    await checkboxGroup.vm.$emit("update:modelValue", [
      "opt-a",
      FREEFORM_OPTION_ID,
    ]);
    await wrapper
      .findComponent(KdsTextInput)
      .vm.$emit("update:model-value", "extra context");
    await wrapper.findAllComponents(KdsButton)[1].trigger("click");

    expect(mockedStores.aiAssistantStore.respondToInquiry).toHaveBeenCalledWith(
      {
        chainType: "build",
        selectedOptionIds: ["opt-a", FREEFORM_OPTION_ID],
        freeformInput: "extra context",
      },
    );
  });

  it("preserves the freeform draft when toggled off and on again", async () => {
    const { wrapper } = doMount();

    const checkboxGroup = wrapper.findComponent(KdsCheckboxGroup);
    await checkboxGroup.vm.$emit("update:modelValue", [FREEFORM_OPTION_ID]);
    await wrapper
      .findComponent(KdsTextInput)
      .vm.$emit("update:model-value", "keep me");
    await checkboxGroup.vm.$emit("update:modelValue", []);
    await nextTick();
    await checkboxGroup.vm.$emit("update:modelValue", [FREEFORM_OPTION_ID]);
    await nextTick();

    const freeformInput = wrapper.find("input[aria-label='Freeform response']");
    expect(freeformInput.exists()).toBe(true);
    expect((freeformInput.element as HTMLInputElement).value).toBe("keep me");
  });

  it("does not submit when confirm is clicked without any selection", async () => {
    const { wrapper, mockedStores } = doMount();

    await wrapper.findAllComponents(KdsButton)[1].trigger("click");

    expect(
      mockedStores.aiAssistantStore.respondToInquiry,
    ).not.toHaveBeenCalled();
  });

  it("does not submit when freeform is selected but empty", async () => {
    const { wrapper, mockedStores } = doMount();

    await wrapper
      .findComponent(KdsCheckboxGroup)
      .vm.$emit("update:modelValue", [FREEFORM_OPTION_ID]);
    await wrapper.findAllComponents(KdsButton)[1].trigger("click");

    expect(
      mockedStores.aiAssistantStore.respondToInquiry,
    ).not.toHaveBeenCalled();
  });

  it("disables confirm when there is no valid selection", () => {
    const { wrapper } = doMount();

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

  it("enter keypress confirms checked options", async () => {
    const { wrapper, mockedStores } = doMount();

    await wrapper
      .findComponent(KdsCheckboxGroup)
      .vm.$emit("update:modelValue", ["opt-a", "opt-c"]);
    await wrapper.find(".card-container").trigger("keydown", { key: "Enter" });

    expect(mockedStores.aiAssistantStore.respondToInquiry).toHaveBeenCalledWith(
      expect.objectContaining({ selectedOptionIds: ["opt-a", "opt-c"] }),
    );
  });

  it("enter keypress does not confirm when freeform is checked", async () => {
    const { wrapper, mockedStores } = doMount();

    await wrapper
      .findComponent(KdsCheckboxGroup)
      .vm.$emit("update:modelValue", [FREEFORM_OPTION_ID]);
    await wrapper.find(".card-container").trigger("keydown", { key: "Enter" });

    expect(
      mockedStores.aiAssistantStore.respondToInquiry,
    ).not.toHaveBeenCalled();
  });

  it("escape keypress skips", async () => {
    const { wrapper, mockedStores } = doMount();

    await wrapper.find(".card-container").trigger("keydown", { key: "Escape" });

    expect(mockedStores.aiAssistantStore.respondToInquiry).toHaveBeenCalledWith(
      expect.objectContaining({ selectedOptionIds: [] }),
    );
  });
});
