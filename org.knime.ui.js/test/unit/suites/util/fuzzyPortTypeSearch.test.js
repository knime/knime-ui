import { makeTypeSearch } from '~/util/fuzzyPortTypeSearch';

describe('Port Type Search', () => {
    let searchType;
    
    beforeEach(() => {
        let installedPortTypes = {
            a: { name: 'A-Type', hidden: true },
            b: { name: 'B-Type' },
            c: { name: 'C-Type' },
            d: { name: 'D-Type' }
        };

        searchType = makeTypeSearch({
            typeIds: ['a', 'b', 'c', 'd'],
            showHidden: false,
            installedPortTypes
        });
    });

    test('empty search input displays all entries', () => {
        expect(searchType('')).toStrictEqual([
            { name: 'B-Type', typeId: 'b' },
            { name: 'C-Type', typeId: 'c' },
            { name: 'D-Type', typeId: 'd' }
        ]);
    });

    test('search input shows matches', () => {
        expect(searchType('b')).toStrictEqual([
            { name: 'B-Type', typeId: 'b' }
        ]);
    });

    test('hidden ports cant be searched', () => {
        expect(searchType('a')).toStrictEqual([]);
    });
});
