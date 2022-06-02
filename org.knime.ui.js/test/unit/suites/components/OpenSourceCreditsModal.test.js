import { mount } from '@vue/test-utils';
import Modal from '~/webapps-common/ui/components/Modal';
import Button from '~/webapps-common/ui/components/Button';
import OpenSourceCreditsModal from '~/components/OpenSourceCreditsModal';

describe('OpenSourceCreditsModal', () => {
    let doMount, wrapper;

    beforeEach(() => {
        wrapper = null;

        doMount = () => {
            wrapper = mount(OpenSourceCreditsModal, {
                stubs: {
                    FocusTrap: true
                }
            });
        };
    });

    it('renders', () => {
        doMount();

        expect(wrapper.findComponent(Button).exists()).toBe(true);
        expect(wrapper.findComponent(Modal).exists()).toBe(true);
    });

    it('activates modal when button is clicked', async () => {
        doMount();

        expect(wrapper.vm.modalActive).toBe(false);
        await wrapper.findComponent(Button).trigger('click');
        expect(wrapper.findComponent(Modal).attributes().active).toBe('true');
    });
});
