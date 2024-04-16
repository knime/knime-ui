<script setup lang="ts">
import { API } from "@api";
import CircleInfoIcon from "webapps-common/ui/assets/img/icons/circle-info.svg";
import FilterCheckIcon from "webapps-common/ui/assets/img/icons/filter-check.svg";
import Button from "webapps-common/ui/components/Button.vue";
import DownloadAPButton from "@/components/common/DownloadAPButton.vue";
import { isDesktop } from "@/environment";

type Props = {
  numFilteredOutNodes: number;
  isNodeListEmpty: boolean;
  showDownloadButton: boolean;
  searchHubLink: string;
};

defineProps<Props>();

const openKnimeUIPreferencePage = () => {
  API.desktop.openWebUIPreferencePage();
};
</script>

<template>
  <div v-if="numFilteredOutNodes > 0" class="filtered-nodes-wrapper">
    <CircleInfoIcon class="info-icon" />
    <div class="filtered-nodes-content">
      <template v-if="isDesktop">
        <span>
          Change filter settings to “All nodes“ to see more advanced nodes
          matching your search criteria.
        </span>
        <Button
          primary
          compact
          class="filtered-nodes-button"
          @click="openKnimeUIPreferencePage"
        >
          <FilterCheckIcon />Change filter settings
        </Button>
      </template>
      <template v-else>
        <span>
          There are no available matching nodes. To work with more nodes,
          download the KNIME Analytics Platform.
        </span>
        <DownloadAPButton
          v-if="showDownloadButton"
          compact
          src="node-repository"
          class="filtered-nodes-button"
        />
      </template>
    </div>
  </div>
  <div v-else-if="isNodeListEmpty" class="filtered-nodes-wrapper">
    <CircleInfoIcon class="info-icon" />
    <div class="filtered-nodes-content">
      <span>There are no matching nodes.</span>
      <span
        >Search the
        <a :href="searchHubLink">KNIME Community Hub</a>
        to find more nodes and extensions.</span
      >
      <DownloadAPButton
        v-if="showDownloadButton"
        compact
        src="node-repository"
        class="filtered-nodes-button"
      />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.filtered-nodes-wrapper {
  border-top: 1px solid var(--knime-silver-sand);
  padding-top: 20px;
  display: flex;
  align-items: center;
  margin: 20px 10px;

  & .info-icon {
    @mixin svg-icon-size 20;

    stroke: var(--knime-masala);
    min-width: 20px;
    margin-right: 10px;
  }

  & .filtered-nodes-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    font-weight: 500;
    font-size: 13px;
    font-style: italic;
    width: 100%;

    & .filtered-nodes-button {
      margin-top: 15px;
    }
  }
}
</style>
