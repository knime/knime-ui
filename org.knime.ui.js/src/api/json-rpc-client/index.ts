import { rpc } from './json-rpc-adapter';
// eslint-disable-next-line object-curly-newline
import {
    getRegisteredNotificationHandler,
    registerNotificationHandler,
    serverEventHandler
// eslint-disable-next-line object-curly-newline
} from './server-events';

const JSON_RPC_ACTION_ID = 'org.knime.ui.java.jsonrpc';
const JAVA_EVENT_ACTION_ID = 'org.knime.ui.java.event';

const initJsonRpcClient = () => {
    if (window.EquoCommService) {
        window.EquoCommService.on(
            JAVA_EVENT_ACTION_ID,
            (event) => serverEventHandler(event),
            // eslint-disable-next-line no-console
            error => console.error(error)
        );

        if (!window.jsonrpc) {
            window.jsonrpc = request => window.EquoCommService.send(
                JSON_RPC_ACTION_ID,
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
