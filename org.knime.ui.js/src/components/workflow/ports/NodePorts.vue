<script>
import { mapGetters, mapActions } from 'vuex';
import { placeholderPosition, portPositions } from '@/util/portShift';

import AddPortPlaceholder from './AddPortPlaceholder.vue';
import NodePort from './NodePort.vue';

/**
 * This component renders and handles interactions with a Node's Ports
 */
export default {
    components: {
        NodePort,
        AddPortPlaceholder
    },
    props: {
        nodeId: {
            type: String,
            required: true
        },

        nodeKind: {
            type: String,
            required: true,
            validator: kind => ['node', 'metanode', 'component'].includes(kind)
        },
        /**
         * Input ports. List of configuration objects passed-through to the `Port` component
         */
        inPorts: {
            type: Array,
            required: true
        },

        /**
         * Output ports. List of configuration objects passed-through to the `Port` component
         */
        outPorts: {
            type: Array,
            required: true
        },

        portGroups: {
            type: Object,
            default: null
        },

        /** object that contains information which port to highlight */
        targetPort: {
            type: Object,
            default: null
        },

        isEditable: {
            type: Boolean,
            default: false
        },

        /** Interaction state of Node.vue that is passed through */
        hover: {
            type: Boolean,
            default: false
        },
        connectorHover: {
            type: Boolean,
            default: false
        },
        isSingleSelected: {
            type: Boolean,
            default: false
        }
    },
    emits: ['updatePortPositions'],
    data: () => ({
        selectedPort: null
    }),
    computed: {
        ...mapGetters('workflow', ['isDragging', 'isWritable']),

        isMetanode() {
            return this.nodeKind === 'metanode';
        },
        isComponent() {
            return this.nodeKind === 'component';
        },
        /**
         * @returns {object} the position of all inPorts and outPorts.
         * The position for each port is an array with two coordinates [x, y].
         */
        portPositions() {
            let positions = {
                in: portPositions({
                    portCount: this.inPorts.length,
                    isMetanode: this.isMetanode
                }),
                out: portPositions({
                    portCount: this.outPorts.length,
                    isMetanode: this.isMetanode,
                    isOutports: true
                })
            };

            // add placeholder positions to enable the drop to a placeholder
            if (this.canAddPort.input) {
                positions.in.push(placeholderPosition({
                    portCount: this.inPorts.length,
                    isMetanode: this.isMetanode
                }));
            }

            if (this.canAddPort.output) {
                positions.out.push(placeholderPosition({
                    portCount: this.outPorts.length,
                    isMetanode: this.isMetanode,
                    isOutport: true
                }));
            }
            return positions;
        },
        addPortPlaceholderPositions() {
            // the last position is the one of the placeholder
            return {
                input: this.portPositions.in[this.portPositions.in.length - 1],
                output: this.portPositions.out[this.portPositions.out.length - 1]
            };
        },
        /* eslint-disable brace-style, curly */
        canAddPort() {
            if (!this.isWritable) return { input: false, output: false };

            if (this.isComponent || this.isMetanode) return { input: true, output: true };

            if (this.portGroups) {
                let portGroups = Object.values(this.portGroups);
                return {
                    input: portGroups.some(portGroup => portGroup.canAddInPort),
                    output: portGroups.some(portGroup => portGroup.canAddOutPort)
                };
            }

            // Native node without port groups
            return { input: false, output: false };
        }
    },
    watch: {
        isDragging(isDragging, wasDragging) {
            if (isDragging && !wasDragging) {
                this.selectedPort = null;
            }
        },
        portPositions: {
            immediate: true,
            handler(portPositions) {
                this.$emit('updatePortPositions', portPositions);
            }
        }
    },
    methods: {
        ...mapActions('workflow', ['addNodePort', 'removeNodePort']),
        onPortClick({ index, portGroupId }, side) {
            if (!this.isWritable) {
                return;
            }

            let selectPort = () => {
                this.selectedPort = `${side}-${index}`;
            };

            if (this.nodeKind === 'component' && index !== 0)
                // all but hidden ports on components (mickey mouse) can be selected
                selectPort();
            else if (this.nodeKind === 'metanode')
                selectPort();
            else if (portGroupId) {
                // native node and port is part of a port group
                let portGroup = this.portGroups[portGroupId];
                let [, upperBound] = portGroup[`${side}Range`];

                // select last port of group
                this.selectedPort = `${side}-${upperBound}`;
            }
        },
        onDeselectPort() {
            this.selectedPort = null;
        },
        // default flow variable ports (Mickey Mouse ears) are only shown if connected, selected, or on hover
        portAnimationClasses(port) {
            let isMickeyMousePort = !this.isMetanode && port.index === 0;

            if (!isMickeyMousePort) {
                return {};
            }

            return {
                'mickey-mouse': true,
                'connector-hover': this.connectorHover,
                'connected': port.connectedVia.length, // eslint-disable-line quote-props
                'node-hover': this.hover
            };
        },
        isPortTargeted({ index }, side) {
            return this.targetPort?.side === side && this.targetPort.index === index;
        },
        isPlaceholderPortTargeted(side) {
            return side === 'input'
                ? this.isPortTargeted({ index: this.inPorts.length }, 'in')
                : this.isPortTargeted({ index: this.outPorts.length }, 'out');
        },
        addPort({ side, typeId, portGroup }) {
            this.addNodePort({
                nodeId: this.nodeId,
                side,
                typeId,
                portGroup
            });
        },
        removePort({ portGroupId, index }, side) {
            this.removeNodePort({
                nodeId: this.nodeId,
                side,
                index,
                portGroup: portGroupId
            });
            this.selectedPort = null;
        },
        onPortTypeMenuOpen(e) {
            // show add-port button
            e.target.style.opacity = 1;

            // clear the close-timeout of this button if set
            clearTimeout(e.target.closeTimeout);
        },
        onPortTypeMenuClose(e) {
            // after closing the menu, keep the add-port button for 1s,
            // then go back to styling by css
            e.target.closeTimeout = setTimeout(() => {
                e.target.style.opacity = null;
            }, 1000);
        }
    }
};
</script>

