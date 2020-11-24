<script>
import Port from '~/components/Port';
import { mapMutations } from 'vuex';

export default {
    components: {
        Port
    },
    inject: ['anchorPoint'],
    props: { ...Port.props },
    computed: {
        tooltip() {
            // table ports have less space than other ports, because the triangular shape naturally creates a gap
            let tooltipSpacing = this.port.type === 'table' ? 0 : 2;
            const { portSize } = this.$shapes;
            return {
                x: this.x,
                y: this.y - portSize / 2 - tooltipSpacing,
                anchorPoint: this.anchorPoint,
                title: this.port.name,
                text: this.port.info,
                orientation: 'top'
            };
        }
    },
    methods: {
        ...mapMutations('workflow', ['setTooltip']),
        onMouseEnter() {
            this.setTooltip(this.tooltip);
        },
        onMouseLeave() {
            this.setTooltip(null);
        }

    }
};
</script>

<template>
  <Port
    v-bind="this"
    @mouseenter.native="onMouseEnter"
    @mouseleave.native="onMouseLeave"
  />
</template>
