import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";
import { mount } from "@vue/test-utils";

import { KaiInquiry } from "@/api/gateway-api/generated-api";
import type { QuickActionMenuContext } from "@/components/workflowEditor/CanvasAnchoredComponents/QuickActionMenu/types";
import type {
  AiAssistantBuildEventPayload,
  InquiryTrace,
} from "@/store/ai/types";
import { mockStores } from "@/test/utils/mockStores";
import KaiQuickBuild from "../KaiQuickBuild.vue";
import QuickBuildInput from "../quickBuild/QuickBuildInput.vue";
import QuickBuildResult from "../quickBuild/QuickBuildResult.vue";

// Prevent useKaiPanels from pulling in the full auth/server chain
const mockPanelComponent = ref<object | null>(null);
vi.mock("@/components/kai/panels/useKaiPanels", () => ({
  useKaiPanels: vi.fn().mockImplementation(() => ({
    panelComponent: mockPanelComponent,
  })),
}));

// Control useQuickBuild state from tests via module-level refs
const mockResult = ref<AiAssistantBuildEventPayload | null>(null);
const mockIsProcessing = ref(false);
const mockErrorMessage = ref("");
const mockLastUserMessage = ref("");
const mockStatusUpdate = ref(null);
const mockPendingInquiry = ref(null);
const mockPendingInquiryTraces = ref([]);
const mockLastMessageInquiryTraces = ref<InquiryTrace[] | undefined>(undefined);
const mockSendMessage = vi.fn();
const mockAbortSendMessage = vi.fn();

vi.mock("@/components/kai/quickBuild/useQuickBuild", () => ({
  useQuickBuild: vi.fn().mockImplementation(() => ({
    result: mockResult,
    isProcessing: mockIsProcessing,
    errorMessage: mockErrorMessage,
    lastUserMessage: mockLastUserMessage,
    statusUpdate: mockStatusUpdate,
    pendingInquiry: mockPendingInquiry,
    pendingInquiryTraces: mockPendingInquiryTraces,
    lastMessageInquiryTraces: mockLastMessageInquiryTraces,
    sendMessage: mockSendMessage,
    abortSendMessage: mockAbortSendMessage,
    userQuery: ref(""),
  })),
}));

const createQuickActionContext = (
  overrides: Partial<QuickActionMenuContext> = {},
): QuickActionMenuContext => ({
  nodeId: null,
  canvasPosition: { x: 100, y: 200 },
  port: null,
  nodeRelation: null,
  updateMenuStyle: vi.fn(),
  closeMenu: vi.fn(),
  ...overrides,
});

const createBuildPayload = (
  overrides: Partial<AiAssistantBuildEventPayload> = {},
): AiAssistantBuildEventPayload => ({
  message: "Here is your workflow.",
  interactionId: "interaction-abc",
  type: "SUCCESS",
  references: undefined as never,
  workflows: undefined as never,
  components: undefined as never,
  nodes: undefined as never,
  ...overrides,
});

