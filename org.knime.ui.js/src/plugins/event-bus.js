import mitt from 'mitt';

const emitter = mitt();

const on = (eventName, handler) => {
    emitter.on(eventName, handler);
};

const off = (eventName, handler) => {
    emitter.off(eventName, handler);
};

const emit = (eventName, payload) => {
    emitter.emit(eventName, payload);
};

const clearAll = () => {
    emitter.all.clear();
};

const $bus = { on, off, emit, clearAll };

export { $bus };

export default (app) => {
    app.config.globalProperties.$bus = $bus;
};
