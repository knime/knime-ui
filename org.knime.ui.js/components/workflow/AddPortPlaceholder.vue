<script>

import NodePort from '~/components/workflow/NodePort.vue';
import Port from '~/components/workflow/Port.vue';

export const addPortPlaceholderPath = (() => {
    let cx = 0;
    let cy = 0;
    const r = 6;

    return `M ${cx} ${cy}
            m -${r}, 0
            a ${r},${r} 0 1,1 ${r * 2},0
            a ${r},${r} 0 1,1 -${r * 2},0`;
})();

export default {
    components: {
        NodePort,
        Port
    },
    inject: ['anchorPoint'],
    props: {
        position: {
            type: Array,
            required: true
        },
        side: {
            type: String,
            required: true,
            validator: side => ['input', 'output'].includes(side)
        },
        // the fake index of this NodePort to be able to snap to
        index: {
            type: Number,
            required: true
        },
        nodeId: {
            type: String,
            required: true
        },
        addablePortTypes: {
            type: Array,
            default: null
        },
        // if true, the port will highlight itself
        targeted: {
            type: Boolean,
            default: false
        },
        /** object that contains information which port to highlight */
        targetPort: {
            type: Object,
            default: null
        }
    },
    data: () => ({
        isMenuOpen: false,
        transitionEnabled: true,

        /*
         * if defined, previewPort is the currently active port of the menu.
         * If undefined, the add-port icon is rendered.
         */
        previewPort: null
    }),
    computed: {
        addPortPlaceholderPath: () => addPortPlaceholderPath,
        fakeNodePort() {
            return {
                index: this.index,
                typeId: this.targeted ? this.targetPort.typeId : '__placeholder__',
                connectedVia: [],
                isPlaceHolderPort: true
            };
        }
    },
    watch: {
        isMenuOpen(shouldOpen) {
            // use isMenuOpen as source of truth and react upon change
            if (shouldOpen) {
                this.openMenu();
            } else {
                this.closeMenu();
            }
        }
    },
    methods: {
        openMenu() {
            // find the position in coordinates relative to the origin
            let position = {
                x: this.anchorPoint.x + this.position[0],
                y: this.anchorPoint.y + this.position[1]
            };

            // Tell the WorkflowPanel to render a PortTypeMenu with specified props and events
            // This works like a custom teleport and can probably be replaced by Vue3's teleport
            this.$el.dispatchEvent(new CustomEvent(
                'open-port-type-menu', {
                    detail: {
                        id: `${this.nodeId}-${this.side}`,
                        props: {
                            position,
                            side: this.side,
                            addablePortTypes: this.addablePortTypes
                        },
                        events: {
                            'item-active': this.onItemActive,
                            'item-click': this.onItemClick,
                            'menu-close': this.onRequestClose
                        }
                    },
                    bubbles: true
                }
            ));
        },
        closeMenu() {
            this.$el.dispatchEvent(new CustomEvent(
                'close-port-type-menu', {
                    detail: {
                        id: `${this.nodeId}-${this.side}`
                    },
                    bubbles: true
                }
            ));
        },
        onClick() {
            if (Array.isArray(this.addablePortTypes) && this.addablePortTypes.length === 1) {
                let [typeId] = this.addablePortTypes;
                this.$emit('add-port', typeId);
                return;
            }

            // toggle the menu
            this.isMenuOpen = !this.isMenuOpen;
        },
        onRequestClose(item) {
            if (!item) {
                // If menu closes without selecting an item (eg. when pressing esc), reset preview
                this.previewPort = null;
            }

            this.isMenuOpen = false;
        },

        onItemActive(item) {
            this.previewPort = item?.port;
        },
        onItemClick(item) {
            // directly switch back to add-port icon
            this.transitionEnabled = false;
            this.previewPort = null;

            this.$emit('add-port', item.port.typeId);

            this.$nextTick(() => {
                this.transitionEnabled = true;
            });
        }
    }
};
</script>

<template>
  <g :transform="`translate(${position})`">
    <transition :name="transitionEnabled ? 'port-fade' : 'none'">
      <Port
        v-if="previewPort"
        :key="previewPort.typeId"
        :port="previewPort"
      />
      <NodePort
        v-else
        :key="`placeholder-${side}`"
        :disable-drag="true"
        :node-id="nodeId"
        :direction="side === 'input' ? 'in' : 'out'"
        :port="fakeNodePort"
      >
        <g
          v-if="!targeted"
          :class="['add-port-icon', {
            'active': isMenuOpen
          }]"
          @click="onClick"
        >
          <circle
            r="6.5"
            fill="white"
            stroke="none"
          />
          <path
            :d="addPortPlaceholderPath"
            stroke-width="1"
            stroke="#000"
            fill="none"
            stroke-dasharray="1"
          />
          <line
            y1="0"
            y2="0"
            x1="-3.5"
            x2="3.5"
            stroke="#000"
            stroke-width="1"
          />
          <line
            x1="0"
            x2="0"
            y1="-3.5"
            y2="3.5"
            stroke="#000"
            stroke-width="1"
          />
        </g>
      </NodePort>
    </transition>
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

</style>
