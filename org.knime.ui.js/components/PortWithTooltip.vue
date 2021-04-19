<script>
import Port from '~/components/Port';
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
    props: { ...Port.props },
    computed: {
        tooltip() {
            // table ports have less space than other ports, because the triangular shape naturally creates a gap
            const gap = this.port.type === 'table' ? 6 : 8; // eslint-disable-line no-magic-numbers
            const { portSize } = this.$shapes;
            return {
                position: {
                    x: this.x,
                    y: this.y - portSize / 2
                },
                gap,
                anchorPoint: this.anchorPoint,
                title: this.port.name,
                text: this.port.info,
                orientation: 'top',
                hoverable: false
            };
        }
    }
};
</script>

<template>
  <Port
    v-bind="this"
  />
</template>
