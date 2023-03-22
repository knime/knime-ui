import mitt, { type Emitter } from 'mitt';
import type { NodePort } from '@/api/gateway-api/generated-api';

type BusEvents = {
    'selection-pointerdown': MouseEvent;
    'selection-pointerup': MouseEvent;
    'selection-pointermove': MouseEvent;
    'selection-lostpointercapture': MouseEvent;

    'connector-start': {
        validConnectionTargets: Set<string>;
        startNodeId: string;
        startPort: NodePort;
    },
    'connector-dropped': null;
    'connector-end': null;
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
