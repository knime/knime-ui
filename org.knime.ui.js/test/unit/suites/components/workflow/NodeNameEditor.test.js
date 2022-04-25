import { shallowMount } from '@vue/test-utils';
import * as $shapes from '~/style/shapes';

import NodeNameEditor from '~/components/workflow/NodeNameEditor';
import NodeNameTextarea from '~/components/workflow/NodeNameTextarea';
import NodeNameEditorActionBar from '~/components/workflow/NodeNameEditorActionBar';

describe('NodeNameEditor', () => {
    // TODO: please put this into beforeEach and use common test pattern
    const defaultProps = {
        value: 'test',
        nodePosition: { x: 15, y: 13 },
        nodeId: 'root:1'
    };

    const doShallowMount = (propsData = defaultProps) => {
        const wrapper = shallowMount(NodeNameEditor, {
            propsData,
            mocks: { $shapes }
        });

        return wrapper;
    };

    it('should render the ActionBar and the Textarea', () => {
        const wrapper = doShallowMount();

        expect(wrapper.findComponent(NodeNameTextarea).exists()).toBe(true);
        expect(wrapper.findComponent(NodeNameEditorActionBar).exists()).toBe(true);
    });
    

    it('should block click events', () => {
        const mockStopPropagation = jest.fn();
        const mockPreventDefault = jest.fn();

        MouseEvent.prototype.stopPropagation = mockStopPropagation;
        MouseEvent.prototype.preventDefault = mockPreventDefault;

        const wrapper = doShallowMount();
        const rect = wrapper.find('rect');
            
        rect.trigger('click');
            
        expect(mockStopPropagation).toHaveBeenCalled();
        expect(mockPreventDefault).toHaveBeenCalled();
    });
    
    describe('Action bar', () => {
        it('should be positioned based on the relevant prop', () => {
            const wrapper = doShallowMount();
    
            const actionBar = wrapper.findComponent(NodeNameEditorActionBar);
            const expectedPosition = 'translate(31,-6)';
    
            expect(actionBar.attributes('transform')).toBe(expectedPosition);
        });
    
        it('should emit save when clicking the save button', () => {
            const wrapper = doShallowMount();
    
            wrapper.findComponent(NodeNameEditorActionBar).vm.$emit('save');
    
            expect(wrapper.emitted('save')).toBeDefined();
        });
    
        it('should emit a cancel event when clicking the cancel button', () => {
            const wrapper = doShallowMount();
    
            wrapper.findComponent(NodeNameEditorActionBar).vm.$emit('cancel');
    
            expect(wrapper.emitted('cancel')).toBeDefined();
        });
    });

    describe('Handle textarea events', () => {
        it.each([
            'width-change',
            'height-change'
        ])('should forward a (%s) event', (eventName) => {
            const wrapper = doShallowMount();
    
            const emittedValue = 200;
            wrapper.findComponent(NodeNameTextarea).vm.$emit(eventName, emittedValue);
            expect(wrapper.emitted(eventName)[0][0]).toBe(emittedValue);
        });
    
        it('should emit a save event', () => {
            const wrapper = doShallowMount();
    
            wrapper.findComponent(NodeNameTextarea).vm.$emit('save');
    
            expect(wrapper.emitted('save')).toBeDefined();
        });
    
        it('should emit a cancel event', () => {
            const wrapper = doShallowMount();
    
            wrapper.findComponent(NodeNameTextarea).vm.$emit('cancel');
            expect(wrapper.emitted('cancel')).toBeDefined();
        });
    });

    it('should trim content before saving', () => {
        const emittedValue = '   this is the content    ';

        const wrapper = doShallowMount();

        wrapper.findComponent(NodeNameTextarea).vm.$emit('input', emittedValue);
        wrapper.findComponent(NodeNameTextarea).vm.$emit('save');
        
        expect(wrapper.emitted('save')[0][0]).toEqual(expect.objectContaining({
            newName: emittedValue.trim()
        }));
    });

    it('should not save empty values', () => {
        const emittedValue = '    ';

        const wrapper = doShallowMount();

        wrapper.findComponent(NodeNameTextarea).vm.$emit('input', emittedValue);
        wrapper.findComponent(NodeNameTextarea).vm.$emit('save');

        expect(wrapper.emitted('save')).toBeUndefined();
        expect(wrapper.emitted('cancel')).toBeDefined();
    });

    it('should emit the lastest dimensions of the editor when saving', () => {
        const wrapper = doShallowMount();

        const emittedWidth = 200;
        const emittedHeight = 100;
        wrapper.findComponent(NodeNameTextarea).vm.$emit('width-change', emittedWidth);
        wrapper.findComponent(NodeNameTextarea).vm.$emit('height-change', emittedHeight);

        wrapper.findComponent(NodeNameTextarea).vm.$emit('save');

        expect(wrapper.emitted('save')[0][0]).toEqual(expect.objectContaining({
            dimensionsOnClose: { width: emittedWidth, height: emittedHeight }
        }));
    });
});
