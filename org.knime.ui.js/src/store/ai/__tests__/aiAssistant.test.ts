/* eslint-disable camelcase */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { API } from "@api";

import { KaiInquiry, KaiMessage } from "@/api/gateway-api/generated-api";
import { createKaiInquiry } from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";

const mockedAPI = deepMocked(API);

describe("aiAssistant store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupStore = ({
    projectId = "test-project-id",
    workflowId = "test-workflow-id",
  }: { projectId?: string; workflowId?: string } = {}) => {
    const stores = mockStores();

    stores.workflowStore.activeWorkflow = {
      projectId,
      info: { containerId: workflowId },
    } as any;

    return stores;
  };

  describe("respondToInquiry", () => {
    it("does nothing when there is no pending inquiry", async () => {
      const { aiAssistantStore } = setupStore();

      await aiAssistantStore.respondToInquiry({
        chainType: "qa",
        selectedOptionId: "allow",
      });

      expect(mockedAPI.kai.respondToInquiry).not.toHaveBeenCalled();
    });

    it("stores the trace and clears the pending inquiry", async () => {
      const { aiAssistantStore } = setupStore();
      const inquiry = createKaiInquiry();

      aiAssistantStore.qa.pendingInquiry = inquiry;
      mockedAPI.kai.respondToInquiry.mockResolvedValue(undefined as any);

      await aiAssistantStore.respondToInquiry({
        chainType: "qa",
        selectedOptionId: "allow",
        suffix: "Saved",
      });

      expect(aiAssistantStore.qa.pendingInquiry).toBeNull();
      expect(aiAssistantStore.qa.pendingInquiryTraces).toEqual([
        { inquiry, selectedOptionId: "allow", suffix: "Saved" },
      ]);
    });

    it('sets status to "Continuing..." while waiting for the response', async () => {
      const { aiAssistantStore } = setupStore();
      const inquiry = createKaiInquiry();

      aiAssistantStore.qa.pendingInquiry = inquiry;
      mockedAPI.kai.respondToInquiry.mockResolvedValue(undefined as any);

      await aiAssistantStore.respondToInquiry({
        chainType: "qa",
        selectedOptionId: "allow",
      });

      expect(aiAssistantStore.qa.statusUpdate).toEqual({
        message: "Continuing...",
        type: "INFO",
      });
    });

    it("calls the API with the correct payload", async () => {
      const { aiAssistantStore } = setupStore({ projectId: "proj-42" });
      const inquiry = createKaiInquiry({ inquiryId: "inq-99" });

      aiAssistantStore.qa.pendingInquiry = inquiry;
      mockedAPI.kai.respondToInquiry.mockResolvedValue(undefined as any);

      await aiAssistantStore.respondToInquiry({
        chainType: "qa",
        selectedOptionId: "deny",
      });

      expect(mockedAPI.kai.respondToInquiry).toHaveBeenCalledWith({
        kaiChainId: "qa",
        kaiInquiryResponse: {
          projectId: "proj-42",
          inquiryId: "inq-99",
          selectedOptionId: "deny",
        },
      });
    });

    it("uses the chain's stored projectId rather than the currently active workflow", async () => {
      const { aiAssistantStore } = setupStore({
        projectId: "switched-project",
      });
      const inquiry = createKaiInquiry();

      aiAssistantStore.qa.projectAndWorkflowIds = {
        projectId: "original-project",
        workflowId: "wf-1",
      };
      aiAssistantStore.qa.pendingInquiry = inquiry;
      mockedAPI.kai.respondToInquiry.mockResolvedValue(undefined as any);

      await aiAssistantStore.respondToInquiry({
        chainType: "qa",
        selectedOptionId: "allow",
      });

      expect(mockedAPI.kai.respondToInquiry).toHaveBeenCalledWith(
        expect.objectContaining({
          kaiInquiryResponse: expect.objectContaining({
            projectId: "original-project",
          }),
        }),
      );
    });
  });

  describe("handleAiAssistantEvent — inquiry", () => {
    it("shows the inquiry to the user when there is no saved decision", () => {
      const { aiAssistantStore } = setupStore();
      const inquiry = createKaiInquiry();

      aiAssistantStore.handleAiAssistantEvent({
        chainType: "qa",
        data: {
          type: "inquiry",
          payload: inquiry,
          conversation_id: "conv-1",
        },
      });

      expect(aiAssistantStore.qa.pendingInquiry).toEqual(inquiry);
      expect(aiAssistantStore.qa.statusUpdate).toEqual({
        message: "Waiting for user input...",
        type: "INFO",
      });
    });

    it("auto-responds with the saved decision when one exists", () => {
      const { aiAssistantStore, aiSettingsStore } = setupStore();
      const inquiry = createKaiInquiry({
        metadata: { actionId: "action-sample" },
      });

      vi.spyOn(
        aiSettingsStore,
        "getPermissionForActionForActiveProject",
      ).mockReturnValue("allow");

      mockedAPI.kai.respondToInquiry.mockResolvedValue(undefined as any);

      aiAssistantStore.handleAiAssistantEvent({
        chainType: "qa",
        data: {
          type: "inquiry",
          payload: inquiry,
          conversation_id: "conv-1",
        },
      });

      expect(aiAssistantStore.qa.pendingInquiry).toBeNull();
      expect(aiAssistantStore.qa.pendingInquiryTraces[0]).toMatchObject({
        selectedOptionId: "allow",
        suffix: "Remembered",
      });
    });

    it("does not auto-respond for non-permission inquiry types", () => {
      const { aiAssistantStore } = setupStore();
      const inquiry = createKaiInquiry({
        inquiryType: KaiInquiry.InquiryTypeEnum.Confirmation,
        metadata: { actionId: "action-confirm" },
      });

      aiAssistantStore.handleAiAssistantEvent({
        chainType: "qa",
        data: {
          type: "inquiry",
          payload: inquiry,
          conversation_id: "conv-1",
        },
      });

      expect(aiAssistantStore.qa.pendingInquiry).toEqual(inquiry);
    });
  });

  describe("handleAiAssistantEvent — result", () => {
    it("attaches accumulated inquiry traces to the final assistant message", () => {
      const { aiAssistantStore } = setupStore();
      const inquiry = createKaiInquiry();

      aiAssistantStore.qa.pendingInquiryTraces = [
        { inquiry, selectedOptionId: "allow", suffix: "Saved" },
      ];

      aiAssistantStore.handleAiAssistantEvent({
        chainType: "qa",
        data: {
          type: "result",
          payload: {
            message: "Here is your result",
            interactionId: "int-1",
          } as any,
          conversation_id: "conv-1",
        },
      });

      const lastMessage =
        aiAssistantStore.qa.messages[aiAssistantStore.qa.messages.length - 1];
      expect(lastMessage.inquiryTraces).toEqual([
        { inquiry, selectedOptionId: "allow", suffix: "Saved" },
      ]);
    });

    it("clears pendingInquiryTraces after the result event", () => {
      const { aiAssistantStore } = setupStore();
      const inquiry = createKaiInquiry();

      aiAssistantStore.qa.pendingInquiryTraces = [
        { inquiry, selectedOptionId: "allow" },
      ];

      aiAssistantStore.handleAiAssistantEvent({
        chainType: "qa",
        data: {
          type: "result",
          payload: { message: "Done", interactionId: "int-2" } as any,
          conversation_id: "conv-1",
        },
      });

      expect(aiAssistantStore.qa.pendingInquiryTraces).toEqual([]);
    });
  });

  describe("handleAiAssistantEvent — status_update", () => {
    it("sets the status update on the store", () => {
      const { aiAssistantStore } = setupStore();

      aiAssistantStore.handleAiAssistantEvent({
        chainType: "qa",
        data: {
          type: "status_update",
          payload: { message: "Thinking...", type: "INFO" },
          conversation_id: "conv-1",
        },
      });

      expect(aiAssistantStore.qa.statusUpdate).toEqual({
        message: "Thinking...",
        type: "INFO",
      });
    });
  });

  describe("handleAiAssistantEvent — error", () => {
    it("clears the chain and pushes an error message", () => {
      const { aiAssistantStore } = setupStore();

      aiAssistantStore.qa.isProcessing = true;
      aiAssistantStore.qa.incomingTokens = "partial tokens";

      aiAssistantStore.handleAiAssistantEvent({
        chainType: "qa",
        data: {
          type: "error",
          payload: { message: "Something went wrong" },
          conversation_id: "conv-1",
        },
      });

      expect(aiAssistantStore.qa.isProcessing).toBe(false);
      expect(aiAssistantStore.qa.incomingTokens).toBe("");

      const lastMessage =
        aiAssistantStore.qa.messages[aiAssistantStore.qa.messages.length - 1];
      expect(lastMessage.role).toBe(KaiMessage.RoleEnum.Assistant);
      expect(lastMessage.content).toBe("Something went wrong");
      expect(lastMessage.isError).toBe(true);
    });
  });
});
