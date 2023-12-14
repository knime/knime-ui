/*
 * ------------------------------------------------------------------------
 *
 *  Copyright by KNIME AG, Zurich, Switzerland
 *  Website: http://www.knime.com; Email: contact@knime.com
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License, Version 3, as
 *  published by the Free Software Foundation.
 *
 *  This program is distributed in the hope that it will be useful, but
 *  WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, see <http://www.gnu.org/licenses>.
 *
 *  Additional permission under GNU GPL version 3 section 7:
 *
 *  KNIME interoperates with ECLIPSE solely via ECLIPSE's plug-in APIs.
 *  Hence, KNIME and ECLIPSE are both independent programs and are not
 *  derived from each other. Should, however, the interpretation of the
 *  GNU GPL Version 3 ("License") under any applicable laws result in
 *  KNIME and ECLIPSE being a combined program, KNIME AG herewith grants
 *  you the additional permission to use and propagate KNIME together with
 *  ECLIPSE with only the license terms in place for ECLIPSE applying to
 *  ECLIPSE and the GNU GPL Version 3 applying for KNIME, provided the
 *  license terms of ECLIPSE themselves allow for the respective use and
 *  propagation of ECLIPSE together with KNIME.
 *
 *  Additional permission relating to nodes for KNIME that extend the Node
 *  Extension (and in particular that are based on subclasses of NodeModel,
 *  NodeDialog, and NodeView) and that only interoperate with KNIME through
 *  standard APIs ("Nodes"):
 *  Nodes are deemed to be separate and independent programs and to not be
 *  covered works.  Notwithstanding anything to the contrary in the
 *  License, the License does not apply to Nodes, you are not required to
 *  license Nodes under the License, and you are granted a license to
 *  prepare and propagate Nodes, in each case even if such Nodes are
 *  propagated with or for interoperation with KNIME.  The owner of a Node
 *  may freely choose the license terms applicable to such Node, including
 *  when such Node is propagated with or for interoperation with KNIME.
 * ---------------------------------------------------------------------
 *
 * History
 *   Jun 13, 2023 (Adrian Nembach, KNIME GmbH, Konstanz, Germany): created
 */
package org.knime.ui.java.api;

import java.util.Collections;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;
import java.util.stream.Stream;

import org.knime.gateway.impl.webui.service.events.EventConsumer;

/**
 * API for the KNIME AI Assistant.
 *
 * @author Adrian Nembach, KNIME GmbH, Konstanz, Germany
 */
@SuppressWarnings("restriction")
public final class ChatAPI {

    /**
     * Listener for chat messages.
     *
     * @author Adrian Nembach, KNIME GmbH, Konstanz, Germany
     */
    public interface ChatListener {

        /**
         * Invoked when the user sends a message in the chat.
         *
         * @param conversationId id of the conversation (null if this is the first message of the conversation)
         * @param chainType the type of chain (qa or build) to message
         * @param projectId identifier of the workflow project
         * @param workflowId identifier of the subworkflow (i.e. meta node or component)
         * @param selectedNodes identifiers of the currently selected nodes
         * @param messages a JSON string in the form [{"role": role, "content": content}, ...]
         */
        void onNewMessage(String conversationId, String chainType, String projectId, String workflowId, String[] selectedNodes, final String messages);

        /**
         * Invoked if the user cancels the answer of the currently processed message.
         *
         * @param conversationId id of the conversation
         * @param chainType the type of chain to cancel
         */
        void onCancel(String conversationId, String chainType);


        /**
         * @return the UI strings (disclaimer and welcome messages) in JSON format
         */
        String getUiStrings();

        /**
         * @return the ID of the hub that provides the ai-service
         */
        String getHubID();

        /**
         * @return the ID of the preference page that
         */
        String getPreferencePageID();
    }

    private static final Set<ChatListener> LISTENERS = Collections.newSetFromMap(new ConcurrentHashMap<>());

    /**
     * @param listener to register
     * @return true if the listener was not already registered
     */
    public static boolean registerListener(final ChatListener listener) {
        return LISTENERS.add(listener);
    }

    /**
     * @param listener to remove
     * @return true if the listener was registered
     */
    public static boolean unregisterListener(final ChatListener listener) {
        return LISTENERS.remove(listener);
    }

    /**
     * @param conversationId id of the conversation (null if this is the first message of the conversation)
     * @param chainType the type of chain to message (qa or build)
     * @param projectId the workflow project identifier
     * @param workflowId the identifier of the subworkflow (
     * @param selectedNodes the identifiers of the currently selected nodes
     * @param messages a JSON string in the form [{"role": role, "content": content}, ...]
     */
    @API
    public static void makeAiRequest(final String conversationId, final String chainType, final String projectId,
        final String workflowId, final Object[] selectedNodes, final String messages) {
        var selectedNodeIds = Stream.of(selectedNodes).map(String.class::cast).toArray(String[]::new);
        LISTENERS.forEach(l -> l.onNewMessage(conversationId, chainType, projectId, workflowId, selectedNodeIds, messages));
    }

    /**
     * Aborts the specified chain.
     *
     * @param conversationId the id of the conversation
     * @param chainType the chain to abort (qa or build)
     */
    @API
    public static void abortAiRequest(final String conversationId, final String chainType) {
        LISTENERS.forEach(l -> l.onCancel(conversationId, chainType));
    }


    private static Optional<ChatListener> getListener() {
        return LISTENERS.stream().findFirst();
    }

    /**
     * @return the ID of the hub that provides the ai-service
     */
    @API
    public static String getHubID() {
        return getListener().map(ChatListener::getHubID).orElse(null);
    }

    /**
     * @return the ID of the hub that provides the ai-service
     */
    @API(runInUIThread = false) // unnecessarily blocks the UI otherwise - see AP-21492
    public static String getUiStrings() {
        return getListener().map(ChatListener::getUiStrings).orElse(null);
    }

    /**
     * Installs the KNIME AI Assistant.
     */
    @API
    public static void installKAI() {
        ImportURI.startInstallationJob("KNIME AI Assistant", "org.knime.features.ai.assistant", null);
    }

    /**
     * Opens the AI Assistant preference page
     */
    @API
    public static void openAiAssistantPreferencePage() {
        EclipseUIAPI.openPreferencePage(getListener().orElseThrow().getPreferencePageID());
    }

    /**
     * @return the returned consumer relays events to the frontend (message must be JSON serializable)
     */
    public static Consumer<Object> getEventConsumer() {
        var eventConsumer = DesktopAPI.getDeps(EventConsumer.class);
        return m -> eventConsumer.accept("AiAssistantEvent", m);
    }

    /**
     * Notifies the frontend that the AI server changed.
     */
    public static void notifyAiServerChanged() {
        DesktopAPI.getDeps(EventConsumer.class).accept("AiAssistantServerChangedEvent", "");
    }

}
