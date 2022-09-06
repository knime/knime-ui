/**
 * Our default svg-loader discards attributes besides `class` and `style`.
 * And styling a nested svg via CSS doesn't affect its location or size on the canvas.
 * This functional component passes any attributes directly to the svg element.
 *
 * It expects one svg in the default slot.
 */
export default {
    functional: true,
    render(createElement, context) {
        // find svg in default slot
        let svg = context.slots().default[0];

        // add attributes of this component to svg
        svg.data.attrs = { ...svg.data.attrs, ...context.data.attrs };

        // render svg
        return svg;
    }
};
