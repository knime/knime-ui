<script lang="ts">
import type { PropType } from "vue";
import Breadcrumb from "webapps-common/ui/components/Breadcrumb.vue";

interface BreadcrumbItem {
  text: string;
  href?: string;
  id?: string;
  icon?: unknown;
}

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
  },
};
</script>

<template>
  <Breadcrumb
    class="action-breadcrumb"
    v-bind="$attrs"
    :items="breadcrumbItems"
    @click.capture.prevent.stop="onClick"
  />
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.action-breadcrumb {
  & :deep(a):focus-visible {
    @mixin focus-style;
  }
}
</style>
