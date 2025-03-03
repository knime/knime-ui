<script lang="ts">
import { type PropType, defineComponent } from "vue";
import { API } from "@api";
import { debounce } from "lodash-es";

import { Button, FunctionButton } from "@knime/components";
import CloseIcon from "@knime/styles/img/icons/close.svg";

import type { UpdateAvailableEvent } from "@/api/gateway-api/generated-api";
import { knimeExternalUrls } from "@/plugins/knimeExternalUrls";

export default defineComponent({
  components: {
    Button,
    FunctionButton,
    CloseIcon,
  },
  props: {
    /**
     * Object containing available updates
     */
    availableUpdates: {
      type: Object as PropType<UpdateAvailableEvent>,
      default: () => ({}) as UpdateAvailableEvent,
    },
  },
  emits: ["dismiss"],
  data() {
    return {
      isDialogOpen: false,
      debouncedUpdateAction: null as any,
    };
  },
  computed: {
    hasBugFixes() {
      return (
        this.availableUpdates.bugfixes &&
        this.availableUpdates.bugfixes.length > 0
      );
    },

    hasNewReleases() {
      return (
        this.availableUpdates.newReleases &&
        this.availableUpdates.newReleases.length > 0
      );
    },

    hasReleaseAndIsUpdatePossible() {
      if (!this.hasNewReleases) {
        return false;
      }

      const { newReleases } = this.availableUpdates;

      return newReleases!.every(({ isUpdatePossible }) => isUpdatePossible);
    },

    buttonText() {
      return this.hasBugFixes || this.hasReleaseAndIsUpdatePossible
        ? "Update"
        : "Download";
    },

    updateMessage() {
      if (this.hasBugFixes) {
        const totalBugFixes = this.availableUpdates.bugfixes!.length;
        const isPlural = totalBugFixes > 1;

        if (isPlural) {
          return `${totalBugFixes} extensions have updates available.`;
        }

        return "1 extension update available.";
      }

      if (this.hasNewReleases) {
        const { newReleases } = this.availableUpdates;

        const { shortName } = newReleases!.at(0)!;
        const baseMessage =
          "A new version of KNIME Analytics Platform is available.";
        const updateMessage = `${baseMessage} Update to ${shortName} now.`;
        const downloadMessage = `${baseMessage} Download ${shortName} now.`;

        return this.hasReleaseAndIsUpdatePossible
          ? updateMessage
          : downloadMessage;
      }

      return null;
    },
  },
  mounted() {
    this.debouncedUpdateAction = debounce(this.onUpdateAction, 600);
  },
  methods: {
    onUpdateAction() {
      if (this.isDialogOpen) {
        return;
      }

      if (this.hasBugFixes || this.hasReleaseAndIsUpdatePossible) {
        this.isDialogOpen = true;
        API.desktop.openUpdateDialog().finally(() => {
          this.isDialogOpen = false;
        });
      } else {
        window.open(knimeExternalUrls.KNIME_DOWNLOADS_URL);
      }
    },
    // Method to dismiss the banner
    onDismiss() {
      this.$emit("dismiss");
    },
  },
});
</script>

<template>
  <section v-if="availableUpdates" class="footer-wrapper">
    <div class="grid-container">
      <div class="grid-item-12 update-bar">
        <span class="text">
          {{ updateMessage }}
        </span>
        <div class="button-container">
          <!-- Compact Update Button -->
          <Button with-border compact @click="debouncedUpdateAction">
            {{ buttonText }}
          </Button>
          <!-- Compact Function (Dismiss) Button -->
          <FunctionButton class="dismiss-button" @click="onDismiss">
            <CloseIcon class="close-icon" />
          </FunctionButton>
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

section.footer-wrapper {
  background-color: var(--knime-yellow);

  & .grid-container {
    & .update-bar {
      height: var(--app-update-banner-height);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: Roboto, sans-serif;
      font-size: 20px;
      color: var(--knime-masala);
      font-weight: 600;
    }
  }
}

.button-container {
  display: flex;
  align-items: center;
}

.dismiss-button {
  width: 30px;
  height: 30px;
  margin-left: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--knime-masala);
}

.close-icon {
  width: 18px;
  height: 18px;
}
</style>