describe("KaiQuickBuild.vue", () => {
  const doMount = ({
    quickActionContext = createQuickActionContext(),
  }: { quickActionContext?: QuickActionMenuContext } = {}) => {
    const mockedStores = mockStores({ stubActions: true });
    mockedStores.nodeTemplatesStore.getNodeTemplates.mockResolvedValue({
      found: {},
      missing: [],
    });

    const wrapper = mount(KaiQuickBuild, {
      props: { quickActionContext },
      global: { plugins: [mockedStores.testingPinia] },
    });

    return { wrapper, mockedStores, quickActionContext };
  };

  afterEach(() => {
    vi.clearAllMocks();
    mockResult.value = null;
    mockIsProcessing.value = false;
    mockErrorMessage.value = "";
    mockPanelComponent.value = null;
    mockLastMessageInquiryTraces.value = undefined;
    mockLastUserMessage.value = "";
  });

  describe("panel gate", () => {
    it("renders the panel component and hides quick build content when a panel is active", () => {
      const FakePanel = { template: "<div class='fake-panel' />" };
      mockPanelComponent.value = FakePanel;

      const { wrapper } = doMount();

      expect(wrapper.find(".fake-panel").exists()).toBe(true);
      expect(wrapper.findComponent(QuickBuildInput).exists()).toBe(false);
      expect(wrapper.findComponent(QuickBuildResult).exists()).toBe(false);
    });

    it("renders quick build content when no panel is active", () => {
      mockPanelComponent.value = null;

      const { wrapper } = doMount();

      expect(wrapper.findComponent(QuickBuildInput).exists()).toBe(true);
    });
  });

  describe("menuState: INPUT (default)", () => {
    it("renders QuickBuildInput in the default state", () => {
      const { wrapper } = doMount();

      expect(wrapper.findComponent(QuickBuildInput).exists()).toBe(true);
      expect(wrapper.findComponent(QuickBuildResult).exists()).toBe(false);
    });

    it("passes errorMessage and lastUserMessage to QuickBuildInput", () => {
      mockErrorMessage.value = "Something failed";
      mockLastUserMessage.value = "build me a pipeline";

      const { wrapper } = doMount();
      const inputProps = wrapper.findComponent(QuickBuildInput).props();

      expect(inputProps.errorMessage).toBe("Something failed");
      expect(inputProps.lastUserMessage).toBe("build me a pipeline");
    });

    it("passes no prompt or interactionId when result is null", () => {
      const { wrapper } = doMount();
      const inputProps = wrapper.findComponent(QuickBuildInput).props();

      expect(inputProps.prompt).toBeUndefined();
      expect(inputProps.interactionId).toBeUndefined();
    });

    it("passes prompt and interactionId to QuickBuildInput when result is INPUT_NEEDED", () => {
      mockResult.value = createBuildPayload({
        type: "INPUT_NEEDED",
        message: "Please clarify",
        interactionId: "inq-456",
      });

      const { wrapper } = doMount();
      const inputProps = wrapper.findComponent(QuickBuildInput).props();

      expect(inputProps.prompt).toBe("Please clarify");
      expect(inputProps.interactionId).toBe("inq-456");
    });

    it("calls sendMessage when QuickBuildInput emits send-message", async () => {
      const { wrapper } = doMount();

      await wrapper
        .findComponent(QuickBuildInput)
        .vm.$emit("sendMessage", { message: "build a filter" });

      expect(mockSendMessage).toHaveBeenCalledWith({
        message: "build a filter",
      });
    });

    it("calls updateMenuStyle with top-right anchor when nodeRelation is null", async () => {
      const quickActionContext = createQuickActionContext({
        nodeRelation: null,
      });
      doMount({ quickActionContext });

      // Drive the watch by transitioning through PROCESSING → INPUT
      mockIsProcessing.value = true;
      await nextTick();
      mockIsProcessing.value = false;
      await nextTick();

      expect(quickActionContext.updateMenuStyle).toHaveBeenCalledWith({
        anchor: "top-right",
      });
    });

    it("calls updateMenuStyle with top-left anchor when nodeRelation is set", async () => {
      const quickActionContext = createQuickActionContext({
        nodeRelation: "SUCCESSORS",
      });
      doMount({ quickActionContext });

      mockIsProcessing.value = true;
      await nextTick();
      mockIsProcessing.value = false;
      await nextTick();

      expect(quickActionContext.updateMenuStyle).toHaveBeenCalledWith({
        anchor: "top-left",
      });
    });
  });

  describe("menuState: PROCESSING", () => {
    it("renders the processing Message and Cancel button", async () => {
      const { wrapper } = doMount();

      mockIsProcessing.value = true;
      await nextTick();

      expect(wrapper.find(".processing-message").exists()).toBe(true);
      expect(wrapper.find(".cancel-button").exists()).toBe(true);
      expect(wrapper.findComponent(QuickBuildInput).exists()).toBe(false);
      expect(wrapper.findComponent(QuickBuildResult).exists()).toBe(false);
    });

    it("calls abortSendMessage when the Cancel button is clicked", async () => {
      const { wrapper } = doMount();

      mockIsProcessing.value = true;
      await nextTick();

      await wrapper.find(".cancel-button").trigger("click");

      expect(mockAbortSendMessage).toHaveBeenCalledOnce();
    });

    it("calls updateMenuStyle with topOffset 70 when processing starts", async () => {
      const quickActionContext = createQuickActionContext();
      doMount({ quickActionContext });

      mockIsProcessing.value = true;
      await nextTick();

      expect(quickActionContext.updateMenuStyle).toHaveBeenCalledWith({
        topOffset: 70,
      });
    });
  });

  describe("menuState: RESULT", () => {
    it("renders QuickBuildResult with the correct props", () => {
      mockResult.value = createBuildPayload({
        type: "SUCCESS",
        message: "Done!",
        interactionId: "abc",
      });

      const { wrapper } = doMount();

      const resultProps = wrapper.findComponent(QuickBuildResult).props();
      expect(resultProps.message).toBe("Done!");
      expect(resultProps.interactionId).toBe("abc");
    });

    it("passes lastMessageInquiryTraces to QuickBuildResult", () => {
      const traces: InquiryTrace[] = [
        {
          inquiry: {
            inquiryId: "inq-1",
            inquiryType: KaiInquiry.InquiryTypeEnum.Permission,
            title: "Allow?",
            description: "",
            options: [{ id: "yes", label: "Yes", style: "primary" }],
          },
          selectedOptionId: "yes",
        },
      ];
      mockResult.value = createBuildPayload({ type: "SUCCESS" });
      mockLastMessageInquiryTraces.value = traces;

      const { wrapper } = doMount();

      expect(
        wrapper.findComponent(QuickBuildResult).props("inquiryTraces"),
      ).toEqual(traces);
    });

    it("does not render QuickBuildInput in RESULT state", () => {
      mockResult.value = createBuildPayload({ type: "SUCCESS" });

      const { wrapper } = doMount();

      expect(wrapper.findComponent(QuickBuildInput).exists()).toBe(false);
    });

    it("calls updateMenuStyle with topOffset -40 when entering RESULT state", async () => {
      mockIsProcessing.value = true;
      const quickActionContext = createQuickActionContext();
      doMount({ quickActionContext });
      await nextTick();

      // Transition from PROCESSING to RESULT
      mockIsProcessing.value = false;
      mockResult.value = createBuildPayload({ type: "SUCCESS" });
      await nextTick();

      expect(quickActionContext.updateMenuStyle).toHaveBeenCalledWith({
        topOffset: -40,
      });
    });

    it("calls closeMenu when QuickBuildResult emits close", async () => {
      mockResult.value = createBuildPayload({ type: "SUCCESS" });
      const quickActionContext = createQuickActionContext();
      const { wrapper } = doMount({ quickActionContext });

      await wrapper.findComponent(QuickBuildResult).vm.$emit("close");

      expect(quickActionContext.closeMenu).toHaveBeenCalledOnce();
    });
  });

  describe("menuState: NONE (cancelled request)", () => {
    it("calls updateMenuStyle with empty config and then closeMenu", async () => {
      mockIsProcessing.value = true;
      const quickActionContext = createQuickActionContext();
      doMount({ quickActionContext });
      await nextTick();

      // Transition from PROCESSING to NONE (cancelled: empty result object)
      mockIsProcessing.value = false;
      mockResult.value = {} as AiAssistantBuildEventPayload;
      await nextTick();

      expect(quickActionContext.updateMenuStyle).toHaveBeenCalledWith({});
      expect(quickActionContext.closeMenu).toHaveBeenCalledOnce();
    });
  });
});
