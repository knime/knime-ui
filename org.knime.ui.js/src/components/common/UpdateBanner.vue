<script>
import { mapState } from 'vuex';
import Button from 'webapps-common/ui/components/Button.vue';

export default {
    components: {
        Button
    },
    computed: {
        ...mapState('application', ['availableUpdates']),
        updateMessage() {
            if (this.availableUpdates.newReleases) {
                const availableUpdate = this.availableUpdates.newReleases
                    .find(({ isUpdatePossible }) => isUpdatePossible);
                const { shortName: updateVersion } = availableUpdate;

                return `Get the latest features and enhancements! Update now to ${updateVersion}`;
            }

            if (this.availableUpdates.bugfixes.length === 1) {
                return 'There is an update for 1 extension available.';
            }

            if (this.availableUpdates.bugfixes.length > 1) {
                return `There are updates for ${this.availableUpdates.bugfixes.length} extensions available.`;
            }

            return null;
        }
    },
    methods: {
        openUpdateDialog() {
            window.openUpdateDialog();
        }
    }
};
</script>

<template>
  <section class="footer-wrapper">
    <div class="grid-container">
      <div class="grid-item-12 update-bar">
        <span class="text">
          {{ updateMessage }}
        </span>
        <Button
          with-border
          @click="openUpdateDialog"
        >
          Update now
        </Button>
      </div>
    </div>
  </section>
</template>

<style lang="postcss" scoped>
@import "@/assets/mixins.css";

section.footer-wrapper {
  background-color: var(--knime-yellow);

  & .grid-container {
    & .update-bar {
      height: 100px;
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
