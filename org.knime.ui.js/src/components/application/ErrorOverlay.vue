<script setup lang="ts">
import { computed, ref, version } from "vue";

import { Button, FunctionButton } from "@knime/components";
import CheckIcon from "@knime/styles/img/icons/check.svg";
import WarningIcon from "@knime/styles/img/icons/circle-warning.svg";
import CopyIcon from "@knime/styles/img/icons/copy.svg";
import SwitchIcon from "@knime/styles/img/icons/perspective-switch.svg";
import ReloadIcon from "@knime/styles/img/icons/reload.svg";

import { API } from "@/api";
import DynamicEnvRenderer from "@/environment/DynamicEnvRenderer.vue";
import { copyErrorReportToClipboard } from "@/util/copyErrorReportToClipboard";

/**
 * ErrorOverlay.vue
 * This Overlay is to be shown whenever an an error is thrown in KNIME UI (Frontend) that hasn't been caught yet
 * This can include uncaught errors caused or thrown by the backend
 *
 * The user can reload the browser page and should be able to continue to work
 *
 */

type Props = {
  message: string;
  stack?: string;
};

const props = withDefaults(defineProps<Props>(), {
  stack: "",
});

const emit = defineEmits<{
  close: [];
}>();

const copied = ref(false);

const errorDetails = computed(() => {
  const details = [props.message, `Vue: ${version}`, props.stack];
  // TODO: NXT-584 add AP version
  return details.filter(Boolean).join("\n\n");
});

const reloadApp = () => {
  // redirect to the index.html page to trigger a refetch of the whole app
  window.location.href = "/index.html";
};

const copyToClipboard = async () => {
  await copyErrorReportToClipboard({
    // TODO: NXT-584 add AP version
    message: props.message,
    stack: props.stack,
  });

  copied.value = true;
};

const switchToJavaUI = () => {
  API.desktop.switchToJavaUI();
};
</script>

<template>
  <div class="error-overlay" @keydown.stop>
    <div class="background" />
    <div class="content">
      <DynamicEnvRenderer value="DESKTOP">
        <FunctionButton class="switch-classic" @click="switchToJavaUI">
          <SwitchIcon />
        </FunctionButton>
      </DynamicEnvRenderer>

      <div class="header" @click="emit('close')">
        <h2>
          <WarningIcon /> Sorry, the KNIME Analytics Platform has stopped due to
          an error.
        </h2>
        <div class="message">
          Hitting the reload button should bring you back to UI.
        </div>

        <DynamicEnvRenderer value="DESKTOP">
          <div class="message">
            You could also switch back to Classic UI via the button on the top
            right.
          </div>
        </DynamicEnvRenderer>
      </div>

      <div class="actions">
        <Button primary on-dark @click="reloadApp">
          <ReloadIcon />
          Reload
        </Button>
        <Button
          with-border
          on-dark
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

      <textarea class="stack" readonly :value="errorDetails" />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.error-overlay {
  position: fixed;
  z-index: v-bind("$zIndices.layerGlobalErrorOverlay");
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.background {
  position: fixed;
  width: 100%;
  height: 100%;
  background-color: var(--knime-masala);
  opacity: 0.9;
}

.content {
  position: fixed;
  padding: 20px 60px;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-around;

  & .switch-classic {
    height: 40px;
    width: 40px;
    border: 1px solid var(--knime-dove-gray);
    position: fixed;
    top: 18px;
    right: 15px;

    & svg {
      @mixin svg-icon-size 26;

      stroke: var(--knime-white);
    }
  }

  & .header {
    color: white;
    text-align: center;
    font-family: "Roboto Condensed", sans-serif;

    & h2 {
      font-size: 38px;
      font-weight: 400;
      margin: 0;
    }

    & .message {
      margin: 10px auto;
      max-width: 690px;
      font-size: 20px;
    }

    & svg {
      margin-right: 6px;
      position: relative;
      top: 8px;
      width: 44px;
      height: 44px;
      stroke: var(--knime-white);

      /* 2px stroke-width */
      stroke-width: calc(32px / 22);
    }
  }

  & .actions {
    text-align: center;

    & > * {
      margin-left: 5px;
      margin-right: 5px;
    }

    & > .button {
      padding: 12px 16px;
      height: 43px;
    }

    & svg {
      stroke: var(--knime-masala);

      @mixin svg-icon-size 18;
    }

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

  & .stack {
    font-family: "Roboto Mono", sans-serif;
    padding: 28px;
    background-color: white;
    border-radius: 4px;
    width: 100%;
    resize: none;
    white-space: pre;
    min-height: 50%;
  }
}
</style>
