import { generateWorkflowPreview } from '../generateWorkflowPreview';

jest.mock('@fontsource/roboto-condensed/files/roboto-condensed-all-700-normal.woff', () => 'font data');

describe('generateWorkflowPreview', () => {
    const mockFetch = jest.fn(() => Promise.resolve({
        blob: () => new Blob(['mock'])
    }));

    beforeAll(() => {
        window.fetch = mockFetch;
    });

    /**
     * Creates an SVG element from the provided string
     * @param {String} svgString
     * @returns {HTMLElement}
     */
    const createElementFromOutput = (svgString) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');

        return doc.querySelector('svg');
    };

    const setup = ({ workflowSheetDimensions = null } = {}) => {
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        
        const defs = document.createElementNS(svgNS, 'defs');
        const styleTag = document.createElement('style');
        styleTag.appendChild(
            document.createTextNode(`.dummy-class { stroke: rgb(123, 123, 123); }`)
        );
        defs.appendChild(styleTag);
        svg.appendChild(defs);
        
        const workflowSheet = document.createElementNS(svgNS, 'rect');
        workflowSheet.classList.add('workflow-sheet');
        
        if (workflowSheetDimensions) {
            workflowSheet.setAttribute('x', workflowSheetDimensions.x || 0);
            workflowSheet.setAttribute('y', workflowSheetDimensions.y || 0);
            workflowSheet.setAttribute('width', workflowSheetDimensions.width || 0);
            workflowSheet.setAttribute('height', workflowSheetDimensions.height || 0);
        }

        svg.appendChild(workflowSheet);

        // add 1 dummy hover-area
        const hoverArea = document.createElementNS(svgNS, 'rect');
        hoverArea.classList.add('hover-area');
        svg.appendChild(hoverArea);

        // add mock portal elements
        const vPortal = document.createElement('div');
        const vPortalTarget = document.createElement('div');
        vPortal.classList.add('v-portal');
        vPortalTarget.classList.add('vue-portal-target');
        svg.appendChild(vPortal);
        svg.appendChild(vPortalTarget);

        // add dynamic port icon
        const portIcon = document.createElementNS(svgNS, 'rect');
        portIcon.classList.add('add-port');
        svg.appendChild(portIcon);

        // add empty g element
        const emptyG = document.createElementNS(svgNS, 'g');
        svg.appendChild(emptyG);
        
        // add invisible element
        const hiddenG = document.createElementNS(svgNS, 'rect');
        hiddenG.style.display = 'none';
        svg.appendChild(hiddenG);

        // add connectors
        const path = document.createElementNS(svgNS, 'path');
        path.classList.add('dummy-class');
        path.setAttribute('data-connector-id', '1');
        svg.appendChild(path);

        // add foreignObject
        const foreignObject = document.createElementNS(svgNS, 'foreignObject');
        foreignObject.classList.add('dummy-class');
        svg.appendChild(foreignObject);

        document.body.appendChild(svg);

        return { svg };
    };

    it('should add fonts', async () => {
        const { svg } = setup();
        const output = await generateWorkflowPreview(svg);

        expect(output).toMatch(/url\("data:application\/font-woff;charset=utf-8;base64,.+/g);
    });

    it('should set transparency on the workflow sheet', async () => {
        const { svg } = setup();

        const output = await generateWorkflowPreview(svg);
        const outputEl = createElementFromOutput(output);
        expect(outputEl.querySelector('.workflow-sheet').style.fill).toBe('transparent');
    });

    it('should set the correct viewbox', async () => {
        const workflowSheetDimensions = {
            x: 10,
            y: 20,
            width: 100,
            height: 200
        };
        const { svg } = setup({ workflowSheetDimensions });
        
        const output = await generateWorkflowPreview(svg);

        const outputEl = createElementFromOutput(output);
        expect(outputEl.getAttribute('viewBox')).toBe('10 20 100 200');
    });

    it('should remove hover areas', async () => {
        const { svg } = setup();
        
        const output = await generateWorkflowPreview(svg);
        const outputEl = createElementFromOutput(output);

        expect(outputEl.querySelectorAll('.hover-area').length).toBe(0);
    });

    it('should remove portal elements', async () => {
        const { svg } = setup();
        
        const output = await generateWorkflowPreview(svg);
        const outputEl = createElementFromOutput(output);

        expect(outputEl.querySelectorAll('DIV.v-portal').length).toBe(0);
        expect(outputEl.querySelectorAll('.vue-portal-target').length).toBe(0);
    });

    it('should remove dynamic port icons', async () => {
        const { svg } = setup();

        const output = await generateWorkflowPreview(svg);
        const outputEl = createElementFromOutput(output);
        expect(outputEl.querySelectorAll('.add-port').length).toBe(0);
    });

    it('should remove empty and hidden elements', async () => {
        const { svg } = setup();

        const output = await generateWorkflowPreview(svg);
        const outputEl = createElementFromOutput(output);
        const emptyGTags = Array.from(outputEl.querySelectorAll('g')).filter(el => el.hasChildNodes);
        expect(emptyGTags).toEqual([]);
        expect(outputEl.querySelectorAll('[style*="display: none"]').length).toBe(0);
    });

    it('should inline the styles of the connectors', async () => {
        const { svg } = setup();

        const output = await generateWorkflowPreview(svg);
        const outputEl = createElementFromOutput(output);
        expect(outputEl.querySelector('[data-connector-id]').style.stroke).toBe('rgb(123, 123, 123)');
    });

    it('should inline the styles of the foreignObjects', async () => {
        const { svg } = setup();

        const output = await generateWorkflowPreview(svg);
        const outputEl = createElementFromOutput(output);
        expect(outputEl.querySelector('foreignObject').style.stroke).toBe('rgb(123, 123, 123)');
    });

    it('caches the fonts for continued usage', async () => {
        localStorage.clear();
        const { svg } = setup();
        jest.spyOn(Storage.prototype, 'setItem');
        jest.spyOn(Storage.prototype, 'getItem');
        
        await generateWorkflowPreview(svg);
        
        expect(localStorage.setItem).toHaveBeenCalledTimes(1);
        
        await generateWorkflowPreview(svg);
        
        expect(localStorage.getItem).toHaveBeenCalled();
        expect(localStorage.setItem).toHaveBeenCalledTimes(1);
    });

    it('should return empty svg when canvas is empty', async () => {
        const { svg } = setup();

        const output = await generateWorkflowPreview(svg, true);
        const outputEl = createElementFromOutput(output);
        expect(outputEl.childNodes.length).toBe(0);
    });
});
