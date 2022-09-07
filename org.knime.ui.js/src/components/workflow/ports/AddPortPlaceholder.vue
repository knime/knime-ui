<script>
import Port from '@/components/common/Port.vue';

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
        nodeId: {
            type: String,
            required: true
        },
        portGroups: {
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

        validPortGroups() {
            if (!this.portGroups) {
                return null;
            }
            
            return Object
                .entries(this.portGroups)
                .filter(([_, group]) => group.canAddInPort || group.canAddOutPort)
                // map back to an object structure after filtering to match the api object shape
                .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
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

            // Because of an issue with Vue Portal (https://github.com/LinusBorg/portal-vue/issues/290)
            // We have to make this work like a custom teleport (can probably be replaced by Vue3's teleport)
            // by telling the WorkflowPanel to render a PortTypeMenu with specified props and events
            this.$el.dispatchEvent(new CustomEvent(
                'open-port-type-menu', {
                    detail: {
                        id: `${this.nodeId}-${this.side}`,
                        props: {
                            position,
                            side: this.side,
                            portGroups: this.validPortGroups
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
            const portGroups = Object.values(this.validPortGroups || {});
            
            if (portGroups.length === 1) {
                const { supportedPortTypeIds } = portGroups[0];

                if (supportedPortTypeIds.length === 1) {
                    let [typeId] = supportedPortTypeIds;
                    this.$emit('add-port', { typeId, portGroup: Object.keys(this.validPortGroups)[0] });
                    return;
                }
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

        onItemClick({ typeId, portGroup }) {
            // directly switch back to add-port icon
            this.transitionEnabled = false;
            this.previewPort = null;

            this.$emit('add-port', { typeId, portGroup });
            
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
      <g
        v-else
        :class="['add-port-icon',{
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
