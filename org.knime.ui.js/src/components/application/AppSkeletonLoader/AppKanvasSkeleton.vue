<script setup lang="ts">
import { ref, toRef, watch } from "vue";

import { Button } from "@knime/components";
import KnimeIcon from "@knime/styles/img/KNIME_Triangle.svg";
import CheckIcon from "@knime/styles/img/icons/check.svg";
import CopyIcon from "@knime/styles/img/icons/copy.svg";
import ReloadIcon from "@knime/styles/img/icons/reload.svg";

type Props = {
  isLogoShown: boolean;
  workflowError?: Error | null;
};

const props = defineProps<Props>();

const copied = ref(false);

watch(toRef(props, "workflowError"), () => {
  copied.value = false;
});

const reloadApp = () => {
  // redirect to the index.html page to trigger a refetch of the whole app
  window.location.href = "/index.html";
};

const copyToClipboard = async () => {
  if (props.workflowError) {
    await navigator.clipboard.writeText(props.workflowError?.message);

    copied.value = true;
  }
};
</script>

<template>
  <div class="canvas-skeleton">
    <KnimeIcon v-if="isLogoShown && !workflowError" class="elastic-spin" />

    <div v-if="workflowError" class="error">
      <h3>This workflow could not be loaded</h3>

      <div class="details">
        <span><strong>Details: </strong></span>
        <p>{{ workflowError.message }}</p>
      </div>

      <div class="actions">
        <Button primary compact @click="reloadApp">
          <ReloadIcon />
          Reload
        </Button>
        <Button
          with-border
          compact
          :class="['copy-to-clipboard', { copied }]"
          @click="copyToClipboard"
        >
          <span class="success">
            <CheckIcon />
            Copied
          </span>
          <span class="default">
            <CopyIcon />
            Copy error
          </span>
        </Button>
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.canvas-skeleton {
  display: flex;
  flex: 1;
  justify-content: center;

  & svg {
    @mixin svg-icon-size 50;
  }

  & .elastic-spin {
    transform-origin: 50% 65%;
    animation: elastic-spin 3.8s infinite ease;
  }
}

.error {
  text-align: center;

  & .details {
    text-align: left;

    & p {
      margin-top: 0;
    }
  }

  & .actions {
    display: flex;
    gap: var(--space-8);
    justify-content: center;
    margin-top: var(--space-32);

    & > .copy-to-clipboard {
      position: relative;

      & .success {
        opacity: 0;
        position: absolute;
      }

      & > span {
        transition: opacity 100ms ease;
      }

      &.copied {
        background-color: var(--knime-meadow);
        border-color: var(--knime-meadow);
        color: var(--knime-white);

        & svg {
          stroke: var(--knime-white);
        }

        & .success {
          opacity: 1;
        }

        & .default {
          opacity: 0;
        }
      }
    }
  }
}
</style>
