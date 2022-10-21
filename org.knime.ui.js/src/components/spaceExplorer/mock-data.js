const FILE_TREE_STRUCTURE = {
    id: 'root',
    name: 'root',
    children: {
        '1': {
            id: '1',
            name: 'Folder 1',
            type: 'workflow-group',
            children: {
                '1:1': {
                    id: '1:1',
                    name: 'Folder 1:1',
                    type: 'workflow-group',
                    children: {
                        '1:1:1': {
                            id: '1:1:1',
                            name: 'File 1.1.1',
                            type: 'workflow'
                        },
                        '1:1:2': {
                            id: '1:1:2',
                            name: 'File 1.1.2',
                            type: 'data'
                        }
                    }
                },
                '1:2': {
                    id: '1:2',
                    name: 'File 1.2',
                    type: 'workflow-template'
                }
            }
        },
        '2': {
            id: '2',
            name: 'Folder 2',
            type: 'workflow-group',
            children: {
                '2:1': {
                    id: '2:1',
                    name: 'File 2.1',
                    type: 'component'
                }
            }
        },
        '3': {
            id: '3',
            name: 'Folder 3',
            type: 'workflow-group',
            children: {}
        },
        '4': {
            id: '4',
            name: 'File 4',
            type: 'workflow'
        }
    }
};

export const getSpaceDataByPath = (path) => new Promise(resolve => {
    const data = path.reduce((directoryLevel, nextPath) => {
        if (nextPath === 'root') {
            return directoryLevel;
        }

        return directoryLevel.children[nextPath];
    }, FILE_TREE_STRUCTURE);

    setTimeout(() => {
        resolve(data);
    // eslint-disable-next-line no-magic-numbers
    }, 700);
});
