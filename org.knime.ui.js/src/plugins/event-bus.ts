import mitt, { type Emitter } from 'mitt';

type BusEvents = {
    'selection-pointerdown': MouseEvent;
    'selection-pointerup': MouseEvent;
    'selection-pointermove': MouseEvent;
    'selection-lostpointercapture': MouseEvent;

    'connector-start': {
        validConnectionTargets: Set<string>;
        startNodeId: string;
        startPort: string;
    },
    'connector-dropped': never;
    'connector-end': never;
}

const emitter = mitt<BusEvents>();

const clearAll = () => {
    emitter.all.clear();
};

const $bus = { on: emitter.on, off: emitter.off, emit: emitter.emit, clearAll };

export type EventBus = Emitter<BusEvents> & { clearAll: typeof clearAll }

export { $bus };

export default ({ app }) => {
    app.config.globalProperties.$bus = $bus;
};
