import Vuex from 'vuex';
import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils';

// eslint-disable-next-line object-curly-newline
import {
    defaultMetaNodeBarHeight,
    defaultMetanodeBarPosition,
    horizontalNodePadding,
    metaNodeBarWidth,
    portSize,
    nodeSize
// eslint-disable-next-line object-curly-newline
} from '@/style/shapes.mjs';

import * as canvasStoreConfig from '@/store/canvas';

describe('workflow store', () => {
    let store, localVue, loadStore;

    beforeAll(() => {
        localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        loadStore = async ({ apiMocks = {}, nodes = {} } = {}) => {
            /**
             * We have to import the workflow-store dynamically to apply our @api mocks.
             * Because the module is cached after it is required for the first time,
             * a reset is needed
             */
            jest.resetModules();
            jest.doMock('@api', () => ({
                __esModule: true,
                ...apiMocks
            }), { virtual: true });

            store = mockVuexStore({
                workflow: await import('@/store/workflow'),
                canvas: canvasStoreConfig
            });
        };
    });
    
    const node = { id: 'root:1', position: { x: 50, y: 21 } };

    describe('metanode content workflows', () => {
        let baseWorkflow = {
            projectId: 'foo',
            info: {
                containerType: 'metanode'
            },
            metaInPorts: {
                ports: []
            },
            metaOutPorts: {
                ports: []
            }
        };

        beforeEach(async () => {
            await loadStore();
        });

        const fixtures = {
            'without any ports nor nodes': {
                additionalProps: {},
                nodes: {},
                expected: {
                    workflowBounds: { left: 0, right: 0, top: 0, bottom: 0 }
                }
            },
            'with ports but no nodes': {
                additionalProps: {
                    metaInPorts: {
                        ports: [{}]
                    },
                    metaOutPorts: {
                        ports: [{}]
                    }
                },
                nodes: {},
                expected: {
                    workflowBounds: { left: 0, right: 0, top: 0, bottom: 0 }
                }
            },
            'with input ports only': {
                nodes: { [node.id]: node },
                additionalProps: {
                    metaInPorts: {
                        ports: [{}]
                    }
                },
                expected: {
                    workflowBounds: {
                        left: -metaNodeBarWidth,
                        right: node.position.x + horizontalNodePadding + nodeSize,
                        top: 0,
                        bottom: defaultMetaNodeBarHeight
                    }
                }
            },
            'with output ports only': {
                nodes: { [node.id]: node },
                additionalProps: {
                    metaOutPorts: {
                        ports: [{}]
                    }
                },
                expected: {
                    workflowBounds: {
                        left: 0,
                        right: defaultMetanodeBarPosition + metaNodeBarWidth,
                        top: 0,
                        bottom: defaultMetaNodeBarHeight
                    }
                }
            },
            'with ports only': {
                nodes: { [node.id]: node },
                additionalProps: {
                    metaOutPorts: {
                        ports: [{}]
                    },
                    metaInPorts: {
                        ports: [{}]
                    }
                },
                expected: {
                    workflowBounds: {
                        left: -metaNodeBarWidth,
                        right: defaultMetanodeBarPosition,
                        top: 0,
                        bottom: defaultMetaNodeBarHeight
                    }
                }
            },
            'with fixed input ports only': {
                nodes: { [node.id]: node },
                additionalProps: {
                    metaInPorts: {
                        xPos: 123,
                        ports: [{}]
                    }
                },
                expected: {
                    workflowBounds: {
                        left: 0,
                        right: 123 + portSize,
                        top: 0,
                        bottom: defaultMetaNodeBarHeight
                    }
                }
            },
            'with fixed output ports only': {
                nodes: { [node.id]: node },
                additionalProps: {
                    metaOutPorts: {
                        xPos: 123,
                        ports: [{}]
                    }
                },
                expected: {
                    workflowBounds: {
                        left: 0,
                        right: 123 + metaNodeBarWidth,
                        top: 0,
                        bottom: defaultMetaNodeBarHeight
                    }
                }
            },
            'with fixed ports only': {
                nodes: { [node.id]: node },
                additionalProps: {
                    metaOutPorts: {
                        xPos: 400,
                        ports: [{}]
                    },
                    metaInPorts: {
                        xPos: 200,
                        ports: [{}]
                    }
                },
                expected: {
                    workflowBounds: {
                        left: 0,
                        right: 400 + metaNodeBarWidth,
                        top: 0,
                        bottom: defaultMetaNodeBarHeight
                    }
                }
            },
            'with content and ports': {
                nodes: { [node.id]: node },
                additionalProps: {
                    metaInPorts: {
                        xPos: -100,
                        ports: [{}]
                    },
                    metaOutPorts: {
                        ports: [{}]
                    },
                    workflowAnnotations: [{
                        bounds: {
                            x: 300,
                            width: 1000,
                            y: 200,
                            height: 1000
                        }
                    }]
                },
                expected: {
                    workflowBounds: {
                        bottom: 1200,
                        left: -110,
                        right: 1300,
                        top: 0
                    }
                }
            },
            'with content with negative coordinates and ports': {
                nodes: { [node.id]: node },
                additionalProps: {
                    metaInPorts: {
                        ports: [{}]
                    },
                    metaOutPorts: {
                        xPos: 500,
                        ports: [{}]
                    },
                    workflowAnnotations: [{
                        bounds: {
                            x: -300,
                            width: 1000,
                            y: -200,
                            height: 1000
                        }
                    }]
                },
                expected: {
                    workflowBounds: {
                        left: -300 - metaNodeBarWidth,
                        right: 1000 - 300,
                        top: -200,
                        bottom: 1000 - 200
                    }
                }
            },
            'with port bars in reverse order': {
                nodes: { [node.id]: node },
                additionalProps: {
                    metaInPorts: {
                        xPos: 100,
                        ports: [{}]
                    },
                    metaOutPorts: {
                        xPos: -100,
                        ports: [{}]
                    }
                },
                expected: {
                    workflowBounds: {
                        left: -100 - portSize,
                        right: 100 + nodeSize,
                        top: 0,
                        bottom: 500
                    }
                }
            }
        };

        it.each(Object.entries(fixtures))('calculates dimensions %s', (title, { additionalProps, nodes, expected }) => {
            const workflow = {
                ...baseWorkflow,
                nodes
            };
            store.commit('workflow/setActiveWorkflow', {
                ...workflow,
                ...additionalProps
            });

            expect(store.getters['workflow/workflowBounds']).toEqual(
                expect.objectContaining(expected.workflowBounds)
            );
        });
    });
});
