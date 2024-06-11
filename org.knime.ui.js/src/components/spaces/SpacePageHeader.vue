<script setup lang="ts">
import { ref } from "vue";
import Breadcrumb from "webapps-common/ui/components/Breadcrumb.vue";
import SaveIcon from "webapps-common/ui/assets/img/icons/check.svg";
import CancelIcon from "webapps-common/ui/assets/img/icons/close.svg";
import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";

import type { BreadcrumbItem } from "./usePageBreadcrumbs";

type Props = {
  title: string;
  breadcrumbs: Array<BreadcrumbItem>;
  isEditable: boolean;
};
const props = defineProps<Props>();
const emit = defineEmits<{
  (e: "submit", name: string): void;
}>();

const spaceName = ref(props.title);
const isEditing = ref(false);
const titleRef = ref<HTMLElement | null>(null);

const onFocus = () => {
  isEditing.value = true;
};

const onSubmit = () => {
  emit("submit", spaceName.value);
  titleRef.value?.blur();
  isEditing.value = false;
};

const onCancel = () => {
  titleRef.value?.blur();
  spaceName.value = props.title;
  isEditing.value = false;
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
    <span v-if="!isEditable" :title="title">{{ title }}</span>
    <div v-else>
      <textarea
        ref="titleRef"
        v-model="spaceName"
        :title="title"
        rows="1"
        :class="{ editing: isEditing }"
        @focus="onFocus"
      />
      <FunctionButton
        :class="{ hidden: !isEditing }"
        title="Save"
        primary
        @click="onSubmit"
      >
        <SaveIcon />
      </FunctionButton>
      <FunctionButton
        :class="{ hidden: !isEditing }"
        title="Cancel"
        @click="onCancel"
      >
        <CancelIcon />
      </FunctionButton>
    </div>
  </h2>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");
& .breadcrumbs {
  margin-left: -4px;
}

.title {
  display: flex;
  align-items: center;
  font-size: 24px;
  line-height: 28px;
  gap: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;

  & div {
    display: flex;
    align-items: center;
    flex-grow: 1;
    gap: 8px;

    textarea {
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
      white-space: inherit;
      color: inherit;
      outline: none;

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
