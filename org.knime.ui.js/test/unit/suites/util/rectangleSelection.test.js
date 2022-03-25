import { findNodesInsideOfRectangle } from '~/util/rectangleSelection';

describe('findNodesInsideOfRectangle', () => {
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
            }
        };
    });

    test('include all from outside', () => {
        let p1 = { x: -5, y: -5 }; // node size + 1 off
        let p2 = { x: 75, y: 75 }; // node position - 1 off

        // forwards
        expect(findNodesInsideOfRectangle({ startPos: p1, endPos: p2, workflow })).toStrictEqual({
            inside: ['up-left', 'down-left', 'down-right', 'up-right'],
            outside: []
        });

        // backwards
        expect(findNodesInsideOfRectangle({ startPos: p2, endPos: p1, workflow })).toStrictEqual({
            inside: ['up-left', 'down-left', 'down-right', 'up-right'],
            outside: []
        });
    });

    test('exclude all by 1 px', () => {
        let p1 = { x: 33, y: 33 }; // node size + 1 off
        let p2 = { x: 49, y: 49 }; // node position - 1 off

        // forwards
        expect(findNodesInsideOfRectangle({ startPos: p1, endPos: p2, workflow })).toStrictEqual({
            inside: [],
            outside: ['up-left', 'down-left', 'down-right', 'up-right']
        });

        // backwards
        expect(findNodesInsideOfRectangle({ startPos: p2, endPos: p1, workflow })).toStrictEqual({
            inside: [],
            outside: ['up-left', 'down-left', 'down-right', 'up-right']
        });
    });

    test('include all by 1 px', () => {
        let p1 = { x: 32, y: 32 }; // node size + 1 off
        let p2 = { x: 50, y: 50 }; // node position - 1 off

        // forwards
        expect(findNodesInsideOfRectangle({ startPos: p1, endPos: p2, workflow })).toStrictEqual({
            inside: ['up-left', 'down-left', 'down-right', 'up-right'],
            outside: []
        });

        // backwards
        expect(findNodesInsideOfRectangle({ startPos: p2, endPos: p1, workflow })).toStrictEqual({
            inside: ['up-left', 'down-left', 'down-right', 'up-right'],
            outside: []
        });
    });
});
