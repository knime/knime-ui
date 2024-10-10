<script lang="ts">
import { type PropType, defineComponent } from "vue";
import { debounce } from "lodash-es";

import { Button } from "@knime/components";

import { API } from "@/api";
import type { UpdateAvailableEvent } from "@/api/gateway-api/generated-api";

const DOWNLOAD_URL = "https://www.knime.com/downloads?src=knimeappmodernui";

export default defineComponent({
  components: {
    Button,
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
      const knimeAPUpdateAvailable = this.availableUpdates.bugfixes?.includes(
        "KNIME Analytics Platform",
      );

      if (knimeAPUpdateAvailable) {
        return "A new version of KNIME Analytics Platform is available.";
      }

      if (this.hasBugFixes) {
        const totalBugFixes = this.availableUpdates.bugfixes!.length;
        const isPlural = totalBugFixes > 1;

        return isPlural
          ? `${totalBugFixes} extensions have updates available.`
          : "There is an update for 1 extension available.";
      }

      if (this.hasNewReleases) {
        const { newReleases } = this.availableUpdates;

        const { shortName } = newReleases!.at(0)!;
        const baseMessage = "Get the latest features and enhancements!";
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
        window.open(DOWNLOAD_URL);
      }
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
        <Button with-border @click="debouncedUpdateAction">
          {{ buttonText }}
        </Button>
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
      font-family: "Roboto Condensed", sans-serif;
      font-size: 22px;
      color: var(--knime-masala);
      font-weight: 700;
    }
  }
}
</style>
