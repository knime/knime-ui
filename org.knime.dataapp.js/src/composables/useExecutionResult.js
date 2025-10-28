import { computed } from "vue";
import { useStore } from "vuex";

import { resultPageMessages, wizardExecutionStates } from "@/config";
import parseNodeMessages from "@/util/parseNodeMessages";

const NOT_EXECUTABLE_MESSAGE =
  "Further workflow execution is not possible. Please check the workflow.";

const { FINISHED, NOT_EXECUTABLE } = wizardExecutionStates;

export const useExecutionResult = () => {
  const store = useStore();

  const messages = computed(() => {
    let { page, job } = store.state.wizardExecution;
    let pageMessages = page?.nodeMessages || {};
    let jobMessages = job?.nodeMessages || [];

    let resultMessages = parseNodeMessages(pageMessages, jobMessages);

    if (import.meta.env.KNIME_DISABLE_WARNING_MESSAGES === "true") {
      resultMessages = Object.keys(resultMessages)
        .filter((key) => resultMessages[key].type === "ERROR")
        .reduce((obj, key) => {
          obj[key] = resultMessages[key];
          return obj;
        }, {});
    }

    if (page.wizardExecutionState === NOT_EXECUTABLE) {
      resultMessages["WORKFLOW ERROR"] = {
        message: [NOT_EXECUTABLE_MESSAGE],
        type: "error",
      };
    }

    const formattedMessages = Object.keys(resultMessages).map((key) => {
      const item = resultMessages[key];
      return `${key}: ${item.message.join("\n")}`;
    });
    return formattedMessages;
  });

  const wizardExecutionState = computed(() => {
    return store.state.wizardExecution.page.wizardExecutionState;
  });

  const success = computed(() => {
    return wizardExecutionState.value === FINISHED;
  });

  const messageHeader = computed(() => {
    return resultPageMessages[wizardExecutionState.value] || resultPageMessages.EXECUTION_FAILED;
  });

  return {
    messages,
    success,
    messageHeader,
  };
};
