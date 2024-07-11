<script>
import { Button, FunctionButton } from "@knime/components";
import ReloadIcon from "@knime/styles/img/icons/reload.svg";
import CopyIcon from "@knime/styles/img/icons/copy.svg";
import CheckIcon from "@knime/styles/img/icons/check.svg";
import WarningIcon from "@knime/styles/img/icons/circle-warning.svg";
import SwitchIcon from "@knime/styles/img/icons/perspective-switch.svg";

/**
 * Error.vue
 * This Overlay is to be shown whenever an an error is thrown in KNIME UI (Frontend) that hasn't been caught yet
 * This can include uncaught errors caused or thrown by the backend
 *
 * The user can reload the browser page and should be able to continue to work
 *
 */
export default {
  components: {
    Button,
    ReloadIcon,
    CopyIcon,
    CheckIcon,
    WarningIcon,
    SwitchIcon,
    FunctionButton,
  },
  props: {
    message: {
      type: String,
      default: null,
    },
    stack: {
      type: String,
      default: null,
    },
    vueInfo: {
      type: String,
      default: null,
    },
  },
  emits: ["close"],
  data: () => ({
    copied: false,
  }),
  computed: {
    errorDetails() {
      let details = [this.message, this.vueInfo, this.stack];
      // TODO: NXT-595 add version
      return details.filter(Boolean).join("\n\n");
    },
  },
  methods: {
    reloadApp() {
      // redirect to the index.html page to trigger a refetch of the whole app
      window.location.href = "/index.html";
    },
    async copyToClipboard() {
      const content = JSON.stringify(
        {
          app: "KnimeUI",
          // version: // TODO: NXT-595
          message: this.message,
          vueInfo: this.vueInfo,
          stack: this.stack,
        },
        null,
        2,
      );

      await navigator.clipboard.writeText(content);

      this.copied = true;
    },
    switchToJavaUI() {
      window.switchToJavaUI();
    },
  },
};
</script>

<template>
  <div class="error-overlay" @keydown.stop>
    <div class="background" />
    <div class="content">
      <FunctionButton class="switch-classic" @click="switchToJavaUI">
        <SwitchIcon />
      </FunctionButton>
      <div class="header" @click="$emit('close')">
        <h2><WarningIcon /> Sorry, KNIME UI has stopped due to an error.</h2>
        <div class="message">
          Hitting the reload button should bring you back to KNIME Modern UI,
          while you could also switch back to KNIME Analytics Platform via the
          button on the top right.
        </div>
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

      <!-- eslint-disable vue/no-textarea-mustache -->
      <textarea class="stack" readonly>{{ errorDetails }}</textarea>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.error-overlay {
  position: fixed;
  z-index: 10;
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
  z-index: 0;
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
