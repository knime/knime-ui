import { shallowMount } from '@vue/test-utils';
import NodeTemplate from '~/components/NodeTemplate';
import NodePreview from '~/webapps-common/ui/components/node/NodePreview';
import { KnimeMIME } from '~/mixins/dropNode';

describe('NodeTemplate', () => {
    let propsData, doMount, wrapper, testEvent;

    beforeEach(() => {
        wrapper = null;

        let getBoundingClientRectMock = jest.fn().mockReturnValue({
            width: 70,
            height: 70
        });
        HTMLElement.prototype.getBoundingClientRect = getBoundingClientRectMock;

        testEvent = {
            dataTransfer: {
                setData: jest.fn(),
                setDragImage: jest.fn()
            }
        };

        propsData = {
            nodeTemplate: {
                name: 'node-name',
                id: 'node-id',
                nodeFactory: {
                    className: 'class-name',
                    settings: 'encoded-settings'
                },
                icon: 'data:image/node-icon',
                type: 'node-type',
                inPorts: ['port'],
                outPorts: ['port'],
                component: true
            }
        };

        doMount = () => {
            wrapper = shallowMount(NodeTemplate, { propsData });
        };
    });

    it('shows node name in label', () => {
        doMount();
        expect(wrapper.find('label').text()).toBe('node-name');
    });

    it('renders a node preview', () => {
        doMount();
        let nodePreview = wrapper.findComponent(NodePreview);

        expect(nodePreview.element.className).toMatch('node-preview');
        expect(nodePreview.props()).toStrictEqual({
            type: 'node-type',
            isComponent: false,
            inPorts: ['port'],
            outPorts: ['port'],
            hasDynPorts: false,
            icon: 'data:image/node-icon'
        });
    });

    describe('drag node', () => {
        afterEach(() => {
            // clean up document body to where nodePreview is cloned after each test
            document.body.childNodes.forEach(node => {
                document.body.removeChild(node);
            });
        });

        it('adds and removes dragGhost to/from vm and document.body', () => {
            doMount();
            expect(document.body.childNodes.length).toBe(0);

            // add node preview clone
            wrapper.trigger('dragstart', testEvent);

            expect(document.body.childNodes.length).toBe(1);
            expect(document.body.childNodes[0]).toBe(wrapper.vm.dragGhost);
            expect(wrapper.vm.dragGhost).toBeTruthy();

            // remove node preview clone
            wrapper.trigger('dragend');

            expect(document.body.childNodes.length).toBe(0);
            expect(wrapper.vm.dragGhost).toBeFalsy();
        });

        it('sets a ghostImage', () => {
            doMount();

            wrapper.trigger('dragstart', testEvent);

            let clonedNodePreview = wrapper.vm.dragGhost;

            // Correct Styling
            expect(clonedNodePreview.style.position).toBe('absolute');
            expect(clonedNodePreview.style.left).toBe('-100px');
            expect(clonedNodePreview.style.top).toBe('0px');
            expect(clonedNodePreview.style.width).toBe('70px');
            expect(clonedNodePreview.style.height).toBe('70px');

            // eslint-disable-next-line no-magic-numbers
            expect(testEvent.dataTransfer.setDragImage).toHaveBeenCalledWith(wrapper.vm.dragGhost, 35, 35);
        });

        it('sets dataTransfer types properly onDragStart', () => {
            doMount();
            wrapper.trigger('dragstart', testEvent);

            expect(testEvent.dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'node-id');
            expect(testEvent.dataTransfer.setData).toHaveBeenCalledWith(KnimeMIME,
                JSON.stringify({ className: 'class-name', settings: 'encoded-settings' }));
        });
    });
});
