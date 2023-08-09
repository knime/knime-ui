<script lang="ts">
import type {
  PortViewDescriptor,
  PortViewDescriptorMapping,
} from "@/api/gateway-api/generated-api";
import { defineComponent, type PropType } from "vue";
import { mapPortViewDescriptorsToItems } from "@/util/mapPortViewDescriptorsToItems";

import OpenInNewWindowIcon from "webapps-common/ui/assets/img/icons/open-in-new-window.svg";
import ValueSwitch from "webapps-common/ui/components/forms/ValueSwitch.vue";
import Button from "webapps-common/ui/components/Button.vue";

interface ComponentData {
  activeView: number | null;
  position: { top: string; left: string };
}

export default defineComponent({
  components: {
    Button,
    OpenInNewWindowIcon,
    ValueSwitch,
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

    currentNodeState: {
      type: String as PropType<"configured" | "executed">,
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
      return mapPortViewDescriptorsToItems(
        {
          descriptors: this.viewDescriptors,
          descriptorMapping: this.viewDescriptorMapping,
        },
        this.currentNodeState,
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
      compact
      :model-value="activeView === null ? null : activeView.toString()"
      :possible-values="tabToggles"
      @update:model-value="activeView = Number($event)"
    >
      <template #default="{ item }">
        <Button
          class="open-window"
          title="Open port view in new window"
          @click="openInNewWindow(item)"
        >
          <OpenInNewWindowIcon />
        </Button>
      </template>
    </ValueSwitch>
    <Button
      v-else
      class="fallback-open-window"
      title="Open port view in new window"
      @click="openInNewWindow"
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
  height: calc(var(--wrapper-height) * 1px);

  & .fallback-open-window {
    height: 20px;
    padding: 0 3px;
    margin-left: 5px;
    font-size: 13px;
    line-height: 0.1;
    border-color: var(--knime-silver-sand);

    & svg {
      margin-left: 7px;

      @mixin svg-icon-size 14;
    }
  }

  & .open-window {
    width: 25px;
    padding: 0;
    margin: 0 8px;

    & svg {
      &:hover {
        background: white;
      }

      margin-left: 3px;

      @mixin svg-icon-size 14;
    }

    & :deep(input:checked) svg {
      stroke: var(--knime-white);
    }
  }

  position: absolute;
  inset: 50px 0 0;
  margin: 0 auto;
  z-index: 3;
}
</style>
