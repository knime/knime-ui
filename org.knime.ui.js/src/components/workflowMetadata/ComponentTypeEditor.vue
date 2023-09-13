<script setup lang="ts">
import Label from "webapps-common/ui/components/forms/Label.vue";
import DropdownIcon from "webapps-common/ui/assets/img/icons/arrow-dropdown.svg";
import SubMenu from "webapps-common/ui/components/SubMenu.vue";
import { computed, h } from "vue";
import ComponentTypeSvgIcon from "@/components/workflowMetadata/ComponentTypeSvgIcon.vue";
import * as nodeBackgroundColors from "webapps-common/ui/colors/nodeColors.mjs";
import { HibiscusDark as colorHibiscusDark } from "webapps-common/ui/colors/knimeColors.mjs";
import type { ComponentNodeAndDescription } from "@/api/gateway-api/generated-api";

interface Props {
  componentTypes: Array<string>;
  modelValue: string;
}

const props = defineProps<Props>();

const getTypeIcon = (type: string) => {
  return () =>
    h(ComponentTypeSvgIcon, {
      color: nodeBackgroundColors[type] || colorHibiscusDark,
    });
};

const componentTypeMenuItems = computed(() => [
  {
    text: "Default",
    icon: getTypeIcon("Component"),
    metadata: { id: "Component" },
  },
  ...props.componentTypes.map((type) => ({
    text: type,
    icon: getTypeIcon(type),
    metadata: { id: type },
  })),
]);

const activeComponentType = computed(() => {
  return (
    componentTypeMenuItems.value.find(
      (type) => type.metadata.id === props.modelValue,
    ) || { icon: "", text: "" }
  );
});

const emit = defineEmits<{
  (
    e: "update:modelValue",
    componentType: ComponentNodeAndDescription.TypeEnum,
  ): void;
}>();
</script>

<template>
  <Label text="Type" compact class="label">
    <div>
      <SubMenu
        :items="componentTypeMenuItems"
        orientation="left"
        class="type-submenu"
        :teleport-to-body="false"
        positioning-strategy="absolute"
        @item-click="(_, item) => emit('update:modelValue', item.metadata.id)"
      >
        <template #default="{ expanded }">
          <Component :is="activeComponentType.icon" />
          <span class="type-current-text">{{ activeComponentType.text }}</span>
          <DropdownIcon class="dropdown-icon" :class="{ flip: expanded }" />
        </template>
      </SubMenu>
    </div>
  </Label>
</template>

<style scoped lang="postcss">
@import url("@/assets/mixins.css");

.label {
  margin-bottom: 10px;
}

.type-submenu {
  & .dropdown-icon {
    margin-left: 5px;
    margin-right: 5px;
    margin-top: 3px;

    @mixin svg-icon-size 12;

    &.flip {
      transform: scaleY(-1);
    }
  }
}
</style>
