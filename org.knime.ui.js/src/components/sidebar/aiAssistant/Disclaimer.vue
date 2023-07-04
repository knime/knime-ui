<script setup lang="ts">
import { ref } from "vue";

import Button from "webapps-common/ui/components/Button.vue";
import CloseIcon from "webapps-common/ui/assets/img/icons/close.svg";

defineProps({
  text: {
    type: String,
    required: true,
  },
});

const showDisclaimer = ref(true);

const closeDisclaimer = () => {
  showDisclaimer.value = false;
};
</script>

<template>
  <div v-if="showDisclaimer" class="disclaimer">
    <Button class="close-button" @click="closeDisclaimer">
      <CloseIcon />
    </Button>
    <div class="title">Disclaimer</div>
    <p class="content">
      {{ text }}
    </p>
  </div>
</template>

<style lang="postcss" scoped>
& .disclaimer {
  background-color: var(--knime-white);
  position: relative;
  padding: 14px 14px 7px;

  & .title {
    text-decoration: underline;
  }

  & .content {
    overflow-wrap: break-word;
    white-space: pre-wrap;
  }

  & .close-button {
    padding: 0;
    position: absolute;
    top: 8px;
    right: 0;
  }
}
</style>
