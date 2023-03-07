export const setupAPI = () => {
    if (window.EquoCommService) {
        window.EquoCommService.on(
            'org.knime.ui.java.jsonrpcNotification',
            (jsonrpcNotification) => window.jsonrpcNotification(jsonrpcNotification),
            // eslint-disable-next-line no-console
            e => console.error(e)
        );

        if (!window.jsonrpc) {
            window.jsonrpc = request => window.EquoCommService.send(
                'org.knime.ui.java.jsonrpc',
                JSON.stringify(request)
            );
        }
    }
};
