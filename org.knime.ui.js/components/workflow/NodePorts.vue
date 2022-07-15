<script>
import { mapGetters } from 'vuex';
import { placeholderPosition, portPositions } from '~/util/portShift';
import NodePort from '~/components/workflow/NodePort';
import AddPortPlaceholder from '~/components/workflow/AddPortPlaceholder';

/**
 * This component renders and handles interactions with a Node's Ports
 * It needs to be a direct child of <Node> because is coupled by direct access to portBarBottom
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
    computed: {
        ...mapGetters('workflow', ['isDragging']),

        isMetanode() {
            return this.nodeKind === 'metanode';
        },

        isComponent() {
            return this.nodeKind === 'component';
        },
        /**
         * @returns {object} the position of all inPorts and outPorts.
         * The position for each port is an array with two coordinates [x, y].
         * Format as required by snapConnector mixin
         */
        portPositions() {
            return {
                in: portPositions(
                    { portCount: this.inPorts.length, isMetanode: this.isMetanode }
                ),
                out: portPositions(
                    { portCount: this.outPorts.length, isMetanode: this.isMetanode, isOutports: true }
                )
            };
        },
        addPortPlaceholderPositions() {
            return {
                in: placeholderPosition(
                    { portCount: this.inPorts.length, isMetanode: this.isMetanode }
                ),
                out: placeholderPosition(
                    { portCount: this.outPorts.length, isMetanode: this.isMetanode, isOutport: true }
                )
            };
        },
        /* accessed by parent Node.vue */
        portBarBottom() {
            let portPositions = this.portPositions;

            let lastInPort = portPositions.in[portPositions.in.length - 1];
            let lastOutPort = portPositions.out[portPositions.out.length - 1];

            // take y-position of last port in the list or default to 0 for an empty list
            let lastInPortY = lastInPort?.[1] || 0;
            let lastOutPortY = lastOutPort?.[1] || 0;

            return Math.max(lastInPortY, lastOutPortY) + this.$shapes.portSize / 2;
        }
    },
    methods: {
        canSelectPort(port) {
            switch (this.nodeKind) {
                case 'component':
                    // skip hidden variable ports on components (mickey mouse)
                    return port.index !== 0;
                case 'metanode':
                    // allow for all metanode ports
                    return true;
                default:
                    return false;
            }
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
      :key="`inport-${port.index}`"
      :class="['port', portAnimationClasses(port)]"
      :relative-position="portPositions.in[port.index]"
      :port="port"
      :node-id="nodeId"
      :targeted="targetPort && targetPort.side === 'in' && targetPort.index === port.index"
      :can-select="canSelectPort(port)"
      direction="in"
    />

    <NodePort
      v-for="port of outPorts"
      :key="`outport-${port.index}`"
      :class="['port', portAnimationClasses(port)]"
      :relative-position="portPositions.out[port.index]"
      :port="port"
      :node-id="nodeId"
      :targeted="targetPort && targetPort.side === 'out' && targetPort.index === port.index"
      :can-select="canSelectPort(port)"
      direction="out"
    />

    <AddPortPlaceholder
      v-if="isEditable && (isComponent || isMetanode)"
      :node-id="nodeId"
      :position="addPortPlaceholderPositions.in"
      :class="['add-port', {
        'node-hover': hover,
        'connector-hover': connectorHover,
        'node-selected': isSingleSelected,
      }]"
      side="input"
      @open-port-type-menu.native="onPortTypeMenuOpen($event)"
      @close-port-type-menu.native="onPortTypeMenuClose($event)"
    />

    <AddPortPlaceholder
      v-if="isEditable && (isComponent || isMetanode)"
      :node-id="nodeId"
      :position="addPortPlaceholderPositions.out"
      :class="['add-port', {
        'node-hover': hover,
        'connector-hover': connectorHover,
        'node-selected': isSingleSelected,
      }]"
      side="output"
      @open-port-type-menu.native="onPortTypeMenuOpen($event)"
      @close-port-type-menu.native="onPortTypeMenuClose($event)"
    />
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
