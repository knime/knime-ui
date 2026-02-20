import { API } from "@api";
import { isEmpty, isUndefined } from "lodash-es";
import { defineStore } from "pinia";

import { promise as promiseUtils } from "@knime/utils";

import type { NodeRelation } from "@/api/custom-types";
import {
  KaiInquiry,
  KaiMessage,
  type XY,
} from "@/api/gateway-api/generated-api";
import { runInEnvironment } from "@/environment";
import { useApplicationStore } from "@/store/application/application";
import { useSelectionStore } from "@/store/selection";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useWorkflowStore } from "@/store/workflow/workflow";

import { useAISettingsStore } from "./aiSettings";
import type {
  AiAssistantBuildEventPayload,
  AiAssistantEvent,
  AiAssistantQAEventPayload,
  AiAssistantState,
  ChainType,
  ConversationState,
  Feedback,
  InquiryTrace,
  KaiUsageState,
  Message,
  ProjectAndWorkflowIds,
  StatusUpdate,
} from "./types";

const responseCallback: Record<
  string,
  { resolve: CallableFunction; reject: CallableFunction }
> = {};

const createEmptyConversationState = (): ConversationState => {
  return {
    conversationId: null,
    messages: [],
    statusUpdate: null,
    isProcessing: false,
    incomingTokens: "",
    projectAndWorkflowIds: null,
    pendingInquiry: null,
    pendingInquiryTraces: [],
  };
};

