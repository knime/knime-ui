import { gsap } from 'gsap';
import { createDragGhosts } from '../dragGhostHelpers';

jest.mock('gsap', () => ({
    gsap: {
        to: (_, { onComplete }) => {
            onComplete();
        },
        killTweensOf: jest.fn()
    }
}));

describe('dragGhostHelpers', () => {
    const setup = ({ selectedTargets = [], badgeCount = null } = {}) => {
        const dragTarget = selectedTargets.length > 0
            ? selectedTargets[0].targetEl
            : document.createElement('div');
            
        const targets = selectedTargets.length > 0
            ? selectedTargets
            : [{ targetEl: dragTarget, textContent: '' }];

        document.body.appendChild(dragTarget);
        const dragStartEvent = new Event('dragstart');
        const dataTransfer = {
            setDragImage: jest.fn()
        };
        dragStartEvent.dataTransfer = dataTransfer;
        dragTarget.dispatchEvent(dragStartEvent);

        const result = createDragGhosts({
            selectedTargets: targets,
            dragStartEvent,
            badgeCount
        });

        return { ...result, dataTransfer };
    };

    it('should add the proper text in the ghost', () => {
        const selectedTargets = [
            { textContent: 'MOCK', targetEl: document.createElement('div') }
        ];
        const { ghosts } = setup({ selectedTargets });

        expect(ghosts[0].innerText).toBe('MOCK');
    });

    it('should add multiple ghosts', () => {
        const selectedTargets = [
            { textContent: 'MOCK1', targetEl: document.createElement('div') },
            { textContent: 'MOCK2', targetEl: document.createElement('div') },
            { textContent: 'MOCK3', targetEl: document.createElement('div') }
        ];
        
        const { ghosts } = setup({ selectedTargets });
        expect(ghosts[0].innerText).toBe('MOCK3');
        expect(ghosts[1].innerText).toBe('MOCK2');
        expect(ghosts[2].innerText).toBe('MOCK1');
    });

    describe('badge', () => {
        it('should only add the badge to the last ghost', () => {
            const selectedTargets = [
                { textContent: 'MOCK', targetEl: document.createElement('div') },
                { textContent: 'MOCK2', targetEl: document.createElement('div') }
            ];
            const { ghosts } = setup({ selectedTargets, badgeCount: 10 });

            expect(ghosts[0].hasChildNodes()).toBe(false);
            expect(ghosts[1].hasChildNodes()).toBe(true);
        });

        it('should display the proper badge count (<99)', () => {
            const selectedTargets = [
                { textContent: 'MOCK', targetEl: document.createElement('div') }
            ];
            const { ghosts } = setup({ selectedTargets, badgeCount: 10 });
    
            expect(ghosts[0].firstChild.innerText).toBe(10);
        });
        
        it('should display the proper badge count (>99)', () => {
            const selectedTargets = [
                { textContent: 'MOCK', targetEl: document.createElement('div') }
            ];
            const { ghosts } = setup({ selectedTargets, badgeCount: 150 });
    
            expect(ghosts[0].firstChild.innerText).toBe('99+');
        });
    });

    it('should clear the default drag ghost image', () => {
        const { dataTransfer } = setup();

        expect(dataTransfer.setDragImage).toHaveBeenCalledWith(
            expect.any(Image), 0, 0
        );
    });

    it('should remove the ghosts, badge and cleaup animations', () => {
        const selectedTargets = [
            { textContent: 'MOCK1', targetEl: document.createElement('div') },
            { textContent: 'MOCK2', targetEl: document.createElement('div') }
        ];
        const { ghosts, removeGhosts } = setup({ selectedTargets, badgeCount: 10 });
        const badgeEl = ghosts[1].firstChild;
        removeGhosts();
        
        expect(gsap.killTweensOf).toHaveBeenCalledWith(ghosts[0]);
        expect(gsap.killTweensOf).toHaveBeenCalledWith(ghosts[1]);
        expect(gsap.killTweensOf).toHaveBeenCalledWith(badgeEl);
        expect(document.body.contains(ghosts[0])).toBe(false);
        expect(document.body.contains(ghosts[1])).toBe(false);
    });
});
