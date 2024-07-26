<script setup lang="ts">
import KNIMETriangleIcon from "@knime/styles/img/KNIME_Triangle.svg";
import ExtensionIcon from "@knime/styles/img/icons/extension.svg";

import type { NativeNodeDescriptionWithExtendedPorts } from "@/util/portDataMapper";

type Props = {
  descriptionData: NativeNodeDescriptionWithExtendedPorts;
};

defineProps<Props>();
</script>

<template>
  <div
    v-if="descriptionData.extension && descriptionData.extension.vendor"
    class="extension-info"
  >
    <div class="header">
      <ExtensionIcon class="icon" />
      <span>Extension</span>
    </div>

    <div class="extension-name">
      {{ descriptionData.extension.name }}
    </div>

    <div class="extension-vendor">
      provided by {{ descriptionData.extension.vendor.name }}
      <KNIMETriangleIcon
        v-if="descriptionData.extension.vendor.isKNIME"
        class="knime-icon"
      />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.extension-info {
  & > .header {
    display: flex;
    align-items: center;
    font-size: 16px;
    line-height: 150%;
    font-weight: 700;
    margin-bottom: 10px;

    & span {
      margin-left: 5px;
    }

    & .icon {
      @mixin svg-icon-size 18;
    }
  }

  & .extension-name,
  & .extension-vendor {
    font-size: 13px;
    line-height: 150%;

    & .knime-icon {
      @mixin svg-icon-size 18;

      fill: var(--knime-dove-gray);
    }
  }

  & .extension-name {
    font-weight: 700;
  }
}
</style>
