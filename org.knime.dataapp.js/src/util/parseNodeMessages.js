/**
 * Reusable function for reducing messages from different sources.
 *
 * @param {Object} messages - the aggregator object from the reduce call.
 * @param {Object} nodeMessage - the object containing the message information.
 * @param {String} [nodeMessage.type] - the type of the node message, defined for
 *      pageMessages, but not jobMessages.
 * @param {String} [nodeMessage.messageType] - the type of the node message, defined for
 *      jobMessages, but not pageMessages.
 * @param {String} nodeMessage.message - the node message.
 * @param {String} nodeName - the name of the node.
 * @returns {Object} messages - the aggregator passed as the first parameter.
 */
const updateMessages = (messages, nodeMessage, nodeName) => {
  if (!nodeMessage || !nodeName) {
    return messages;
  }
  let type = nodeMessage.type || nodeMessage.messageType || "WARN";
  let nodeKey = `${type} ${nodeName}`;
  if (
    messages[nodeKey] &&
    !messages[nodeKey].message.includes(nodeMessage.message)
  ) {
    messages[nodeKey].message.push(nodeMessage.message);
  } else {
    messages[nodeKey] = {
      message: [nodeMessage.message],
      type,
    };
  }
  return messages;
};

/**
 * Utility function to combine node messages from the current job and current page. Utility
 * needed because the messages are in different formats, but should be combined and deduplicated.
 *
 * @param {Object} pageMessages - the object holding the node messages from the current page.
 * @param {Array} jobMessages - the array containing the node messages from the current job.
 * @returns {Object} messages - the combined and deduplicated node messages from the job and page.
 */
export default (pageMessages = {}, jobMessages = []) => {
  let messages = Object.entries(pageMessages).reduce((obj, entry) => {
    let [nodeName, nodeMessage] = entry;
    return updateMessages(obj, nodeMessage, nodeName);
  }, {});
  return jobMessages.reduce((obj, nodeMessage) => {
    let nodeName = nodeMessage && nodeMessage.node;
    return updateMessages(obj, nodeMessage, nodeName);
  }, messages);
};
