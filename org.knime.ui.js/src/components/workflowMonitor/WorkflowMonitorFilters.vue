<script setup lang="ts">
import { computed } from "vue";

import type { MenuItem } from "webapps-common/ui/components/MenuItems.vue";
import SubMenu from "webapps-common/ui/components/SubMenu.vue";
import SettingsIcon from "webapps-common/ui/assets/img/icons/settings.svg";
import type { Filter } from "@/store/workflowMonitor";

type Props = {
  activeFilter: Filter;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  change: [payload: Filter];
}>();

const items = computed<MenuItem<{ id: Filter }>[]>(() => [
  {
    text: "Only errors",
    selected: props.activeFilter === "SHOW_ERRORS",
    metadata: {
      id: "SHOW_ERRORS",
    },
  },
  {
    text: "Errors & warnings",
    selected: props.activeFilter === "SHOW_ALL",
    metadata: {
      id: "SHOW_ALL",
    },
  },
]);
</script>

<template>
  <SubMenu
    :items="items"
    :teleport-to-body="false"
    @item-click="(_, item) => emit('change', item.metadata.id)"
  >
    <SettingsIcon />
  </SubMenu>
</template>

<style lang="postcss" scoped>
.filter-text {
  padding-right: 4px;
}
</style>
