<script lang="ts">
import { defineComponent } from "vue";
import { mapGetters, mapState } from "vuex";

import Button from "webapps-common/ui/components/Button.vue";
import ArrowLeftIcon from "webapps-common/ui/assets/img/icons/arrow-left.svg";
import CubeIcon from "webapps-common/ui/assets/img/icons/cube.svg";
import ServerIcon from "webapps-common/ui/assets/img/icons/server-racks.svg";
import PrivateSpaceIcon from "webapps-common/ui/assets/img/icons/private-space.svg";

import ComputerDesktopIcon from "@/assets/computer-desktop.svg";
import { APP_ROUTES } from "@/router/appRoutes";
import PageHeader from "@/components/common/PageHeader.vue";
import { globalSpaceBrowserProjectId } from "@/store/spaces";

import SpaceExplorer from "./SpaceExplorer.vue";
import SpaceExplorerActions from "./SpaceExplorerActions.vue";

export default defineComponent({
  components: {
    ArrowLeftIcon,
    SpaceExplorer,
    SpaceExplorerActions,
    ComputerDesktopIcon,
    PageHeader,
    Button,
  },

  setup() {
    return {
      globalSpaceBrowserProjectId,
    };
  },

  computed: {
    ...mapState("spaces", ["spaceProviders", "currentSelectedItemIds"]),
    ...mapGetters("spaces", [
      "getSpaceInfo",
      "hasActiveHubSession",
      "isServerProvider",
      "isLocalProvider",
    ]),

    activeSpaceInfo() {
      return this.getSpaceInfo(globalSpaceBrowserProjectId);
    },

    spaceInfo() {
      if (this.isLocalProvider(globalSpaceBrowserProjectId)) {
        return {
          title: "Your local space",
          subtitle: "Local space",
          icon: ComputerDesktopIcon,
        };
      }

      const title = this.activeSpaceInfo.name || "";

      if (this.isServerProvider(globalSpaceBrowserProjectId)) {
        return {
          title,
          subtitle: "Server",
          icon: ServerIcon,
        };
      }

      const isPrivateSpace = this.activeSpaceInfo.private;

      return {
        title,
        subtitle: isPrivateSpace ? "Private space" : "Public space",
        icon: isPrivateSpace ? PrivateSpaceIcon : CubeIcon,
      };
    },
  },

  beforeUnmount() {
    this.setCurrentSelectedItemIds([]);
  },

  methods: {
    setCurrentSelectedItemIds(items: string[]) {
      this.$store.commit("spaces/setCurrentSelectedItemIds", items);
    },

    onBackButtonClick() {
      // TODO: NXT-1461 go back to the Entry page itself
      this.$store.commit(
        "spaces/removeProjectPath",
        globalSpaceBrowserProjectId,
      );
      this.$router.push({ name: APP_ROUTES.EntryPage.GetStartedPage });
    },
  },
});
</script>

<template>
  <main ref="main">
    <div class="sticky-area">
      <PageHeader :title="spaceInfo.title" :subtitle="spaceInfo.subtitle">
        <template #button>
          <button
            class="back-button"
            title="Back"
            @click.prevent="onBackButtonClick"
          >
            <ArrowLeftIcon class="back-icon" />
          </button>
        </template>
        <template #icon>
          <Component :is="spaceInfo.icon" />
        </template>
      </PageHeader>

      <section class="toolbar-wrapper">
        <div class="grid-container">
          <div class="grid-item-12">
            <div class="toolbar">
              <SpaceExplorerActions
                :project-id="globalSpaceBrowserProjectId"
                :selected-item-ids="currentSelectedItemIds"
                @imported-item-ids="setCurrentSelectedItemIds($event)"
              />
            </div>
          </div>
        </div>
      </section>
    </div>

    <section class="space-explorer-wrapper">
      <div class="grid-container">
        <div class="grid-item-12">
          <SpaceExplorer
            :project-id="globalSpaceBrowserProjectId"
            :selected-item-ids="currentSelectedItemIds"
            @update:selected-item-ids="setCurrentSelectedItemIds($event)"
          />
        </div>
      </div>
    </section>
  </main>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

main {
  display: flex;
  flex-direction: column;
  background-color: var(--knime-white);
  overflow-y: scroll;
  height: 100%;
}

.sticky-area {
  display: flex;
  flex-direction: column;
  position: sticky;
  width: 100%;
  top: 0;
  z-index: 1;
  background-color: var(--knime-white);
  box-shadow: var(--shadow-elevation-1);
}

.toolbar-wrapper {
  min-height: 60px;
  background: var(--knime-gray-light-semi);

  & .grid-container,
  & .grid-item-12,
  & .toolbar {
    height: 100%;
  }

  & .toolbar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }
}

.space-explorer-wrapper {
  background: var(--knime-porcelain);
  padding-top: 50px;
  padding-bottom: 80px;
  flex: 1;
}

.back-button {
  background-color: transparent;
  border: none;
  border-right: 1px solid var(--knime-silver-sand);
  width: 50px;
  height: 60px;

  &:hover {
    cursor: pointer;
  }

  &:focus-visible {
    @mixin focus-style;
  }
}

.back-icon {
  @mixin svg-icon-size 30;

  stroke: var(--knime-dove-gray);

  &:hover {
    stroke: var(--knime-masala);
  }
}
</style>
