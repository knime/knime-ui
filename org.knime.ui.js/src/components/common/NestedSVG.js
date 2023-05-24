import { h as createElement } from "vue";
/**
 * Our default svg-loader discards attributes besides `class` and `style`.
 * And styling a nested svg via CSS doesn't affect its location or size on the canvas.
 * This functional component passes any attributes directly to the svg element.
 *
 * It expects one svg in the default slot.
 */
export default {
  render() {
    const svg = this.$slots.default();
    return createElement(svg[0].children[0]);
  },
};
