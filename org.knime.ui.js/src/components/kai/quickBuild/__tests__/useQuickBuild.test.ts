import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, nextTick, ref } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import type { XY } from "@/api/gateway-api/generated-api";
import { useHubAuth } from "@/components/kai/useHubAuth";
import type { AiAssistantBuildEventPayload } from "@/store/ai/types";
import { mockStores } from "@/test/utils/mockStores";
import { useQuickBuild } from "../useQuickBuild";

vi.mock("@/components/kai/useHubAuth", () => ({
  useHubAuth: vi.fn().mockReturnValue({
    isAuthError: vi.fn().mockReturnValue(false),
    disconnectHub: vi.fn(),
  }),
}));

// useChat is tested separately; mock it here for isolation
const mockIsProcessing = ref(false);
const mockStatusUpdate = ref<{ message: string; type?: string } | null>(null);
const mockLastAiMessage = ref<{ inquiryTraces?: unknown[] } | null>(null);

vi.mock("@/components/kai/chat/useChat", () => ({
  useChat: vi.fn().mockImplementation(() => ({
    isProcessing: mockIsProcessing,
    lastUserMessage: ref(""),
    lastAiMessage: mockLastAiMessage,
    abortSendMessage: vi.fn(),
    statusUpdate: mockStatusUpdate,
    pendingInquiry: ref(null),
    pendingInquiryTraces: ref([]),
  })),
}));

type HubAuth = ReturnType<typeof useHubAuth>;

const createBuildPayload = (
  overrides: Partial<AiAssistantBuildEventPayload> = {},
): AiAssistantBuildEventPayload => ({
  message: "I built a workflow for you.",
  interactionId: "interaction-123",
  type: "SUCCESS",
  references: undefined as never,
  workflows: undefined as never,
  components: undefined as never,
  nodes: undefined as never,
  ...overrides,
});

