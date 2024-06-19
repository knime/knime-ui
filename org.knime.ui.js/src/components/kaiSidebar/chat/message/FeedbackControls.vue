<script setup lang="ts">
import ThumbsUpIcon from "webapps-common/ui/assets/img/icons/thumbs-up.svg";
import ThumbsDownIcon from "webapps-common/ui/assets/img/icons/thumbs-down.svg";
import Button from "webapps-common/ui/components/Button.vue";
import { ref, watch } from "vue";

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

  & .button {
    width: 20px;
    height: 20px;
    padding: 0;
    position: relative;

    &:first-child {
      margin-right: 9px;
    }

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
