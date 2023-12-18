<script lang="ts">
import { defineComponent, type PropType } from "vue";

import OpenInNewWindowIcon from "webapps-common/ui/assets/img/icons/open-in-new-window.svg";
import ValueSwitch from "webapps-common/ui/components/forms/ValueSwitch.vue";
import Button from "webapps-common/ui/components/Button.vue";

import type {
  PortViewDescriptor,
  PortViewDescriptorMapping,
} from "@/api/gateway-api/generated-api";
import type { KnimeNode } from "@/api/custom-types";
import { getPortViewByViewDescriptors } from "@/util/getPortViewByViewDescriptors";
import { DynamicEnvRenderer } from "@/environment";

interface ComponentData {
  activeView: number | null;
  position: { top: string; left: string };
}

export default defineComponent({
  components: {
    Button,
    OpenInNewWindowIcon,
    ValueSwitch,
    DynamicEnvRenderer,
  },

  props: {
    uniquePortKey: {
      type: String,
      required: true,
    },

    viewDescriptors: {
      type: Array as PropType<Array<PortViewDescriptor>>,
      required: true,
    },

    viewDescriptorMapping: {
      type: Object as PropType<PortViewDescriptorMapping>,
      required: true,
    },

    selectedNode: {
      type: Object as PropType<KnimeNode>,
      required: true,
    },

    selectedPortIndex: {
      type: Number,
      required: true,
    },
  },

  emits: ["openViewInNewWindow"],

  data(): ComponentData {
    return {
      activeView: null,
      position: {
        top: "0",
        left: "0",
      },
    };
  },

  computed: {
    tabToggles() {
      return getPortViewByViewDescriptors(
        {
          descriptors: this.viewDescriptors,
          descriptorMapping: this.viewDescriptorMapping,
        },
        this.selectedNode,
        this.selectedPortIndex,
      );
    },
  },

  watch: {
    uniquePortKey() {
      this.setFirstTab();
    },
  },

  mounted() {
    this.setFirstTab();
  },

  methods: {
    setFirstTab() {
      this.activeView = this.tabToggles.at(0)
        ? Number(this.tabToggles.at(0).id)
        : null;
    },

    resetActiveView() {
      this.activeView = null;
    },

    openInNewWindow(item = null) {
      const viewIndex = item === null ? this.activeView : Number(item.id);
      this.$emit("openViewInNewWindow", viewIndex);
    },
  },
});
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
      <template #default="{ item }">
        <DynamicEnvRenderer value="DESKTOP">
          <Button
            class="open-window"
            :disabled="!item.canDetach || item.disabled"
            :title="`Open ${item.text} view in new window`"
            @click="openInNewWindow(item)"
          >
            <OpenInNewWindowIcon />
          </Button>
        </DynamicEnvRenderer>
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
