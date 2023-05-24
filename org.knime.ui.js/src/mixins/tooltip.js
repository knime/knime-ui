/**
 * This tooltip mixin handles appearance and disappearance of tooltips
 * The tooltip is reactive. It expects the target component to have a watchable 'tooltip' property, though
 * The tooltip container is expected to have [id='tooltip-container']
 *
 * There are two modes:
 * 1. [hoverable = false] when the mouse leaves the target component the tooltip will be closed
 * 2. [hoverable = true] when the mouse leaves the target but enters the tooltip it will not be closed
 */

export const entryDelay = 750;

export const tooltip = {
  mounted() {
    this.$el.addEventListener("mouseenter", this.onTooltipMouseEnter);
    this.$el.addEventListener("mouseleave", this.onTooltipMouseLeave);
  },
  beforeUnmount() {
    this.$el.removeEventListener("mouseenter", this.onTooltipMouseEnter);
    this.$el.removeEventListener("mouseleave", this.onTooltipMouseLeave);

    if (this.removeTooltipWatcher) {
      this.$store.commit("workflow/setTooltip", null);
    }
  },
  watch: {
    // takes care of removing the tooltip watcher even if the tooltip got closed from any other component (set null)
    "$store.state.workflow.tooltip"(value) {
      if (value === null) {
        this.removeTooltipWatcher?.();
      }
    },
  },
  methods: {
    onTooltipMouseEnter() {
      this.removeTooltipWatcher?.();

      // eslint-disable-next-line no-undefined
      if (this.tooltip === undefined) {
        consola.error(
          "Tooltip mixin is used without providing a tooltip property"
        );
        return;
      }

      // wait for entryDelay to set tooltip
      this.tooltipTimeout = setTimeout(this.showTooltip, entryDelay);
    },
    showTooltip() {
      // add watcher to component's "tooltip" property
      let removeWatcher = this.$watch(
        "tooltip",
        (value) => this.$store.commit("workflow/setTooltip", value),
        { immediate: true }
      );

      // provide method to remove the "tooltip" watcher
      this.removeTooltipWatcher = () => {
        removeWatcher();
        this.removeTooltipWatcher = null;
      };
    },
    onTooltipMouseLeave({ relatedTarget }) {
      consola.trace(
        "mouse left to:",
        relatedTarget?.tagName,
        relatedTarget?.id,
        relatedTarget?.classList
      );

      // if the tooltip hasn't been opened yet, cancel timer and return
      if (!this.removeTooltipWatcher) {
        clearTimeout(this.tooltipTimeout);
        return;
      }

      if (this.tooltip?.hoverable) {
        let tooltipContainer = document.getElementById("tooltip-container");
        if (tooltipContainer && tooltipContainer.contains(relatedTarget)) {
          // abort removing tooltip
          return;
        }
      }

      // remove tooltip
      this.$store.commit("workflow/setTooltip", null);
      // NOTE: watcher will be removed by watch of $store.state.workflow.tooltip
    },
  },
};
