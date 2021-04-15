<script>
import Button from '~/webapps-common/ui/components/Button';
import ReloadIcon from '~/webapps-common/ui/assets/img/icons/reload.svg?inline';
import CopyIcon from '~/webapps-common/ui/assets/img/icons/copy.svg?inline';
import WarningIcon from '~/assets/error.svg?inline';
import { copyText } from '~/webapps-common/util/copyText.js';

export default {
    components: {
        Button,
        ReloadIcon,
        CopyIcon,
        WarningIcon
    },
    props: {
        message: {
            type: String,
            default: null
        },
        stack: {
            type: String,
            default: null
        },
        vueInfo: {
            type: String,
            default: null
        }
    },
    methods: {
        reloadApp() {
            window.location.reload();
        },
        copyToClipboard() {
            copyText(JSON.stringify({
                app: 'KnimeUI',
                version: process.env.version, // eslint-disable-line no-process-env
                message: this.message,
                vueInfo: this.vueInfo,
                stack: this.stack
            }, null, 2));
        }
    }
};
</script>

<template>
  <div
    class="error-overlay"
    @keydown.stop
  >
    <div class="background" />
    <div class="content">
      <div class="header">
        <h2><WarningIcon />Sorry! KNIME has stopped due to an error.</h2>
        <div class="message">“{{ message }}”</div>
      </div>
      <div class="actions">
        <Button
          with-border
          on-dark
          @click="copyToClipboard"
        >
          <CopyIcon />
          Copy to clipboard
        </Button>
        <Button
          primary
          on-dark
          @click="reloadApp"
        >
          <ReloadIcon />
          Reload app
        </Button>
      </div>

      <!-- eslint-disable vue/no-textarea-mustache -->
      <textarea
        class="stack"
        readonly
      >{{ vueInfo ? vueInfo + '\n' : '' }}{{ stack }}</textarea>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
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

  & .header {
    color: white;
    text-align: center;
    font-family: 'Roboto Condensed', sans-serif;

    & h2 {
      font-size: 38px;
      font-weight: 400;
      margin: 0;
    }

    & .message {
      margin-top: 10px;
      font-size: 20px;
    }

    & svg {
      margin-right: 6px;
      position: relative;
      top: 8px;
      width: 44px;
      height: 44px;
      stroke: var(--knime-white);
      stroke-width: calc(32px / 22); /* 2px stroke-width */
    }
  }

  & .actions {
    text-align: center;

    & > * {
      margin-left: 5px;
      margin-right: 5px;
    }

    & > .button {
      padding: 12px 16px 12px 16px;
      height: 43px;
    }

    & svg {
      width: 18px;
      height: 18px;
      stroke: var(--knime-masala);
      stroke-width: calc(32px / 18); /* 1px stroke width */
    }
  }

  & .stack {
    font-family: 'Roboto Mono', sans-serif;
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
