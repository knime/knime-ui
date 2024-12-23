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
 *   Jan 7, 2021 (hornm): created
 */
package org.knime.ui.java.api;

import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.StreamSupport;

import org.knime.core.eclipseUtil.UpdateChecker.UpdateInfo;
import org.knime.core.node.NodeLogger;
import org.knime.core.ui.util.SWTUtilities;
import org.knime.gateway.api.webui.entity.UpdateAvailableEventEnt;
import org.knime.gateway.impl.webui.UpdateStateProvider;
import org.knime.gateway.impl.webui.spaces.local.LocalSpace;
import org.knime.ui.java.util.TestingUtil;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;

/**
 * Functions or testing only.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
final class TestingAPI {

    private TestingAPI() {
        // stateless
    }

    /**
     * Function that allows one to programmatically initialise (and parameterize) the application state from JS. It,
     * e.g., determines what workflow are opened from the beginning.
     */
    @API
    static void initAppForTesting(final String appStateString) {
        SWTUtilities.getActiveShell().setMaximized(true);

        JsonNode appStateNode;
        try {
            appStateNode = DesktopAPI.MAPPER.readValue(appStateString, JsonNode.class);
        } catch (JsonProcessingException ex) {
            NodeLogger.getLogger(TestingAPI.class).warn("Argument couldn't be parsed to JSON", ex);
            return;
        }
        JsonNode openedWorkflows = appStateNode.get("openedWorkflows");
        var activeProjectId = new AtomicReference<String>();
        List<String> projectIds = openedWorkflows == null ? //
            Collections.emptyList() : //
            StreamSupport.stream(openedWorkflows.spliterator(), false).map(ow -> {
                var projectId = ow.get("projectId").asText();
                var visible = ow.get("visible");
                if (visible != null && visible.asBoolean()) {
                    activeProjectId.set(projectId);
                }
                return projectId;
            }).toList();
        TestingUtil.initAppForTesting(projectIds, activeProjectId.get(),
            // the local space is lazily supplied since it's not available, yet,
            // when this desktop API function is being called
            // -> it will become available as soon as LifeCycle.init is called
            () -> DesktopAPI.getDeps(LocalSpace.class));
    }

    /**
     * Function that allows one to programmatically clear the App. I.e. clears the app state and sets the url to
     * 'about:blank'.
     */
    @API
    static void clearAppForTesting() {
        TestingUtil.clearAppForTesting();
    }

    /**
     *
     * Function used to emit {@link UpdateAvailableEventEnt} for testing.
     *
     * @param updateStateString
     */
    @API
    static void emitUpdateAvailableEventForTesting(final String updateStateString) { // NOSONAR: Always returning `null` is fine here.
        JsonNode updateStateNode;
        try {
            updateStateNode = DesktopAPI.MAPPER.readValue(updateStateString, JsonNode.class);
        } catch (JsonProcessingException ex) {
            NodeLogger.getLogger(TestingAPI.class).warn("Argument couldn't be parsed to JSON", ex);
            return;
        }

        JsonNode newReleases = updateStateNode.get("newReleases");
        List<UpdateInfo> newReleasesList = newReleases == null ? //
            Collections.emptyList() : //
            StreamSupport.stream(newReleases.spliterator(), false)//
                .map(TestingAPI::createUpdateInfo)//
                .toList();
        JsonNode bugfixes = updateStateNode.get("bugfixes");
        List<String> bugfixesList = bugfixes == null ? //
            Collections.emptyList() : //
            StreamSupport.stream(bugfixes.spliterator(), false)//
                .map(JsonNode::textValue)//
                .toList();

        DesktopAPI.getDeps(UpdateStateProvider.class).emitUpdateNotificationsForTesting(newReleasesList, bugfixesList);
    }

    private static UpdateInfo createUpdateInfo(final JsonNode jsonNode) {
        return new UpdateInfo(null, jsonNode.get("name").textValue(), jsonNode.get("shortName").textValue(),
            jsonNode.get("isUpdatePossible").booleanValue());
    }

}
