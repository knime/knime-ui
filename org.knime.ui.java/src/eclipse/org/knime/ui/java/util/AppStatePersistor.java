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
 *   Jan 17, 2023 (hornm): created
 */
package org.knime.ui.java.util;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collector;

import org.eclipse.swt.widgets.Display;
import org.knime.core.node.KNIMEConstants;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.gateway.impl.project.WorkflowProject;
import org.knime.gateway.impl.project.WorkflowProjectManager;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

/**
 * Utility methods to persist (saven and load) the state of the KNIME UI to a file.
 *
 * An important part of the app state is derived from the {@link WorkflowProjectManager} which keeps track of the opened
 * and active workflow projects.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public final class AppStatePersistor {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static final NodeLogger LOGGER = NodeLogger.getLogger(AppStatePersistor.class);

    private static final Path APP_STATE_FILE = Paths.get(KNIMEConstants.getKNIMEHomeDir(), "app_state.json");

    private static final String RELATIVE_PATH = "relativePath";

    private static final String VERSION = "version";

    private static final String PROJECTS = "projects";

    private static final String ORIGIN = "origin";

    private static final String SPACE_ID = "spaceId";

    private static final String PROVIDER_ID = "providerId";

    private static final String ACTIVE = "active";

    private static final String NAME = "name";

    private AppStatePersistor() {
        // utility
    }

    /**
     * @return a string representing the app state
     */
    public static String serializeAppState() {
        var wpm = WorkflowProjectManager.getInstance();
        var projectsJson = wpm.getWorkflowProjectsIds().stream().map(id -> wpm.getWorkflowProject(id).orElse(null))
            .filter(Objects::nonNull) //
            // only persist local workflow projects
            .filter(wp -> wp.getOrigin().map(o -> o.getProviderId().equals(LocalSpaceUtil.LOCAL_SPACE_PROVIDER_ID))
                .orElse(Boolean.FALSE)) //
            .map(wp -> serializeWorkflowProject(wpm, wp)) //
            .collect(Collector.of(MAPPER::createArrayNode, (n, j) -> n.addPOJO(j), (n1, n2) -> {
                throw new UnsupportedOperationException();
            }));
        return MAPPER.createObjectNode().put(VERSION, KNIMEConstants.VERSION).set(PROJECTS, projectsJson)
            .toPrettyString();
    }

    private static ObjectNode serializeWorkflowProject(final WorkflowProjectManager wpm, final WorkflowProject wp) {
        var projectJson = MAPPER.createObjectNode() //
            .put(NAME, wp.getName()) //
            .put(ACTIVE, wpm.isActiveWorkflowProject(wp.getID()));
        wp.getOrigin().ifPresent(origin -> {
            var originJson = MAPPER.createObjectNode() //
                .put(PROVIDER_ID, origin.getProviderId()) //
                .put(SPACE_ID, origin.getSpaceId());
            origin.getRelativePath().ifPresent(p -> originJson.put(RELATIVE_PATH, p));
            projectJson.set(ORIGIN, originJson);
        });
        return projectJson;
    }

    /**
     * Saves the provided app state string into the dedicated app state file.
     *
     * @param serializedAppState the app state, or {@code null} (in which case nothing is being saved)
     */
    public static void saveAppState(final String serializedAppState) {
        if (serializedAppState != null) {
            try {
                Files.writeString(APP_STATE_FILE, serializedAppState);
            } catch (IOException e) {
                LOGGER.error("Failed to save the app state", e);
            }
        }
    }

    /**
     * Loads the app state from a file and registers the opened workflow projects with the
     * {@link WorkflowProjectManager}.
     */
    public static void loadAppState() {
        if (!Files.exists(APP_STATE_FILE)) {
            return;
        }
        JsonNode appStateJson;
        try {
            appStateJson = MAPPER.readTree(APP_STATE_FILE.toFile());
        } catch (IOException e) {
            LOGGER.error("Failed to load the app state", e);
            return;
        }
        var projectsJson = (ArrayNode)appStateJson.get(PROJECTS);
        var wpm = WorkflowProjectManager.getInstance();
        for (var projectJson : projectsJson) {
            var project = createWorkflowProject(projectJson);
            var projectId = project.getID();
            wpm.addWorkflowProject(projectId, project);
            if (projectJson.get(ACTIVE).asBoolean()) {
                // needs to be called in the UI thread because opening the workflow shows a progress bar
                // (see the 'openProject'-implementation below)
                Display.getDefault().syncExec(() -> wpm.openAndCacheWorkflow(projectId));
                wpm.setWorkflowProjectActive(projectId);
            }
        }
    }

    private static WorkflowProject createWorkflowProject(final JsonNode projectJson) {
        var relativePath = Path.of(projectJson.get(ORIGIN).get(RELATIVE_PATH).asText());
        assert !relativePath.isAbsolute();
        var absolutePath = LocalSpaceUtil.getLocalWorkspace().getLocalRootPath().resolve(relativePath);
        var name = projectJson.get(NAME).asText();
        var projectId = LocalSpaceUtil.getUniqueProjectId(name);
        var localSpace = LocalSpaceUtil.getLocalWorkspace();
        var itemId = localSpace.getItemId(absolutePath);
        return new WorkflowProject() { // NOSONAR

            @Override
            public String getName() {
                return name;
            }

            @Override
            public String getID() {
                return projectId;
            }

            @Override
            public Optional<Origin> getOrigin() {
                var originJson = projectJson.get(ORIGIN);
                return Optional.of(new Origin() {

                    @Override
                    public String getSpaceId() {
                        return originJson.get(SPACE_ID).asText();
                    }

                    @Override
                    public String getProviderId() {
                        return originJson.get(PROVIDER_ID).asText();
                    }

                    @Override
                    public String getItemId() {
                        return itemId;
                    }

                    @Override
                    public Optional<String> getRelativePath() {
                        return Optional.of(originJson.get(RELATIVE_PATH).asText());
                    }
                });
            }

            @Override
            public WorkflowManager openProject() {
                if (!Files.exists(absolutePath)) {
                    DesktopAPUtil.showWarning("No workflow project found",
                        "No workflow project found at " + absolutePath);
                    return null;
                }
                return DesktopAPUtil.openWorkflowInWebUIPerspectiveOnly(localSpace, itemId).orElseThrow();
            }

        };
    }

}