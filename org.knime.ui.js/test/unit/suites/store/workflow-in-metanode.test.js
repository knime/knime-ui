/* eslint-disable no-magic-numbers */
import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import { canvasPadding, metaNodeBarWidth, portSize, defaultMetaNodeBarHeight, defaultMetanodeBarPosition }
    from '~/style/shapes';
import Vuex from 'vuex';

describe('workflow store', () => {
    let store, localVue, templateMutationMock, nodeMutationMock, removeWorkflowMock, loadStore;

    beforeAll(() => {
        localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        templateMutationMock = jest.fn();
        nodeMutationMock = jest.fn();
        removeWorkflowMock = jest.fn();

        loadStore = async ({ apiMocks = {}, nodes = {} } = {}) => {
            /**
             * We have to import the workflow-store dynamically to apply our ~api mocks.
             * Because the module is cached after it is required for the first time,
             * a reset is needed
             */
            jest.resetModules();
            jest.doMock('~api', () => ({
                __esModule: true,
                ...apiMocks
            }), { virtual: true });

            store = mockVuexStore({
                workflow: await import('~/store/workflow'),
                nodeTemplates: {
                    mutations: {
                        add: templateMutationMock
                    }
                },
                nodes: {
                    mutations: {
                        add: nodeMutationMock,
                        removeWorkflow: removeWorkflowMock
                    },
                    state: nodes
                }
            });
        };
    });

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
            'without any ports': {
                additionalProps: {},
                expected: {
                    workflowBounds: { left: 0, right: 0, top: 0, bottom: 0 },
                    svgBounds: { x: 0, y: 0, width: canvasPadding, height: canvasPadding }
                }
            },
            'with input ports only': {
                additionalProps: {
                    metaInPorts: {
                        ports: [{}]
                    }
                },
                expected: {
                    workflowBounds: {
                        left: -metaNodeBarWidth,
                        right: portSize,
                        top: 0,
                        bottom: defaultMetaNodeBarHeight
                    },
                    svgBounds: {
                        x: -metaNodeBarWidth,
                        y: 0,
                        width: metaNodeBarWidth + portSize + canvasPadding,
                        height: defaultMetaNodeBarHeight + canvasPadding
                    }
                }
            },
            'with output ports only': {
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
                    },
                    svgBounds: {
                        x: 0,
                        y: 0,
                        width: defaultMetanodeBarPosition + metaNodeBarWidth + canvasPadding,
                        height: defaultMetaNodeBarHeight + canvasPadding
                    }
                }
            },
            'with ports only': {
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
                    },
                    svgBounds: {
                        x: -metaNodeBarWidth,
                        y: 0,
                        width: defaultMetanodeBarPosition + metaNodeBarWidth + canvasPadding,
                        height: defaultMetaNodeBarHeight + canvasPadding
                    }
                }
            },
            'with fixed input ports only': {
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
                    },
                    svgBounds: {
                        x: 0,
                        y: 0,
                        width: 123 + portSize + canvasPadding,
                        height: defaultMetaNodeBarHeight + canvasPadding
                    }
                }
            },
            'with fixed output ports only': {
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
                    },
                    svgBounds: {
                        x: 0,
                        y: 0,
                        width: 123 + metaNodeBarWidth + canvasPadding,
                        height: defaultMetaNodeBarHeight + canvasPadding
                    }
                }
            },
            'with fixed ports only': {
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
                    },
                    svgBounds: {
                        x: 0,
                        y: 0,
                        width: 400 + metaNodeBarWidth + canvasPadding,
                        height: defaultMetaNodeBarHeight + canvasPadding
                    }
                }
            },
            'with content and ports': {
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
                            height: 1000,
                        }
                    }]
                },
                expected: {
                    workflowBounds: {
                        left: -300 - metaNodeBarWidth,
                        right: 1000 - 300,
                        top: -200,
                        bottom: 1000 - 200
                    },
                    svgBounds: {
                        x: -300 - metaNodeBarWidth,
                        y: -200,
                        width: defaultMetanodeBarPosition + metaNodeBarWidth + canvasPadding,
                        height: 1000 + canvasPadding
                    }
                }
            }
        };

        it.each(Object.entries(fixtures))('calculates dimensions %s', (title, { additionalProps, expected }) => {
            store.commit('workflow/setActiveWorkflow', {
                ...baseWorkflow,
                ...additionalProps
            });
            expect({
                workflowBounds: store.getters['workflow/workflowBounds'],
                svgBounds: store.getters['workflow/svgBounds']
            }).toStrictEqual(expected);
        });
    });
});
