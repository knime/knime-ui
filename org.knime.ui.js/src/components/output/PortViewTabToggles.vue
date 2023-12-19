<script setup lang="ts">
import { ref, computed, watch, toRef, onMounted } from "vue";

import OpenInNewWindowIcon from "webapps-common/ui/assets/img/icons/open-in-new-window.svg";
import ValueSwitch from "webapps-common/ui/components/forms/ValueSwitch.vue";
import Button from "webapps-common/ui/components/Button.vue";

import type {
  PortViewDescriptor,
  PortViewDescriptorMapping,
} from "@/api/gateway-api/generated-api";
import type { KnimeNode } from "@/api/custom-types";
import { getPortViewByViewDescriptors } from "@/util/getPortViewByViewDescriptors";
import { compatibility } from "@/environment";

type Props = {
  uniquePortKey: string;
  viewDescriptors: Array<PortViewDescriptor>;
  viewDescriptorMapping: PortViewDescriptorMapping;
  selectedNode: KnimeNode;
  selectedPortIndex: number;
};

const props = defineProps<Props>();

const emit = defineEmits(["openViewInNewWindow"]);

const activeView = ref<number | null>(null);

const tabToggles = computed(() => {
  return getPortViewByViewDescriptors(
    {
      descriptors: props.viewDescriptors,
      descriptorMapping: props.viewDescriptorMapping,
    },
    props.selectedNode,
    props.selectedPortIndex,
  );
});

const setFirstTab = () => {
  activeView.value = tabToggles.value.at(0)
    ? Number(tabToggles.value.at(0).id)
    : null;
};

watch(toRef(props, "uniquePortKey"), () => {
  setFirstTab();
});

onMounted(() => {
  setFirstTab();
});

const openInNewWindow = (item = null) => {
  const viewIndex = item === null ? activeView.value : Number(item.id);
  emit("openViewInNewWindow", viewIndex);
};
</script>

<template>
  <div class="tab-toggles">
    <ValueSwitch
      v-if="tabToggles.length > 1"
      ref="tabToggles"
      class="value-switch"
      compact
      :model-value="activeView === null ? null : activeView.toString()"
      :possible-values="tabToggles"
      @update:model-value="activeView = Number($event)"
    >
      <template v-if="compatibility.canDetachPortViews()" #default="{ item }">
        <Button
          class="open-window"
          :disabled="!item.canDetach || item.disabled"
          :title="`Open ${item.text} view in new window`"
          @click="openInNewWindow(item)"
        >
          <OpenInNewWindowIcon />
        </Button>
      </template>
    </ValueSwitch>
    <Button
      v-else
      with-border
      class="fallback-open-window"
      title="Open port view in new window"
      @click="openInNewWindow(null)"
    >
      <OpenInNewWindowIcon />
      <span>Open in new window</span>
    </Button>
  </div>
  <slot :active-view="activeView" />
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.tab-toggles {
  display: flex;
  width: max-content;
  height: min-content;
  position: absolute;
  inset: 50px 0 0;
  margin: 0 auto;
  z-index: 3;

  & .fallback-open-window {
    height: 20px;
    padding: 0 10px 0 5px;
    font-size: 13px;
    line-height: 0.1;
    border-color: var(--knime-silver-sand);

    & svg {
      margin-left: 5px;

      @mixin svg-icon-size 12;
    }
  }

  & .open-window {
    width: 20px;
    height: 20px;
    padding: 0;
    background: transparent;
    margin: 0;
    border-radius: 0 100% 100% 0;

    &:hover {
      background-color: var(--theme-value-switch-background-color-hover);
    }

    & svg {
      margin-left: 3px;

      @mixin svg-icon-size 12;
    }

    /* keep the background of disabled buttons */
    &[disabled] {
      opacity: 1;

      & svg {
        opacity: 0.5;
      }
    }
  }

  & .value-switch {
    & :deep(input):checked ~ .open-window {
      background: var(--theme-value-switch-background-color-checked);

      & svg {
        stroke: var(--theme-value-switch-background-color);
      }

      &:hover {
        & svg {
          stroke: var(--theme-value-switch-background-color-checked);
        }

        background-color: var(--theme-value-switch-background-color-hover);
      }
    }

    & :deep(label > span) {
      padding-right: 5px;
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
    }
  }
}
</style>
