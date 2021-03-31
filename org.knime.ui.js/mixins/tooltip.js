/**
 * This tooltip mixin handles appearance and disappearance of tooltips
 * The tooltip is reactive. It expects the target component to have a watchable 'tooltip' property, though
 *
 * There are two modes:
 * 1. [touchable = false] when the mouse leaves the target component the tooltip will be closed
 * 2. [touchable = true] when the mouse leaves the target but enters the tooltip it will not be closed
 */
export const tooltip = {
    mounted() {
        this.$el.addEventListener('mouseenter', this.onTooltipMouseEnter);
        this.$el.addEventListener('mouseleave', this.onTooltipMouseLeave);
    },
    beforeDestroy() {
        this.$el.removeEventListener('mouseenter', this.onTooltipMouseEnter);
        this.$el.removeEventListener('mouseleave', this.onTooltipMouseLeave);
    },
    methods: {
        onTooltipMouseEnter(e) {
            if (this.removeTooltipWatcher) {
                this.removeTooltipWatcher();
            }

            // eslint-disable-next-line no-undefined
            if (this.tooltip === undefined) {
                return;
            }

            // add watcher to component's "tooltip" property
            this.removeTooltipWatcher = this.$watch(
                'tooltip',
                (value) => this.$store.commit('workflow/setTooltip', value),
                { immediate: true }
            );
        },
        onTooltipMouseLeave({ relatedTarget }) {
            consola.trace('mouse left to:', relatedTarget?.tagName, relatedTarget?.id,
                relatedTarget?.classList);

            if (this.tooltip?.touchable) {
                let tooltipContainer = document.getElementById('tooltip-container');
                if (tooltipContainer && tooltipContainer.contains(relatedTarget)) {
                    // abort removing tooltip
                    return;
                }
            }

            // remove tooltip
            this.$store.commit('workflow/setTooltip', null);

            // remove watcher
            this.removeTooltipWatcher();
            this.removeTooltipWatcher = null;
        }
    }
};