<template>
  <g>
    <NodePort
      v-for="port of inPorts"
      :key="`input-${port.index}`"
      :class="['port', portAnimationClasses(port)]"
      direction="in"
      :node-id="nodeId"
      :node-kind="nodeKind"
      :port="port"
      :relative-position="portPositions.in[port.index]"
      :selected="selectedPort === `input-${port.index}`"
      :targeted="isPortTargeted(port, 'in')"
      :disable-quick-node-add="isMetanode || isComponent"
      @click="onPortClick(port, 'input')"
      @remove="removePort(port, 'input')"
      @deselect="onDeselectPort"
    />

    <NodePort
      v-for="port of outPorts"
      :key="`output-${port.index}`"
      :class="['port', portAnimationClasses(port)]"
      direction="out"
      :node-id="nodeId"
      :node-kind="nodeKind"
      :port="port"
      :relative-position="portPositions.out[port.index]"
      :selected="selectedPort === `output-${port.index}`"
      :targeted="isPortTargeted(port, 'out')"
      :disable-quick-node-add="isMetanode || isComponent"
      @click="onPortClick(port, 'output')"
      @remove="removePort(port, 'output')"
      @deselect="onDeselectPort"
    />

    <template v-for="side in ['input', 'output']">
      <AddPortPlaceholder
        v-if="canAddPort[side]"
        :key="side"
        :side="side"
        :targeted="isPlaceholderPortTargeted(side)"
        :target-port="targetPort"
        :node-id="nodeId"
        :position="addPortPlaceholderPositions[side]"
        :port-groups="portGroups"
        :class="['add-port', {
          'node-hover': hover,
          'connector-hover': connectorHover,
          'node-selected': isSingleSelected,
        }]"
        @add-port="addPort({ side, typeId: $event.typeId, portGroup: $event.portGroup })"
        @open-port-type-menu="onPortTypeMenuOpen($event)"
        @close-port-type-menu="onPortTypeMenuClose($event)"
      />
    </template>
  </g>
</template>

<style lang="postcss" scoped>
.port {
  transition: transform 120ms ease;

  &.mickey-mouse {
    /* TODO: NXT-1058 why is this transition no applied when the .connected class is removed? */
    opacity: 0;
    transition: opacity 0.5s 0.25s;

    &.node-hover {
      /* fade-in port with delay when node is hovered */
      transition: opacity 0.5s 0.5s;
      opacity: 1;
    }

    &:hover {
      /* immediately show port on direct hover */

      /* TODO: NXT-1058 why is "transition: opacity 0;" not working? */
      transition: none;
      opacity: 1;
    }

    &.connector-hover {
      /* fade-in port without delay on connectorHover */
      transition: opacity 0.25s;
      opacity: 1;
    }

    &.connected {
      /* fade in port when a connection has been created */
      transition: opacity 0.25s;
      opacity: 1;
    }
  }
}

.add-port {
  opacity: 0;
  transition:
    opacity 0.2s,
    transform 120ms ease-out;

  &.node-selected,
  &.node-hover {
    opacity: 1;
  }

  &.connector-hover {
    opacity: 1;
    transition: opacity 0s;
  }
}
</style>
