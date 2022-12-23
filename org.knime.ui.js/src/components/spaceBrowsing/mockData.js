const hubSpace = {
    id: 'hub_space_id',
    name: 'Churn Analysis Project',
    kudos: 40,
    description: `
            This project illustrates how to buildt and evaluate a churn prediction model, i. e. predict…
            `,
    lastUpdate: '16. Dec 2022',
    workflows: 2,
    components: 0,
    other: 0,
    private: true,
    owner: {
        name: 'MS'
    }
};

export const MOCK_DATA = {
    hubSpaces: {
        community: {
            name: 'Hub 1',
            mySpaces: [
                hubSpace,
                { ...hubSpace, private: false },
                { ...hubSpace, private: false },
                hubSpace
            ],
            sharedSpaces: []
        }
    }
};
