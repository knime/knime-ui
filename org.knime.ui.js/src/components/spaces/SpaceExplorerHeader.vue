<script setup lang="ts">
import { computed, ref } from "vue";
import Breadcrumb from "webapps-common/ui/components/Breadcrumb.vue";
import SaveIcon from "webapps-common/ui/assets/img/icons/check.svg";
import CancelIcon from "webapps-common/ui/assets/img/icons/close.svg";
import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";
import { useStore } from "@/composables/useStore";

import type { BreadcrumbItem } from "./usePageBreadcrumbs";
import { useActiveRouteData } from "./useActiveRouteData";

type Props = {
  title: string;
  breadcrumbs: Array<BreadcrumbItem>;
};
const props = defineProps<Props>();
const store = useStore();

const { activeSpaceProvider, activeSpace } = useActiveRouteData();

const spaceName = ref(props.title);
const editing = ref(false);
const titleRef = ref<HTMLElement | null>(null);

const canEdit = computed(() => {
  return typeof activeSpace.value !== "undefined";
});

const onFocus = () => {
  editing.value = true;
};

const onRename = () => {
  store.dispatch("spaces/renameSpace", {
    spaceProviderId: activeSpaceProvider.value.id,
    spaceId: activeSpace.value?.id,
    spaceName: spaceName.value,
  });
};

const onCancel = () => {
  titleRef.value?.blur();
  spaceName.value = props.title;
  editing.value = false;
};
</script>

<template>
  <Breadcrumb
    class="breadcrumbs"
    :items="breadcrumbs"
    @click-item="(item: BreadcrumbItem) => item.onClick?.()"
  />

  <h2 class="title">
    <slot v-if="$slots.icon" name="icon" class="icon" />
    <textarea
      ref="titleRef"
      v-model="spaceName"
      :title="title"
      rows="1"
      :class="{ editable: canEdit, editing }"
      @focus="onFocus"
    />
    <FunctionButton
      :class="{ hidden: !canEdit || !editing }"
      title="Save"
      primary
      @click="onRename"
    >
      <SaveIcon />
    </FunctionButton>
    <FunctionButton
      :class="{ hidden: !canEdit || !editing }"
      title="Cancel"
      @click="onCancel"
    >
      <CancelIcon />
    </FunctionButton>
  </h2>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");
& .breadcrumbs {
  margin-left: -4px;
}

& .title {
  display: flex;
  align-items: center;
  font-size: 24px;
  line-height: 28px;
  gap: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;

  & textarea {
    display: block;
    width: 100%;
    border: 0;
    padding: 0;
    margin: 0;
    resize: none;
    background-color: transparent;
    font: inherit;
    letter-spacing: inherit;
    overflow: hidden;
    color: inherit;
    outline: none;

    &.editable {
      &:hover {
        outline: 1px solid var(--knime-silver-sand);
      }

      &:focus,
      &.editing {
        outline: 1px solid var(--knime-masala);
      }
    }
  }

  & :slotted(svg) {
    @mixin svg-icon-size 24;
  }
}

.hidden {
  visibility: hidden;
}
</style>
