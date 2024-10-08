<script setup lang="ts">
import { computed, ref } from "vue";
import { clamp, throttle } from "lodash-es";

import { Breadcrumb, type BreadcrumbItem } from "@knime/components";

const BREADCRUMB_THROTTLE_WHEEL = 150;

/**
 * Wraps the webapps-common Breadcrumb and works with IDs and click events
 * Emits @click with the given id prop in items. Does not support `href` in items.
 */

type Props = {
  items?: Array<BreadcrumbItem>;
};

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
});

const emit = defineEmits<{
  click: [payload: { id: string }];
}>();

const breadcrumbItems = computed(() =>
  props.items.map(
    (item) =>
      ({
        ...item,
        id: item.id,
        clickable: Boolean(item.id),
      }) satisfies BreadcrumbItem,
  ),
);

const breadcrumb = ref<InstanceType<typeof Breadcrumb>>();

const onWheel = throttle(function (e: WheelEvent) {
  if (!breadcrumb.value) {
    return;
  }

  const breadcrumbElement = breadcrumb.value.$el as HTMLElement;
  const maxScroll =
    breadcrumbElement.scrollWidth - breadcrumbElement.offsetWidth;

  breadcrumbElement?.scrollTo({
    left: clamp(breadcrumbElement.scrollLeft + e.deltaY, 0, maxScroll),
    behavior: "smooth",
  });
}, BREADCRUMB_THROTTLE_WHEEL);
</script>

<template>
  <Breadcrumb
    ref="breadcrumb"
    class="action-breadcrumb"
    v-bind="$attrs"
    :items="breadcrumbItems"
    @click-item="emit('click', { id: $event.id })"
    @wheel="onWheel"
  />
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.action-breadcrumb {
  overflow-x: auto; /* Scroll breadcrumb with hidden scrollbar in ... */
  -ms-overflow-style: none; /* ... Edge */
  scrollbar-width: none; /* ... Firefox */
  &::-webkit-scrollbar {
    display: none; /* ... Chrome, Safari and Opera */
  }

  & :deep(a):focus-visible {
    @mixin focus-outline;
  }
}
</style>
