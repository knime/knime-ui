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
  error?: string;
};
const props = defineProps<Props>();
const emit = defineEmits<{
  submit: [name: string];
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

  <h2 class="title-container">
    <slot v-if="$slots.icon" name="icon" class="icon" />
    <span v-if="!isEditable" :title="title">{{ title }}</span>
    <div v-else class="title-editable-wrapper">
      <textarea
        ref="titleRef"
        v-model="spaceName"
        :title="title"
        rows="1"
        :class="{ editing: isEditing }"
        @focus="onFocus"
        @keydown.enter="onSubmit"
        @keydown.esc="onCancel"
      />
      <span v-if="error" class="msg-error">{{ error }}</span>
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

.title-container {
  position: relative;
  display: flex;
  align-items: flex-start;
  font-size: 24px;
  line-height: 28px;
  gap: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;

  & :slotted(svg) {
    @mixin svg-icon-size 24;
  }
}

.title-editable-wrapper {
  display: flex;
  align-items: center;
  flex-grow: 1;
  gap: 8px;

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

.msg-error {
  position: absolute;
  top: 2em;
  color: var(--theme-color-error);
  align-self: flex-start;
  font-size: 13px;
  font-weight: 400;
}

.hidden {
  visibility: hidden;
}
</style>
