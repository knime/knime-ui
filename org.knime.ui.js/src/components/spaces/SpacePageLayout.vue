<script setup lang="ts">
import Breadcrumb from "webapps-common/ui/components/Breadcrumb.vue";
import type { BreadcrumbItem } from "./usePageBreadcrumbs";

type Props = {
  title: string;
  breadcrumbs: Array<BreadcrumbItem>;
};

defineProps<Props>();
</script>

<template>
  <main ref="main">
    <div class="title-wrapper">
      <Breadcrumb
        class="breadcrumbs"
        :items="breadcrumbs"
        @click-item="(item: BreadcrumbItem) => item.onClick?.()"
      />

      <h2 class="title">
        <slot v-if="$slots.icon" name="icon" class="icon" />
        <span :title="title">
          {{ title }}
        </span>
      </h2>
    </div>

    <div class="toolbar-wrapper">
      <slot name="toolbar" />
    </div>

    <div class="content-wrapper">
      <slot name="content" />
    </div>
  </main>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

main {
  --padding: 30px;

  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--knime-porcelain);
  border-left: 1px solid var(--knime-silver-sand);

  & .title-wrapper {
    padding: var(--padding) var(--padding) 10px;

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
      overflow: hidden;

      & span {
        width: calc(100vw - 500px);

        @mixin truncate;
      }

      & :slotted(svg) {
        @mixin svg-icon-size 24;
      }
    }
  }

  & .toolbar-wrapper {
    min-height: 50px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 0 var(--padding);
    background-color: var(--knime-gray-ultra-light);
    border-top: 1px solid var(--knime-silver-sand);
    border-bottom: 1px solid var(--knime-silver-sand);
  }

  & .content-wrapper {
    padding: var(--padding);
    overflow: hidden auto;
    height: 100%;
  }
}
</style>
