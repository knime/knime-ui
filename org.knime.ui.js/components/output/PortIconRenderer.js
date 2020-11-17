import Port from '~/components/Port';

const size = 21;

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
