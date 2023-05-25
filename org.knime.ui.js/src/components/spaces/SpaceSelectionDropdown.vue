<script lang="ts" setup>
import SubMenu from "webapps-common/ui/components/SubMenu.vue";
import DropdownIcon from "webapps-common/ui/assets/img/icons/arrow-dropdown.svg";
import type { MenuItem } from "webapps-common/ui/components/MenuItems.vue";
import ComputerDesktopIcon from "@/assets/computer-desktop.svg";

interface Props {
  spaces: Array<MenuItem>;
}

defineEmits<{
  (e: "change-space", space: MenuItem): void;
}>();

defineProps<Props>();
</script>

<template>
  <div class="space-path-breadcrumb">
    <SubMenu
      :items="spaces"
      class="submenu"
      button-title="Change space"
      orientation="left"
      @item-click="(e, item) => $emit('change-space', item)"
    >
      <ComputerDesktopIcon />
      {{ spaces.find((s) => s.selected)?.text }}
      <DropdownIcon class="dropdown-icon" />
    </SubMenu>
  </div>
</template>

<style lang="postcss">
.space-path-breadcrumb {
  & .dropdown-icon {
    margin-left: 5px;
  }

  & :deep(.submenu-toggle) {
    padding-left: 5px;
  }
}
</style>
