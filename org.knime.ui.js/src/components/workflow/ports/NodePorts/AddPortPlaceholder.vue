<script lang="ts">
import { defineComponent, type PropType, nextTick } from "vue";
import { mapActions, mapMutations, mapState } from "vuex";
import Port from "@/components/common/Port.vue";
import type { MenuItemWithPort, TargetPort } from "./types";
import type { WorkflowState } from "@/store/workflow";
import type { NodePortGroups } from "@/api/custom-types";
import type { XY } from "@/api/gateway-api/generated-api";

export const addPortPlaceholderPath = (() => {
  let cx = 0;
  let cy = 0;
  const r = 6;

  return `M ${cx} ${cy}
            m -${r}, 0
            a ${r},${r} 0 1,1 ${r * 2},0
            a ${r},${r} 0 1,1 -${r * 2},0`;
})();

type ComponentData = {
  transitionEnabled: boolean;
  closeTimeout: number | null;
};

export default defineComponent({
  components: {
    Port,
  },
  inject: ["anchorPoint"],
  props: {
    position: {
      type: Array as PropType<Array<number>>,
      required: true,
    },
    side: {
      type: String,
      required: true,
      validator: (side: string) => ["input", "output"].includes(side),
    },
    nodeId: {
      type: String,
      required: true,
    },
    portGroups: {
      type: Object as PropType<NodePortGroups | null>,
      default: null,
    },
    /** if true, the placeholder will be replaced with a preview of the targetPort */
    targeted: {
      type: Boolean,
      default: false,
    },
    /** object that contains information which port to highlight */
    targetPort: {
      type: Object as PropType<TargetPort | null>,
      default: null,
    },
    /** if true, this placeholder is selected in its owning NodePorts */
    selected: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["addPort"],
  expose: ["isMenuOpen", "onClick"],
  data: (): ComponentData => ({
    transitionEnabled: true,
    closeTimeout: null,
  }),
  computed: {
    ...mapState("workflow", {
      portTypeMenu: (state: unknown) => (state as WorkflowState).portTypeMenu,
    }),

    addPortPlaceholderPath: () => addPortPlaceholderPath,
    validPortGroups() {
      if (!this.portGroups) {
        return null;
      }

      return (
        Object.entries(this.portGroups)
          .filter(([_, group]) => group.canAddInPort || group.canAddOutPort)
          // map back to an object structure after filtering to match the api object shape
          .reduce(
            (acc, [key, value]) => ({ ...acc, [key]: value }),
            {} as NodePortGroups,
          )
      );
    },
    isMenuOpen() {
      return (
        this.portTypeMenu.isOpen &&
        this.portTypeMenu.nodeId === this.nodeId &&
        this.portTypeMenu.props?.side === this.side
      );
    },
    previewPort() {
      // show either the selected port of the menu or the targeted port for drag & drop to this placeholder
      if (this.targeted) {
        return this.targetPort;
      }
      if (this.isMenuOpen) {
        return this.selectedPort;
      }
      return null;
    },
    selectedPort: {
      // use global store state for preview
      get() {
        return this.portTypeMenu.previewPort;
      },
      set(value: WorkflowState["portTypeMenu"]) {
        this.setPortTypeMenuPreviewPort(value);
      },
    },
  },
  watch: {
    isMenuOpen(isOpen) {
      // make the + visible when the menu is open and hide it with a timeout of 1sec if it closes
      if (isOpen) {
        this.$el.style.opacity = "1";

        if (this.closeTimeout) {
          // clear the close-timeout of this button if set
          clearTimeout(this.closeTimeout);
        }
      } else {
        // after closing the menu, keep the add-port button for 1s,
        // then go back to styling by css
        this.closeTimeout = window.setTimeout(() => {
          this.$el.style.opacity = null;
        }, 1000);
      }
    },
  },
  methods: {
    ...mapActions("workflow", ["openPortTypeMenu", "closePortTypeMenu"]),
    ...mapMutations("workflow", ["setPortTypeMenuPreviewPort"]),
    openMenu() {
      // find the position in coordinates relative to the origin
      let position = {
        x: (this.anchorPoint as XY).x + this.position[0],
        y: (this.anchorPoint as XY).y + this.position[1],
      };

      this.openPortTypeMenu({
        nodeId: this.nodeId,
        props: {
          side: this.side,
          position,
          portGroups: this.validPortGroups,
        },
        events: {
          itemActive: this.onItemActive,
          itemClick: this.onItemClick,
          menuClose: this.onRequestClose,
        },
      });
    },
    closeMenu() {
      this.closePortTypeMenu();
    },
    onClick() {
      if (this.isMenuOpen) {
        this.closeMenu();
        return;
      }

      const portGroups = Object.values(this.validPortGroups || {});

      if (portGroups.length === 1) {
        const { supportedPortTypeIds } = portGroups[0];

        if (supportedPortTypeIds?.length === 1) {
          let [typeId] = supportedPortTypeIds;
          this.$emit("addPort", {
            typeId,
            portGroup: Object.keys(this.validPortGroups!)[0],
          });
          return;
        }
      }

      this.openMenu();
    },
    onRequestClose(item: MenuItemWithPort | null) {
      if (!item) {
        // If menu closes without selecting an item (eg. when pressing esc), reset preview
        this.selectedPort = null;
      }
      this.closeMenu();
    },

    onItemActive(item: MenuItemWithPort) {
      this.selectedPort = item?.port ?? null;
    },

    async onItemClick({
      typeId,
      portGroup,
    }: {
      typeId: string;
      portGroup: string | null;
    }) {
      // directly switch back to add-port icon
      this.transitionEnabled = false;
      this.selectedPort = null;

      this.$emit("addPort", { typeId, portGroup });

      await nextTick();
      this.transitionEnabled = true;
    },
  },
});
</script>

<template>
  <g :transform="`translate(${position})`">
    <Transition :name="transitionEnabled ? 'port-fade' : 'none'">
      <Port
        v-if="previewPort && previewPort.typeId"
        :key="previewPort.typeId"
        :port="previewPort"
      />
      <!-- placeholder plus icon -->
      <g
        v-else
        :class="[
          'add-port-icon',
          {
            active: isMenuOpen,
          },
        ]"
        @click="onClick"
      >
        <circle v-if="selected" class="selection-outline" r="9.5" />
        <circle r="6.5" fill="white" stroke="none" />
        <path
          :d="addPortPlaceholderPath"
          stroke-width="1"
          stroke="#000"
          fill="none"
          stroke-dasharray="1"
        />
        <line y1="0" y2="0" x1="-3.5" x2="3.5" stroke="#000" stroke-width="1" />
        <line x1="0" x2="0" y1="-3.5" y2="3.5" stroke="#000" stroke-width="1" />
      </g>
    </Transition>
  </g>
</template>

<style lang="postcss" scoped>
.port-fade-enter-active,
.port-fade-leave-active {
  transition: opacity 100ms ease;
}

.port-fade-enter {
  opacity: 0.2;
}

.port-fade-leave-to {
  opacity: 0.2;
}

.add-port-icon {
  cursor: pointer;

  &:hover {
    transition: transform 0.17s cubic-bezier(0.8, 2, 1, 2.5);
    transform: scale(1.15);
  }

  &.active,
  &:active {
    transition: transform 80ms;
    transform: scale(0.8);
  }

  & path,
  & line {
    pointer-events: none;
  }
}

.selection-outline {
  fill: white;
  stroke: var(--knime-cornflower-dark);
}
</style>
