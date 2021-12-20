import Port from '~/components/workflow/Port';

const size = 21;

/**
 * Higher order component that wraps a `Port` output in an svg element.
 * Does not render the port "state" (small circle on metanode output ports).
 * @param {Object} portConfig Passed as `port` config to Port.vue
 * @returns {Object} A Vue component
 */
export default (portConfig) => ({
    render(createElement) {
        let port = { ...portConfig };
        delete port.nodeState;
        let g = createElement(Port, {
            props: { port }
        });

        let attrs = {
            viewBox: `-${size / 2} -${size / 2} ${size} ${size}`
        };
        return createElement('svg', { attrs }, [g]);
    }
});
