import { rpc } from './json-rpc-adapter';
// eslint-disable-next-line object-curly-newline
import {
    initJsonRpcNotifications,
    getRegisteredNotificationHandler,
    registerNotificationHandler
// eslint-disable-next-line object-curly-newline
} from './json-rpc-notifications';

const JSON_RPC_ACTION_ID = 'org.knime.ui.java.jsonrpc';
const JSON_RPC_NOTIFICATION_ACTION_ID = 'org.knime.ui.java.jsonrpcNotification';

const initJsonRpcClient = () => {
    initJsonRpcNotifications();

    if (window.EquoCommService) {
        window.EquoCommService.on(
            JSON_RPC_ACTION_ID,
            (jsonrpcNotification) => window.jsonrpcNotification(jsonrpcNotification),
            // eslint-disable-next-line no-console
            error => console.error(error)
        );

        if (!window.jsonrpc) {
            window.jsonrpc = request => window.EquoCommService.send(
                JSON_RPC_NOTIFICATION_ACTION_ID,
                JSON.stringify(request)
            );
        }
    }
};

export {
    initJsonRpcClient,
    rpc,
    registerNotificationHandler,
    getRegisteredNotificationHandler
};
