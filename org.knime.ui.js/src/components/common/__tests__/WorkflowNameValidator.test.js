import { mount } from '@vue/test-utils';

import WorkflowNameValidator from '../WorkflowNameValidator.vue';

describe('WorkflowNameValidator', () => {
    const doMount = ({ props } = {}) => {
        const defaultProps = {
            name: 'test name'
        };

        const componentInSlot = `<div
            id="slotted-component"
            :is-valid="props.isValid"
            :error-message="props.errorMessage"
            @click="() => (nameInSlot = props.cleanNameFn(nameInSlot))"
        ></div>`;
        
        const getScopedComponent = {
            template: componentInSlot,
            data() {
                return { nameInSlot: '' };
            }
        };

        const wrapper = mount(WorkflowNameValidator, {
            propsData: { ...defaultProps, ...props },
            scopedSlots: {
                default: (props) => {
                    const scoped = mount(getScopedComponent, { mocks: { props } });
                    // `render` function needs VNode
                    return scoped.vnode;
                }
            }
        });

        return { wrapper };
    };

    // eslint-disable-next-line arrow-body-style
    const getSlottedStubProp = ({ wrapper, propName }) => {
        // access VM of dummy slotted component and get value that was injected by
        // WorkflowNameValidator from the slot props
        return wrapper.find('#slotted-component').vm[propName];
    };
    
    it('should check for invalid characters', async () => {
        const { wrapper } = doMount();

        expect(getSlottedStubProp({ wrapper, propName: 'isValid' })).toBeTruthy();
        
        await wrapper.setProps({ name: '&*9a?/\\sdasd' });

        expect(getSlottedStubProp({ wrapper, propName: 'isValid' })).toBeFalsy();
        expect(getSlottedStubProp({ wrapper, propName: 'errorMessage' })).toMatch('Name contains invalid characters');
    });

    it('should check for name collision', async () => {
        const workflowItems = [
            { id: '1', name: 'first-item' }
        ];
        const { wrapper } = doMount({ props: { name: 'test', workflowItems, currentItemId: '1' } });

        expect(getSlottedStubProp({ wrapper, propName: 'isValid' })).toBeTruthy();
        
        await wrapper.setProps({
            workflowItems: workflowItems.concat({ id: '2', name: 'test' })
        });

        expect(getSlottedStubProp({ wrapper, propName: 'isValid' })).toBeFalsy();
        expect(getSlottedStubProp({
            wrapper,
            propName: 'errorMessage'
        })).toMatch('Name is already taken by another workflow');
    });

    it('should check for name character limit', async () => {
        const { wrapper } = doMount();

        expect(getSlottedStubProp({ wrapper, propName: 'isValid' })).toBeTruthy();
        const newName = new Array(256).fill(0).map(_ => 'a').join('');
        
        await wrapper.setProps({ name: newName });

        expect(getSlottedStubProp({ wrapper, propName: 'isValid' })).toBeFalsy();
        expect(getSlottedStubProp({ wrapper, propName: 'errorMessage' })).toMatch('exceeds 255 characters');
    });

    it.todo('should clean invalid prefix and suffix');
});
