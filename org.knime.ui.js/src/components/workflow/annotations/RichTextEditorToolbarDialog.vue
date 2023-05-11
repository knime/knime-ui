<script setup lang="ts">
import { nextTick, ref, toRefs, watch } from 'vue';
import { createPopper, type Instance as PopperInstance } from '@popperjs/core';

interface Props {
  isOpen: boolean;
}

const props = defineProps<Props>();

const { isOpen } = toRefs(props);

const toolbarElement = ref<HTMLElement | null>(null);
const toolbarDialogElement = ref<HTMLElement | null>(null);
const popperInstance = ref<PopperInstance | null>(null);

const showDialog = () => {
    const yOffset = 20;
    popperInstance.value = createPopper(
        toolbarElement.value,
        toolbarDialogElement.value,
        {
            placement: 'bottom',
            strategy: 'absolute',
            modifiers: [
                { name: 'preventOverflow' },
                {
                    name: 'offset',
                    options: { offset: [0, yOffset] }
                }
            ]
        }
    );
};

const hideDialog = () => {
    if (popperInstance.value) {
        popperInstance.value.destroy();
    }
};

watch(isOpen, async () => {
    const toggle = isOpen.value ? showDialog : hideDialog;
    await nextTick();
    toggle();
});
</script>

<template>
  <div ref="toolbarElement">
    <slot
      name="toggle"
      :is-open="isOpen"
    />
  </div>

  <div
    v-if="isOpen"
    ref="toolbarDialogElement"
    class="dialog"
  >
    <slot name="content" />
  </div>
</template>

<style lang="postcss" scoped>
.dialog {
    background: white;
    box-shadow: 0 0 10px rgb(62 58 57 / 30%);
}
</style>
