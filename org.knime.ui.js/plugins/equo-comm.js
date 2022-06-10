// TODO this file will be removed with NXT-987
/* istanbul ignore file */
/* eslint-disable */
export default () => {
    // eslint-disable-next-line no-console
    window.EquoCommService.on('org.knime.ui.java.jsonrpcNotification', jsonrpcNotificationBase64Decoded, e => console.error(e));
    if (!window.jsonrpc) {
        window.jsonrpc = request => window.EquoCommService.send('org.knime.ui.java.jsonrpc', JSON.stringify(request));
    }
};

function jsonrpcNotificationBase64Decoded(base64JsonString) {
    window.jsonrpcNotification(window.atob(base64JsonString));
}
