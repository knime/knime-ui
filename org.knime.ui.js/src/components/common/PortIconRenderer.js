import { h as createElement } from "vue";

import Port from "@/components/common/Port.vue";

/**
 * Higher order component that wraps a `Port` output in an svg element.
 * Does not render the port "state" (small circle on metanode output ports).
 * @param {Object} portConfig Passed as `port` config to Port.vue
 * @param {Number} [iconSize] The width of the rendered svg will be set to this size
 * @returns {Object} A Vue component
 */
export default (portConfig, iconSize = null) => ({
  render() {
    const port = { ...portConfig };
    delete port.nodeState;
    const g = createElement(Port, { port });

    const portSize = this.$shapes.portSize;

    const attrs = {
      viewBox: `-${portSize / 2} -${portSize / 2} ${portSize} ${portSize}`,
      style: iconSize && `width: ${iconSize}px`,
    };
    return createElement("svg", { ...attrs }, [g]);
  },
});