describe("useQuickBuild", () => {
  const doMount = ({
    nodeId = ref<string | null>(null),
    startPosition = ref<XY>({ x: 0, y: 0 }),
  }: {
    nodeId?: ReturnType<typeof ref<string | null>>;
    startPosition?: ReturnType<typeof ref<XY>>;
  } = {}) => {
    // stubActions: true so makeAiRequest doesn't run its real implementation
    const mockedStores = mockStores({ stubActions: true });

    const TestComponent = defineComponent({
      setup() {
        return useQuickBuild({ nodeId, startPosition });
      },
      template: "<div></div>",
    });

    const wrapper = mount(TestComponent, {
      global: { plugins: [mockedStores.testingPinia] },
    });

    return { vm: wrapper.vm, mockedStores };
  };

  beforeEach(() => {
    mockIsProcessing.value = false;
    mockStatusUpdate.value = null;
    mockLastAiMessage.value = null;

    vi.mocked(useHubAuth).mockReturnValue({
      isAuthError: vi.fn().mockReturnValue(false),
      disconnectHub: vi.fn(),
    } as unknown as HubAuth);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("has empty userQuery, errorMessage and null result", () => {
      const { vm } = doMount();
      expect(vm.userQuery).toBe("");
      expect(vm.errorMessage).toBe("");
      expect(vm.result).toBeNull();
    });

    it("calls fetchUsage on before mount", () => {
      const { mockedStores } = doMount();
      expect(mockedStores.aiAssistantStore.fetchUsage).toHaveBeenCalledOnce();
    });
  });

  describe("sendMessage", () => {
    it("resets result and sets userQuery before awaiting the request", async () => {
      const { vm, mockedStores } = doMount();

      // pre-set a result to confirm it gets cleared
      vm.result = createBuildPayload();

      vi.mocked(mockedStores.aiAssistantStore.makeAiRequest).mockResolvedValue(
        createBuildPayload(),
      );

      // Don't await — we want the synchronous-ish pre-flight state
      const promise = vm.sendMessage({ message: "build me a pipeline" });
      expect(vm.result).toBeNull();
      expect(vm.userQuery).toBe("build me a pipeline");
      await promise;
    });

    it("passes nodeId as targetNodes when nodeId is set", async () => {
      const nodeId = ref<string | null>("node-42");
      const startPosition = ref<XY>({ x: 10, y: 20 });
      const { vm, mockedStores } = doMount({ nodeId, startPosition });

      vi.mocked(mockedStores.aiAssistantStore.makeAiRequest).mockResolvedValue(
        createBuildPayload(),
      );

      await vm.sendMessage({ message: "add a filter" });

      expect(mockedStores.aiAssistantStore.makeAiRequest).toHaveBeenCalledWith({
        chainType: "build",
        message: "add a filter",
        targetNodes: ["node-42"],
        startPosition: { x: 10, y: 20 },
      });
    });

    it("passes empty targetNodes when nodeId is null", async () => {
      const { vm, mockedStores } = doMount({ nodeId: ref(null) });

      vi.mocked(mockedStores.aiAssistantStore.makeAiRequest).mockResolvedValue(
        createBuildPayload(),
      );

      await vm.sendMessage({ message: "build something" });

      expect(mockedStores.aiAssistantStore.makeAiRequest).toHaveBeenCalledWith(
        expect.objectContaining({ targetNodes: [] }),
      );
    });

    it("sets result and calls enableDetachedMode on SUCCESS", async () => {
      const { vm, mockedStores } = doMount();
      const payload = createBuildPayload({ type: "SUCCESS" });

      vi.mocked(mockedStores.aiAssistantStore.makeAiRequest).mockResolvedValue(
        payload,
      );

      await vm.sendMessage({ message: "build me a pipeline" });

      expect(vm.result).toEqual(payload);
      expect(
        mockedStores.canvasAnchoredComponentsStore.enableDetachedMode,
      ).toHaveBeenCalledOnce();
    });

    it("sets result but does NOT call enableDetachedMode on INPUT_NEEDED", async () => {
      const { vm, mockedStores } = doMount();
      const payload = createBuildPayload({ type: "INPUT_NEEDED" });

      vi.mocked(mockedStores.aiAssistantStore.makeAiRequest).mockResolvedValue(
        payload,
      );

      await vm.sendMessage({ message: "build me a pipeline" });

      expect(vm.result).toEqual(payload);
      expect(
        mockedStores.canvasAnchoredComponentsStore.enableDetachedMode,
      ).not.toHaveBeenCalled();
    });

    it("enableDetachedMode is only called once across multiple SUCCESS requests", async () => {
      const { vm, mockedStores } = doMount();
      const payload = createBuildPayload({ type: "SUCCESS" });

      vi.mocked(mockedStores.aiAssistantStore.makeAiRequest).mockResolvedValue(
        payload,
      );

      await vm.sendMessage({ message: "first" });
      await vm.sendMessage({ message: "second" });

      expect(
        mockedStores.canvasAnchoredComponentsStore.enableDetachedMode,
      ).toHaveBeenCalledOnce();
    });

    it("clears errorMessage before making a request", async () => {
      const { vm, mockedStores } = doMount();
      vm.errorMessage = "previous error";

      vi.mocked(mockedStores.aiAssistantStore.makeAiRequest).mockResolvedValue(
        createBuildPayload(),
      );

      await vm.sendMessage({ message: "retry" });

      expect(vm.errorMessage).toBe("");
    });
  });

  describe("sendMessage — error handling", () => {
    it("sets errorMessage on a generic error", async () => {
      const { vm, mockedStores } = doMount();

      vi.mocked(mockedStores.aiAssistantStore.makeAiRequest).mockRejectedValue(
        new Error("Something went wrong"),
      );

      await vm.sendMessage({ message: "build" });
      await flushPromises();

      expect(vm.errorMessage).toBe("Something went wrong");
    });

    it("shows a toast and calls disconnectHub on an auth error", async () => {
      const disconnectHub = vi.fn();
      const isAuthError = vi.fn().mockReturnValue(true);
      vi.mocked(useHubAuth).mockReturnValue({
        isAuthError,
        disconnectHub,
      } as unknown as HubAuth);

      const { vm, mockedStores } = doMount();

      vi.mocked(mockedStores.aiAssistantStore.makeAiRequest).mockRejectedValue(
        new Error("Could not authorize request"),
      );

      await vm.sendMessage({ message: "build" });
      await flushPromises();

      expect(disconnectHub).toHaveBeenCalledOnce();
      // errorMessage should NOT be set — the toast handles user feedback
      expect(vm.errorMessage).toBe("");
    });
  });

  describe("isProcessing watch — menu locking", () => {
    it("locks the quick action menu when processing starts", async () => {
      const { mockedStores } = doMount();

      mockIsProcessing.value = true;
      await nextTick();

      expect(
        mockedStores.canvasAnchoredComponentsStore.lockQuickActionMenu,
      ).toHaveBeenCalledOnce();
    });

    it("unlocks the quick action menu when processing ends", async () => {
      const { mockedStores } = doMount();

      mockIsProcessing.value = true;
      await nextTick();
      mockIsProcessing.value = false;
      await nextTick();

      expect(
        mockedStores.canvasAnchoredComponentsStore.unlockQuickActionMenu,
      ).toHaveBeenCalledOnce();
    });
  });

  describe("statusUpdate watch — connector hiding", () => {
    it("hides the quick action menu connector on WORKFLOW_BUILDING", async () => {
      const { mockedStores } = doMount();

      mockStatusUpdate.value = {
        message: "Building...",
        type: "WORKFLOW_BUILDING",
      };
      await nextTick();

      expect(
        mockedStores.canvasAnchoredComponentsStore.hideQuickActionMenuConnector,
      ).toHaveBeenCalledOnce();
    });

    it("hides the quick action menu connector on NODE_ADDED", async () => {
      const { mockedStores } = doMount();

      mockStatusUpdate.value = { message: "Node added.", type: "NODE_ADDED" };
      await nextTick();

      expect(
        mockedStores.canvasAnchoredComponentsStore.hideQuickActionMenuConnector,
      ).toHaveBeenCalledOnce();
    });

    it("does NOT hide the connector on an INFO status update", async () => {
      const { mockedStores } = doMount();

      mockStatusUpdate.value = { message: "Thinking...", type: "INFO" };
      await nextTick();

      expect(
        mockedStores.canvasAnchoredComponentsStore.hideQuickActionMenuConnector,
      ).not.toHaveBeenCalled();
    });
  });

  describe("lastMessageInquiryTraces", () => {
    it("is undefined when lastAiMessage is null", () => {
      mockLastAiMessage.value = null;
      const { vm } = doMount();
      expect(vm.lastMessageInquiryTraces).toBeUndefined();
    });

    it("reflects inquiryTraces from the last AI message", () => {
      const traces = [
        {
          inquiry: {
            inquiryId: "inq-1",
            title: "Allow?",
            description: "",
            inquiryType: "PERMISSION",
            options: [{ id: "yes", label: "Yes", style: "primary" }],
          },
          selectedOptionId: "yes",
        },
      ];

      mockLastAiMessage.value = { inquiryTraces: traces };
      const { vm } = doMount();
      expect(vm.lastMessageInquiryTraces).toEqual(traces);
    });
  });
});
