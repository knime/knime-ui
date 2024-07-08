<script lang="ts">
import type { PropType } from "vue";
import Breadcrumb from "webapps-common/ui/components/Breadcrumb.vue";

import { clamp, throttle } from "lodash-es";

interface BreadcrumbItem {
  text: string;
  href?: string;
  id?: string;
  icon?: unknown;
}

const BREADCRUMB_THROTTLE_WHEEL = 150;

/**
 * Wraps the webapps-common Breadcrumb and works with IDs and click events
 * Emits @click with the given id prop in items. Does not support `href` in items.
 */
export default {
  components: {
    Breadcrumb,
  },
  props: {
    items: {
      type: Array as PropType<Array<BreadcrumbItem>>,
      default: () => [],
    },
  },
  emits: ["click"],
  computed: {
    breadcrumbItems() {
      return this.items.map(({ text, icon, id }) => {
        let item: BreadcrumbItem = {
          text,
          icon: icon || null,
        };
        if (id) {
          item.href = `#${encodeURIComponent(id)}`;
        }
        return item;
      });
    },
  },
  methods: {
    onClick({ target }: MouseEvent) {
      if (!target || !(target as HTMLAnchorElement).href) {
        return;
      }

      let { hash } = new URL(
        (target as HTMLAnchorElement).href,
        "file://dummy/",
      );
      let id = decodeURIComponent(hash.replace(/^#/, ""));

      this.$emit("click", { id, target });
    },
    onWheel: throttle(function (this: any, e: WheelEvent) {
      // eslint-disable-next-line no-invalid-this
      const breadcrumbElement = this.$refs.breadcrumb.$el as HTMLElement;
      const maxScroll =
        breadcrumbElement.scrollWidth - breadcrumbElement.offsetWidth;

      breadcrumbElement?.scrollTo({
        left: clamp(breadcrumbElement.scrollLeft + e.deltaY, 0, maxScroll),
        behavior: "smooth",
      });
    }, BREADCRUMB_THROTTLE_WHEEL),
  },
};
</script>

<template>
  <Breadcrumb
    ref="breadcrumb"
    class="action-breadcrumb"
    v-bind="$attrs"
    :items="breadcrumbItems"
    @click.capture.prevent.stop="onClick"
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
