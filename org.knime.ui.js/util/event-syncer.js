// map from snapshotId -> [promise, resolve]
const stalledPromises = {};
let lastPatchId = -Infinity;

export const waitForPatch = (snapshotId) => {
    // A. The required patch already has arrived, return a new resolved promise
    if (snapshotId <= lastPatchId) {
        return Promise.resolve();
    }

    // B. The patch hasn't arrived and this is the first waitForPatch call
    if (!stalledPromises[snapshotId]) {
        // 1. Create a promise for that snapshotId
        let snapshotResolve;
        let snapshotPromise = new Promise(resolve => {
            snapshotResolve = resolve;
        });
        
        // 2. Store promise for that snapshot
        stalledPromises[snapshotId] = [snapshotPromise, snapshotResolve];
    }
    
    // 3. Return promise to the caller
    let [promise] = stalledPromises[snapshotId];
    return promise;
};

// Assumption: Patches arrive here in the same order as their snapshotId;
export const notifyPatch = (snapshotId) => {
    lastPatchId = snapshotId;
    
    // A. Patch arrived first, do nothing
    if (!stalledPromises[snapshotId]) {
        return;
    }
    
    // B. Patch arrived last
    let [, resolve] = stalledPromises[snapshotId];

    // clean up promise map
    delete stalledPromises[snapshotId];

    // resume waiting commands
    resolve();
};


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
});
