import mitt from 'mitt';

const waitableEventName = 'workflow-changed-rpc-event';

const $bus = mitt();

const receivedEventsStack = new Map();

const deleteEvent = (id) => {
    receivedEventsStack.delete(id);
};

$bus.on(waitableEventName, (payload) => {
    if (payload.snapshotId) {
        receivedEventsStack.set(payload.snapshotId, payload);
    }
});

export const notifyEvent = (payload) => {
    $bus.emit(waitableEventName, payload);
};

export const waitForEvent = (id) => new Promise(resolve => {
    if (receivedEventsStack.has(id)) {
        resolve(receivedEventsStack.get(id));
    } else {
        $bus.on(waitableEventName, (payload) => {
            const receivedEvent = receivedEventsStack.get(id);
            resolve(receivedEvent);
            $bus.off(waitableEventName);
        });
    }
    deleteEvent(id);
});
