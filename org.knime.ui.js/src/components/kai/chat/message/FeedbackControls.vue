<script setup lang="ts">
import { ref, watch } from "vue";

import { Button } from "@knime/components";
import ThumbsDownIcon from "@knime/styles/img/icons/thumbs-down.svg";
import ThumbsUpIcon from "@knime/styles/img/icons/thumbs-up.svg";

const DELAY_TIME = 1000;

interface Props {
  submitFeedback: CallableFunction | null;
  showControls: boolean;
}

const props = defineProps<Props>();

const showThankYou = ref<Boolean>(false);

watch(
  () => props.submitFeedback,
  (newValue) => {
    if (!newValue) {
      showThankYou.value = true;
      setTimeout(() => {
        showThankYou.value = false;
      }, DELAY_TIME);
    }
  },
);
</script>

<template>
  <div v-show="showControls" v-if="submitFeedback" class="feedback-controls">
    <Button
      class="button thumbs-up"
      @click="submitFeedback({ isPositive: true, comment: '' })"
    >
      <ThumbsUpIcon class="icon" />
    </Button>
    <Button
      class="button thumbs-down"
      @click="submitFeedback({ isPositive: false, comment: '' })"
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

& .feedback-controls {
  display: inline-flex;
  flex-direction: row;
  margin-top: 5px;
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

  & .button.thumbs-down {
    & svg.icon {
      top: 4px;
    }
  }

  & .button.thumbs-up:hover,
  .button.thumbs-up:focus-visible {
    background-color: var(--theme-color-success-semi);

    & svg.icon {
      stroke: var(--theme-color-success);
    }
  }

  & .button.thumbs-down:hover,
  .button.thumbs-down:focus-visible {
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