export const useAIAssistantStore = defineStore("aiAssistant", {
  state: (): AiAssistantState => ({
    hubID: null,
    qa: createEmptyConversationState(),
    build: createEmptyConversationState(),
    processedInteractionIds: new Set(),
    usage: null,
    isUserLicensed: true,
    unlicensedUserMessage: null,
  }),
  actions: {
    setHubID(hubID: string | null) {
      this.hubID = hubID;
    },

    pushMessage(payload: {
      chainType: ChainType;
      role: Message["role"];
      content: string;
      nodes?: Message["nodes"];
      references?: Message["references"];
      workflows?: Message["workflows"];
      components?: Message["components"];
      interactionId?: string;
      isError?: boolean;
      inquiryTraces?: InquiryTrace[];
    }) {
      const {
        chainType,
        role,
        content,
        nodes,
        references,
        workflows,
        components,
        interactionId = "",
        isError = false,
        inquiryTraces,
      } = payload;

      const timestamp = Date.now();

      this[chainType].messages.push({
        role,
        content,
        nodes,
        references,
        workflows,
        components,
        interactionId,
        isError,
        timestamp,
        inquiryTraces,
      });
    },

    popUserQuery({ chainType }: { chainType: ChainType }) {
      const messages = this[chainType].messages;
      const lastMessage = messages.at(-1);
      if (lastMessage?.role === "user") {
        messages.pop();
      }
    },

    setStatusUpdate({
      chainType,
      statusUpdate,
    }: {
      chainType: ChainType;
      statusUpdate: StatusUpdate | null;
    }) {
      this[chainType].statusUpdate = statusUpdate;
    },

    setIsProcessing({
      chainType,
      isProcessing,
    }: {
      chainType: ChainType;
      isProcessing: boolean;
    }) {
      this[chainType].isProcessing = isProcessing;
    },

    addToken({ chainType, token }: { chainType: ChainType; token: string }) {
      this[chainType].incomingTokens += token;
    },

    setProjectAndWorkflowIds({
      chainType,
      projectAndWorkflowIds,
    }: {
      chainType: ChainType;
      projectAndWorkflowIds: ProjectAndWorkflowIds;
    }) {
      this[chainType].projectAndWorkflowIds = projectAndWorkflowIds;
    },

    clearChain({ chainType }: { chainType: ChainType }) {
      this[chainType].isProcessing = false;
      this[chainType].incomingTokens = "";
      this[chainType].statusUpdate = null;
      this[chainType].projectAndWorkflowIds = null;
      this[chainType].pendingInquiry = null;
      this[chainType].pendingInquiryTraces = [];
    },

    clearConversation({ chainType }: { chainType: ChainType }) {
      this[chainType] = createEmptyConversationState();
    },

    setConversationId({
      chainType,
      conversationId,
    }: {
      chainType: ChainType;
      conversationId: string | null;
    }) {
      this[chainType].conversationId = conversationId;
    },

    /**
     * Submits the user's response to a pending inquiry. Records the response as
     * a trace, clears the pending inquiry, and notifies the API so K-AI can
     * continue generating its response.
     */
    async respondToInquiry({
      chainType,
      selectedOptionId,
      suffix,
    }: {
      chainType: ChainType;
      selectedOptionId: string;
      suffix?: string;
    }) {
      const pendingInquiry = this[chainType].pendingInquiry;
      if (!pendingInquiry) {
        return;
      }

      // Store the response trace before clearing the inquiry
      this[chainType].pendingInquiryTraces.push({
        inquiry: pendingInquiry,
        selectedOptionId,
        suffix,
      });

      // Clear the pending inquiry
      this[chainType].pendingInquiry = null;

      // Update status to indicate K-AI is continuing
      this.setStatusUpdate({
        chainType,
        statusUpdate: { message: "Continuing...", type: "INFO" },
      });

      const projectId =
        this[chainType].projectAndWorkflowIds?.projectId ??
        useWorkflowStore().getProjectAndWorkflowIds.projectId;
      try {
        await promiseUtils.retryPromise({
          fn: () =>
            API.kai.respondToInquiry({
              kaiChainId: chainType,
              kaiInquiryResponse: {
                projectId,
                inquiryId: pendingInquiry.inquiryId,
                selectedOptionId,
              },
            }),
          retryCount: 1,
        });
      } catch (error) {
        consola.error("respondToInquiry", error);
        this.setIsProcessing({ chainType, isProcessing: false });
        this.pushMessage({
          chainType,
          role: KaiMessage.RoleEnum.Assistant,
          content: "Something went wrong. Try again later.",
          isError: true,
        });
      }
    },

    async getHubID() {
      const id = await runInEnvironment({
        DESKTOP: () => API.desktop.getHubID(),
        BROWSER: () => {
          const providers = useSpaceProvidersStore().spaceProviders;
          // in browser, the active Hub being used for editing is the only available provider,
          // hence we take the first provider from the list
          return Promise.resolve(Object.values(providers)[0]?.id ?? null);
        },
      });
      this.setHubID(id ?? null);
    },

    async makeAiRequest({
      chainType,
      message,
      targetNodes = [],
      startPosition,
    }: {
      chainType: ChainType;
      message: string;
      targetNodes?: string[];
      startPosition?: XY;
    }) {
      const projectAndWorkflowIds = useWorkflowStore().getProjectAndWorkflowIds;
      const selectedNodes = targetNodes.length
        ? targetNodes
        : useSelectionStore().selectedNodeIds;

      this.setIsProcessing({ chainType, isProcessing: true });
      this.setProjectAndWorkflowIds({ chainType, projectAndWorkflowIds });
      this.pushMessage({
        chainType,
        role: KaiMessage.RoleEnum.User,
        content: message,
      });

      const messages = this[chainType].messages.map(({ role, content }) => ({
        role,
        content,
      }));

      const conversationId = this[chainType].conversationId;
      const { projectId, workflowId } = projectAndWorkflowIds;
      try {
        await API.kai.makeAiRequest({
          kaiChainId: chainType,
          kaiRequest: {
            ...(conversationId && { conversationId }),
            projectId,
            workflowId,
            selectedNodes,
            messages,
            startPosition,
          },
        });

        // Resolve/reject only after handleAiAssistantEvent receives a
        // corresponding result or error.
        const { resolve, reject, promise } =
          promiseUtils.createUnwrappedPromise<
            AiAssistantQAEventPayload | AiAssistantBuildEventPayload
          >();
        responseCallback[chainType] = { resolve, reject };

        return promise;
      } catch (error) {
        consola.error("makeAiRequest", error);
        this.clearChain({ chainType });
        this.pushMessage({
          chainType,
          role: KaiMessage.RoleEnum.Assistant,
          content: "Something went wrong. Try again later.",
          isError: true,
        });

        throw error;
      }
    },

    async submitFeedback({
      interactionId,
      feedback,
    }: {
      interactionId: string;
      feedback: Feedback;
    }) {
      const projectAndWorkflowIds = useWorkflowStore().getProjectAndWorkflowIds;
      const { projectId } = projectAndWorkflowIds;

      this.processedInteractionIds.add(interactionId);

      try {
        await API.kai.submitFeedback({
          kaiFeedbackId: interactionId,
          kaiFeedback: {
            projectId,
            isPositive: feedback.isPositive,
            comment: feedback.comment,
          },
        });
      } catch (error) {
        consola.error("submitFeedback", error);
      }
    },

    handleAiAssistantEvent({
      chainType,
      data: { type, payload, conversation_id: conversationId },
    }: {
      chainType: ChainType;
      data: AiAssistantEvent;
    }) {
      switch (type) {
        case "token":
          this.addToken({ chainType, token: payload });
          break;

        case "result": {
          // Save inquiry traces before clearing so they can be attached to the final message
          const inquiryTraces = [...this[chainType].pendingInquiryTraces];

          this.clearChain({ chainType });
          this.setConversationId({ chainType, conversationId });

          if (payload.message) {
            this.pushMessage({
              chainType,
              role: KaiMessage.RoleEnum.Assistant,
              content: payload.message,
              nodes: payload.nodes,
              references: payload.references,
              workflows: payload.workflows,
              components: payload.components,
              interactionId: payload.interactionId,
              inquiryTraces,
            });
          }

          if (payload.usage) {
            this.updateUsage(payload.usage);
          }

          responseCallback[chainType]?.resolve(payload);
          delete responseCallback[chainType];
          break;
        }

        case "error": {
          this.clearChain({ chainType });
          this.setConversationId({ chainType, conversationId });

          this.pushMessage({
            chainType,
            role: KaiMessage.RoleEnum.Assistant,
            content: payload.message,
            isError: true,
          });

          responseCallback[chainType]?.reject(payload);
          delete responseCallback[chainType];
          break;
        }

        case "status_update": {
          this.setStatusUpdate({
            chainType,
            statusUpdate: payload,
          });
          break;
        }

        case "inquiry": {
          // For permission inquiries, check whether the user has a saved
          // decision for this action. If so, auto-respond immediately (inquiry card
          // isn't shown, but its trace is). Otherwise, display the inquiry
          // card and wait for the user to respond.
          const actionId = payload.metadata?.actionId as string | undefined;
          const isPermission =
            payload.inquiryType === KaiInquiry.InquiryTypeEnum.Permission;

          const savedDecision =
            isPermission && actionId
              ? useAISettingsStore().getPermissionForActionForActiveProject(
                  actionId,
                )
              : null;

          if (savedDecision) {
            this[chainType].pendingInquiry = payload;
            this.respondToInquiry({
              chainType,
              selectedOptionId: savedDecision,
              suffix: "Remembered",
            });
            break;
          }

          // No saved decision — show the inquiry to the user
          this[chainType].pendingInquiry = payload;
          this.setStatusUpdate({
            chainType,
            statusUpdate: {
              message: "Waiting for user input...",
              type: "INFO",
            },
          });
          break;
        }
      }
    },

    async abortAiRequest({ chainType }: { chainType: ChainType }) {
      try {
        await API.kai.abortAiRequest({ kaiChainId: chainType });
      } catch (error) {
        consola.error("abortAiRequest", error);
        this.clearChain({ chainType });
      }
      this.popUserQuery({ chainType });

      // re-fetch usage in case the cancelled interaction ended up counting towards the quota
      await this.fetchUsage();
    },

    async fetchUsage() {
      const projectAndWorkflowIds = useWorkflowStore().getProjectAndWorkflowIds;
      const { projectId } = projectAndWorkflowIds;

      try {
        this.usage = await API.kai.getUsage({ projectId });

        // limit -1 indicates no hard limit
        if (this.usage && this.usage.limit === -1) {
          this.usage = null;
        }

        this.isUserLicensed = true;
        this.unlicensedUserMessage = null;
      } catch (error: any) {
        // TODO: Replace with a proper error communication channel (AP-25330)
        const unauthorizedPrefix = "403:";
        consola.error("getUsage", error);
        if (error?.message.startsWith(unauthorizedPrefix)) {
          this.isUserLicensed = false;
          this.unlicensedUserMessage = error.message.slice(
            unauthorizedPrefix.length,
          );
        }

        this.usage = null;
      }
    },
    updateUsage(usage: KaiUsageState) {
      this.usage = usage;
    },
  },
  getters: {
    isQuickBuildAvailableForPort: () => {
      return (nodeRelation: string | null, portTypeId: string | null) => {
        return (
          nodeRelation === "SUCCESSORS" &&
          portTypeId &&
          useApplicationStore().availablePortTypes[portTypeId]?.kind === "table"
        );
      };
    },

    isFeedbackProcessed: (state) => {
      return (interactionId: string) =>
        state.processedInteractionIds.has(interactionId);
    },

    isQuickBuildModeAvailable: () => {
      return (
        nodeRelation: NodeRelation | null,
        portTypeId: string | undefined,
      ) => {
        const supportedPortKinds = ["table"];

        const { getSelectedNodes: selectedNodes } = useSelectionStore();
        const { availablePortTypes } = useApplicationStore();

        // 1. Starting from scratch (e.g. double-click on canvas)
        if (isEmpty(selectedNodes) && isUndefined(portTypeId)) {
          return true;
        }

        // 2. Multiple nodes selected (e.g. keyboard shortcut with multiple nodes selected)
        if (selectedNodes.length > 1) {
          let portKinds = selectedNodes
            .flatMap((node) => node.outPorts)
            .map((port) => availablePortTypes[port.typeId]?.kind)
            .filter((portKind) => portKind !== "flowVariable");
          portKinds = [...new Set(portKinds)];

          const areSelectedPortKindsSupported = portKinds.every((portKind) =>
            supportedPortKinds.includes(portKind as string),
          );
          return areSelectedPortKindsSupported;
        }

        // 3. Starting from a single outport
        return Boolean(
          nodeRelation === "SUCCESSORS" &&
            portTypeId &&
            supportedPortKinds.includes(availablePortTypes[portTypeId]?.kind),
        );
      };
    },
  },
});
