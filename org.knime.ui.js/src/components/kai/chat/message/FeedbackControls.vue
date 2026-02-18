<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";

import { Button } from "@knime/components";
import ThumbsDownIcon from "@knime/styles/img/icons/thumbs-down.svg";
import ThumbsUpIcon from "@knime/styles/img/icons/thumbs-up.svg";
import { sleep } from "@knime/utils";

import { useAIAssistantStore } from "@/store/ai/aiAssistant";

const DELAY_TIME = 1000;

interface Props {
  interactionId: string;
}

const props = defineProps<Props>();
const emit = defineEmits(["feedbackSubmitted"]);
const { isFeedbackProcessed } = storeToRefs(useAIAssistantStore());
const { submitFeedback } = useAIAssistantStore();

const isFeedbackSubmitted = ref<boolean>(false);
const showThankYou = ref<boolean>(false);
const shouldRenderFeedbackControls = computed(
  () =>
    !isFeedbackSubmitted.value &&
    props.interactionId &&
    !isFeedbackProcessed.value(props.interactionId),
);

const clickSubmitFeedback = async (feedback: {
  isPositive: boolean;
  comment: string;
}) => {
  submitFeedback({
    interactionId: props.interactionId,
    feedback,
  });
  isFeedbackSubmitted.value = true;
  emit("feedbackSubmitted");

  showThankYou.value = true;
  await sleep(DELAY_TIME);
  showThankYou.value = false;
};
</script>

<template>
  <div v-if="shouldRenderFeedbackControls" class="feedback-controls">
    <Button
      class="button thumbs-up"
      @click="clickSubmitFeedback({ isPositive: true, comment: '' })"
    >
      <ThumbsUpIcon class="icon" />
    </Button>
    <Button
      class="button thumbs-down"
      @click="clickSubmitFeedback({ isPositive: false, comment: '' })"
    >
      <ThumbsDownIcon class="icon" />
    </Button>
  </div>
  <Transition v-else name="fade">
    <div v-if="showThankYou" class="thank-you">
      Thank you for your feedback!
    </div>
  </Transition>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.feedback-controls {
  display: inline-flex;
  flex-direction: row;
  margin-top: var(--space-4);
  gap: var(--space-8);

  & .button {
    width: 20px;
    height: 20px;
    padding: 0;
    position: relative;

    & svg.icon {
      @mixin svg-icon-size 12;

      position: absolute;
      left: 4px;
      top: 3px;
      stroke: var(--knime-dove-gray);
    }
  }

  & .button.thumbs-up:hover {
    background-color: var(--theme-color-success-semi);

    & svg.icon {
      stroke: var(--theme-color-success);
    }
  }

  & .button.thumbs-down:hover {
    background-color: var(--theme-color-error-semi);

    & svg.icon {
      stroke: var(--theme-color-error);
    }
  }

  & .thank-you {
    font-size: 12px;
    padding-top: 2px;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 1s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
