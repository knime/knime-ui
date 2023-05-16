import { expect, describe, beforeEach, it } from 'vitest';
import { findItemsInsideOfRectangle } from '../rectangleSelection';

describe('findItemsInsideOfRectangle', () => {
    let workflow;

    beforeEach(() => {
        workflow = {
            nodes: {
                'root:0': {
                    id: 'up-left',
                    position: {
                        x: 0,
                        y: 0
                    }
                },
                'root:1': {
                    id: 'down-left',
                    position: {
                        x: 0,
                        y: 50
                    }
                },
                'root:2': {
                    id: 'down-right',
                    position: {
                        x: 50,
                        y: 50
                    }
                },
                'root:3': {
                    id: 'up-right',
                    position: {
                        x: 50,
                        y: 0
                    }
                }
            },
            workflowAnnotations: [
                {
                    id: 'ann1',
                    bounds: {
                        x: 50,
                        y: 0,
                        width: 10,
                        height: 10
                    }
                },
                {
                    id: 'ann2',
                    bounds: {
                        x: 0,
                        y: 50,
                        width: 10,
                        height: 10
                    }
                },
                {
                    id: 'ann3',
                    bounds: {
                        x: 50,
                        y: 50,
                        width: 10,
                        height: 10
                    }
                }
            ]
        };
    });

    it('include all from outside', () => {
        let p1 = { x: -5, y: -5 }; // node size + 1 off
        let p2 = { x: 75, y: 75 }; // node position - 1 off

        // forwards
        expect(findItemsInsideOfRectangle({ startPos: p1, endPos: p2, workflow })).toStrictEqual({
            nodesInside: ['up-left', 'down-left', 'down-right', 'up-right'],
            nodesOutside: [],
            annotationsInside: ['ann1', 'ann2', 'ann3'],
            annotationsOutside: []
        });

        // backwards
        expect(findItemsInsideOfRectangle({ startPos: p2, endPos: p1, workflow })).toStrictEqual({
            nodesInside: ['up-left', 'down-left', 'down-right', 'up-right'],
            nodesOutside: [],
            annotationsInside: ['ann1', 'ann2', 'ann3'],
            annotationsOutside: []
        });
    });

    it('exclude all by 1 px', () => {
        let p1 = { x: 33, y: 33 }; // node size + 1 off
        let p2 = { x: 49, y: 49 }; // node position - 1 off

        // forwards
        expect(findItemsInsideOfRectangle({ startPos: p1, endPos: p2, workflow })).toStrictEqual({
            nodesInside: [],
            nodesOutside: ['up-left', 'down-left', 'down-right', 'up-right'],
            annotationsInside: [],
            annotationsOutside: ['ann1', 'ann2', 'ann3']
        });

        // backwards
        expect(findItemsInsideOfRectangle({ startPos: p2, endPos: p1, workflow })).toStrictEqual({
            nodesInside: [],
            nodesOutside: ['up-left', 'down-left', 'down-right', 'up-right'],
            annotationsInside: [],
            annotationsOutside: ['ann1', 'ann2', 'ann3']
        });
    });

    it('include all by 1 px', () => {
        let p1 = { x: 32, y: 32 }; // node size + 1 off
        let p2 = { x: 50, y: 50 }; // node position - 1 off

        // forwards
        expect(findItemsInsideOfRectangle({ startPos: p1, endPos: p2, workflow })).toStrictEqual({
            nodesInside: ['up-left', 'down-left', 'down-right', 'up-right'],
            nodesOutside: [],
            annotationsInside: ['ann3'],
            annotationsOutside: ['ann1', 'ann2']
        });

        // backwards
        expect(findItemsInsideOfRectangle({ startPos: p2, endPos: p1, workflow })).toStrictEqual({
            nodesInside: ['up-left', 'down-left', 'down-right', 'up-right'],
            nodesOutside: [],
            annotationsInside: ['ann3'],
            annotationsOutside: ['ann1', 'ann2']
        });
    });

    it('excludes annotation that the selection started in', () => {
        let p1 = { x: 51, y: 1 }; // annotation + 1 off
        let p2 = { x: 54, y: 8 }; // annotation - 1 off

        // forwards
        expect(findItemsInsideOfRectangle({ startPos: p1, endPos: p2, workflow })).toStrictEqual({
            nodesInside: ['up-right'],
            nodesOutside: ['up-left', 'down-left', 'down-right'],
            annotationsInside: [],
            annotationsOutside: ['ann1', 'ann2', 'ann3']
        });

        // backwards
        expect(findItemsInsideOfRectangle({ startPos: p2, endPos: p1, workflow })).toStrictEqual({
            nodesInside: ['up-right'],
            nodesOutside: ['up-left', 'down-left', 'down-right'],
            annotationsInside: [],
            annotationsOutside: ['ann1', 'ann2', 'ann3']
        });
    });
});
