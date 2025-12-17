<script setup lang="ts">
import { API } from "@api";

import { Button } from "@knime/components";
import FilterCheckIcon from "@knime/styles/img/icons/filter-check.svg";
import LinkExternalIcon from "@knime/styles/img/icons/link-external.svg";

import MoreNodesIllustration from "@/assets/more-nodes-illustration.svg";
import DownloadAPButton from "@/components/common/DownloadAPButton.vue";
import { isDesktop } from "@/environment";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import DummyNodesEmptyState from "../common/DummyNodesEmptyState.vue";

type Props = {
  numFilteredOutNodes: number;
  isNodeListEmpty: boolean;
  searchHubLink: string;
  mini: boolean;
};

defineProps<Props>();

const uiControls = useUIControlsStore();

const openKnimeUIPreferencePage = () => {
  API.desktop.openWebUIPreferencePage();
};
</script>

<template>
  <div v-if="numFilteredOutNodes > 0" class="filtered-nodes-wrapper">
    <div class="filtered-nodes-content">
      <template v-if="isDesktop()">
        <DummyNodesEmptyState
          :icon="FilterCheckIcon"
          button-text="Change filter settings"
          @click="openKnimeUIPreferencePage"
        >
          <template #default>
            <strong>Change filter settings</strong> to “All nodes“ to see more
            advanced nodes matching your search criteria.
          </template>
        </DummyNodesEmptyState>
      </template>

      <template v-else>
        <span class="text-center">
          There are no available matching nodes. To work with more nodes,
          download the KNIME Analytics Platform.
        </span>

        <DownloadAPButton
          v-if="uiControls.shouldDisplayDownloadAPButton"
          compact
          src="node-repository"
          class="filtered-nodes-button"
        />
      </template>
    </div>
  </div>

  <div
    v-else-if="isNodeListEmpty"
    class="filtered-nodes-wrapper"
    :class="{ mini }"
  >
    <template v-if="isDesktop()">
      <div class="filtered-nodes-content">
        <MoreNodesIllustration class="empty-img" />

        <span class="text-center">
          There are no matching nodes. Search
          <strong>KNIME Community Hub</strong>
          to find more nodes and extensions.
        </span>

        <Button
          class="filtered-nodes-button"
          primary
          compact
          :href="searchHubLink"
        >
          <LinkExternalIcon />
          <span>Search on KNIME Community Hub</span>
        </Button>
      </div>
    </template>

    <div v-else class="filtered-nodes-content">
      <MoreNodesIllustration class="empty-img" />

      <span class="text-center">
        There are more open source extensions and nodes available in the full
        version of the KNIME Analytics Platform.
      </span>
      <br />
      <span v-if="!mini" class="text-center">
        For example, such as reporting, access to and processing of complex data
        types, as well as the addition of advanced machine learning algorithms
        and much more.
      </span>

      <DownloadAPButton
        compact
        src="node-repository"
        class="filtered-nodes-button"
      />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.text-center {
  text-align: center;
}

.filtered-nodes-wrapper {
  padding-top: var(--space-16);
  display: flex;
  align-items: center;
  margin: 0 var(--space-12);

  & .filtered-nodes-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-weight: 500;
    font-size: 13px;
    width: 100%;

    & .filtered-nodes-button {
      margin-top: var(--space-16);
    }
  }

  & .empty-img {
    @mixin svg-icon-size 200;
  }
}
</style>
