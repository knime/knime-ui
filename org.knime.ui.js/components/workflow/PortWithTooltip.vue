<script>
import Port from '~/components/workflow/Port';
import { tooltip } from '~/mixins';

/**
 * A port with attached tooltip.
 * See Port.vue for docs on the props
 */
export default {
    components: {
        Port
    },
    mixins: [tooltip],
    inject: ['anchorPoint'],
    props: {
        ...Port.props,
        tooltipPosition: {
            type: Array,
            required: true,
            validator: position => Array.isArray(position) && position.length === 2
        }
    },
    computed: {
        tooltip() {
            // table ports have less space than other ports, because the triangular shape naturally creates a gap
            const gap = this.port.type === 'table' ? 6 : 8; // eslint-disable-line no-magic-numbers
            const { portSize } = this.$shapes;
            return {
                position: {
                    x: this.tooltipPosition[0],
                    y: this.tooltipPosition[1] - portSize / 2
                },
                gap,
                anchorPoint: this.anchorPoint,
                title: this.port.name,
                text: this.port.info,
                orientation: 'top',
                hoverable: false
            };
        }
    },
    render(createElement) {
        return createElement(Port, {
            props: this.$props,
            attrs: this.$attrs,
            on: this.$listeners
        });
    }
};
</script>
