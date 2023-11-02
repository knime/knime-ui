<script setup lang="ts">
import Button from "webapps-common/ui/components/Button.vue";
import useUiStrings from "./useUiStrings";
import BasePanel from "./BasePanel.vue";

const { uiStrings } = useUiStrings();

const disclaimer = `By using this chatbot, you acknowledge and agree the following:

Any information you enter into the prompt tooltip, as well as information about the code in the editor, may be shared with OpenAI and KNIME in order to provide and improve this service.

KNIME is not responsible for any content, input or output, or actions triggered on the workflow, and is not liable for any damages arising from or related to your use of the chatbot.

This is an experimental service, USE AT YOUR OWN RISK.
`;

const emit = defineEmits(["close"]);
</script>

<template>
  <BasePanel>
    <div class="disclaimer">
      <div class="title">Disclaimer</div>
      <p class="content">
        {{ disclaimer }}
      </p>
    </div>
    <Button primary class="close-button" @click="emit('close')">
      Accept and close
    </Button>
  </BasePanel>
</template>

<style lang="postcss" scoped>
& .disclaimer {
  background-color: var(--knime-white);
  position: relative;
  padding: 20px 15px;
  margin-bottom: 20px;

  & .title {
    font-weight: 700;
  }

  & .content {
    overflow-wrap: break-word;
    white-space: pre-wrap;
  }
}
& .close-button {
  align-self: flex-end;
}
</style>
