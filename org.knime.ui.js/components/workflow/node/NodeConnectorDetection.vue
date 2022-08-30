<script>
import { snapConnector } from '~/mixins';

/**
 * Renderless component that provides all the computed/data/methods that the snapConnector mixin requires.
 * Exposes through the default slot information that may be required on the parent. This component's
 * intention is to reduce coupling to the mixin as well as provide an explicit way to declare the mixin dependencies
 * which would make it easier to maintain
 */
export default {
    mixins: [snapConnector],

    props: {
        /**
         * id of the node
         * -- Required by snapConnector mixin
         */
        id: {
            type: String,
            required: true
        },

        /**
         * The position of the node. Contains of an x and a y parameter
         * -- Required by snapConnector mixin
         */
        position: {
            type: Object,
            required: true,
            validator: position => typeof position.x === 'number' && typeof position.y === 'number'
        },

        /**
         * The positions of the ports on the node
         * -- Required by snapConnector mixin
         */
        portPositions: {
            type: Object,
            required: true,
            validator: value => Array.isArray(value.in) && Array.isArray(value.out)
        }
    },

    methods: {
        // -- Required by snapConnector mixin
        isOutsideConnectorHoverRegion(x, y, targetPortDirection) {
            const upperBound = -20;

            if (y < upperBound) {
                return true;
            }
            if (targetPortDirection === 'in' && x > this.$shapes.nodeSize) {
                return true;
            }
            if (targetPortDirection === 'out' && x < 0) {
                return true;
            }

            return false;
        }
    },

    render() {
        return this.$scopedSlots.default({
            // these values are coming in from the snapConnector mixin's data
            targetPort: this.targetPort,
            connectorHover: this.connectorHover,
            connectionForbidden: this.connectionForbidden,
            isConnectionSource: this.isConnectionSource,
            // these methods are declared in the snapConnector mixin's methods
            on: {
                onConnectorStart: this.onConnectorStart,
                onConnectorEnd: this.onConnectorEnd,
                onConnectorEnter: this.onConnectorEnter,
                onConnectorLeave: this.onConnectorLeave,
                onConnectorMove: this.onConnectorMove,
                onConnectorDrop: this.onConnectorDrop
            }
        });
    }
};
</script>
