/* eslint-disable no-magic-numbers */
import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~knime-ui/test/unit/test-utils';
import { defaultMetaNodeBarHeight, defaultMetanodeBarPosition, metaNodeBarWidth, portSize } from '~knime-ui/style/shapes';
import Vuex from 'vuex';
import * as canvasStoreConfig from '~knime-ui/store/canvas';

describe('workflow store', () => {
    let store, localVue, loadStore;

    beforeAll(() => {
        localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
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
                workflow: await import('~knime-ui/store/workflow'),
                canvas: canvasStoreConfig
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
                    workflowBounds: { left: 0, right: 0, top: 0, bottom: 0 }
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
                    }
                }
            },
            'with content and ports': {
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
                        top: 200
                    }
                }
            },
            'with content with negative coordinates and ports': {
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
                        right: 100 + portSize,
                        top: 0,
                        bottom: 500
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
                workflowBounds: store.getters['workflow/workflowBounds']
            }).toStrictEqual(expected);
        });
    });
});
