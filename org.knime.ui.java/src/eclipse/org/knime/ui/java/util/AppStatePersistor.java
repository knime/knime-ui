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
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collector;

import org.knime.core.node.KNIMEConstants;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.workflow.NodeTimer;
import org.knime.core.node.workflow.NodeTimer.GlobalNodeStats.WorkflowType;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.gateway.api.webui.entity.SpaceItemReferenceEnt.ProjectTypeEnum;
import org.knime.gateway.impl.project.Project;
import org.knime.gateway.impl.project.Project.Origin;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.gateway.impl.webui.spaces.SpaceProvider;
import org.knime.ui.java.util.MostRecentlyUsedProjects.RecentlyUsedProject;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

/**
 * Utility methods to persist (saven and load) the state of the KNIME UI to a file.
 *
 * An important part of the app state is derived from the {@link ProjectManager} which keeps track of the opened
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

    private static final String MRU_PROJECTS = "mostRecentlyUsedProjects";

    private static final String ORIGIN = "origin";

    private static final String ITEM_ID = "itemId";

    private static final String SPACE_ID = "spaceId";

    private static final String PROVIDER_ID = "providerId";

    private static final String ACTIVE = "active";

    private static final String NAME = "name";

    private static final String TIME_USED = "timeUsed";

    private AppStatePersistor() {
        // utility
    }

    /**
     * @param pm supplies the projects to serialize
     * @param mruProjects supplies the recently used projects to serialize
     * @return a string representing the app state
     */
    public static String serializeAppState(final ProjectManager pm, final MostRecentlyUsedProjects mruProjects) {
        var projectsJson = serializeProjects(pm);
        var mruProjectsJson = serializeMRUProjects(mruProjects);
        var res = MAPPER.createObjectNode().put(VERSION, KNIMEConstants.VERSION);
        res.set(PROJECTS, projectsJson);
        if (!mruProjectsJson.isEmpty()) {
            res.set(MRU_PROJECTS, mruProjectsJson);
        }
        return res.toPrettyString();
    }

    private static ArrayNode serializeProjects(final ProjectManager pm) {
        return pm.getProjectIds().stream().map(id -> pm.getProject(id).orElse(null)).filter(Objects::nonNull) //
            // only persist local workflow projects
            .filter(wp -> wp.getOrigin().map(o -> o.getProviderId().equals(SpaceProvider.LOCAL_SPACE_PROVIDER_ID))
                .orElse(Boolean.FALSE)) //
            .map(wp -> serializeProject(pm, wp)) //
            .collect(arrayNodeCollector());
    }

    private static ObjectNode serializeProject(final ProjectManager pm, final Project wp) {
        var projectJson = MAPPER.createObjectNode() //
            .put(NAME, wp.getName()) //
            .put(ACTIVE, pm.isActiveProject(wp.getID()));
        wp.getOrigin().ifPresent(origin -> projectJson.set(ORIGIN, serializeOrigin(origin)));
        return projectJson;
    }

    private static ArrayNode serializeMRUProjects(final MostRecentlyUsedProjects mruProjects) {
        return mruProjects.get().stream().map(AppStatePersistor::serializeRUProject) //
            .collect(arrayNodeCollector());
    }

    private static ObjectNode serializeRUProject(final RecentlyUsedProject project) {
        var projectJson = MAPPER.createObjectNode() //
            .put(NAME, project.name()) //
            .put(TIME_USED, project.timeUsed().format(DateTimeFormatter.ISO_OFFSET_DATE_TIME));
        projectJson.set(ORIGIN, serializeOrigin(project.origin()));
        return projectJson;
    }

    private static JsonNode serializeOrigin(final Origin origin) {
        var originJson = MAPPER.createObjectNode() //
            .put(PROVIDER_ID, origin.getProviderId()) //
            .put(SPACE_ID, origin.getSpaceId());
        origin.getRelativePath().ifPresentOrElse(p -> originJson.put(RELATIVE_PATH, p),
            () -> originJson.put(ITEM_ID, origin.getItemId()));
        return originJson;
    }

    private static Collector<Object, ArrayNode, ArrayNode> arrayNodeCollector() {
        return Collector.of(MAPPER::createArrayNode, ArrayNode::addPOJO, (n1, n2) -> {
            throw new UnsupportedOperationException();
        });
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
     * Loads the app state from a file and registers the opened workflow projects with the {@link ProjectManager}.
     *
     * @param pm
     * @param mruProjects
     */
    public static void loadAppState(final ProjectManager pm, final MostRecentlyUsedProjects mruProjects) {
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
        if (pm != null) {
            deserializeProjects(appStateJson, pm);
        }
        if (mruProjects != null) {
            deserializeMRUProjects(appStateJson, mruProjects);
        }
    }

    /**
     * @param appStateJson
     */
    private static void deserializeProjects(final JsonNode appStateJson, final ProjectManager pm) {
        var projectsJson = (ArrayNode)appStateJson.get(PROJECTS);
        for (var projectJson : projectsJson) {
            if (!hasOriginAndRelativePath(projectJson)) {
                continue; // Skips the project if no origin or relative path were persisted
            }
            var project = deserializeProject(projectJson);
            var projectId = project.getID();
            pm.addProject(project);
            if (projectJson.get(ACTIVE).asBoolean()) {
                var wfm = pm.openAndCacheProject(projectId).orElse(null);
                if (wfm != null) {
                    pm.setProjectActive(projectId);
                    NodeTimer.GLOBAL_TIMER.incWorkflowOpening(wfm, WorkflowType.LOCAL);
                } else {
                    pm.removeProject(projectId, w -> {
                    });
                }
            }
        }
    }

    private static Project deserializeProject(final JsonNode projectJson) {
        var name = projectJson.get(NAME).asText();
        var projectId = LocalSpaceUtil.getUniqueProjectId(name);
        var origin = deserializeOrigin(projectJson.get(ORIGIN));
        var localSpace = LocalSpaceUtil.getLocalWorkspace();
        var absolutePath = localSpace.getLocalRootPath().resolve(origin.getRelativePath().orElseThrow());
        return new Project() { // NOSONAR

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
                return Optional.of(origin);
            }

            @Override
            public WorkflowManager loadWorkflowManager() {
                if (!Files.exists(absolutePath)) {
                    DesktopAPUtil.showWarning("No workflow project found",
                        "No workflow project found at " + absolutePath);
                    return null;
                }
                return DesktopAPUtil.runWithProgress(DesktopAPUtil.LOADING_WORKFLOW_PROGRESS_MSG, LOGGER, monitor -> {// NOSONAR better than inline class
                    var wfm = DesktopAPUtil.fetchAndLoadWorkflowWithTask(localSpace, origin.getItemId(), monitor);
                    if (wfm == null) {
                        DesktopAPUtil.showWarning("Failed to load workflow",
                            "The workflow at '" + absolutePath + "' couldn't be loaded.");
                    }
                    return wfm;
                }).orElse(null);
            }
        };
    }

    private static boolean hasOriginAndRelativePath(final JsonNode projectJson) {
        if (!projectJson.has(ORIGIN)) {
            return false;
        }
        return projectJson.get(ORIGIN).has(RELATIVE_PATH);
    }

    private static void deserializeMRUProjects(final JsonNode appStateJson,
        final MostRecentlyUsedProjects mruProjects) {
        var projectsJson = (ArrayNode)appStateJson.get(MRU_PROJECTS);
        if (projectsJson == null) {
            return;
        }
        for (var projectJson : projectsJson) {
            mruProjects.add(deserializeMRUProject(projectJson));
        }
    }

    private static RecentlyUsedProject deserializeMRUProject(final JsonNode projectJson) {
        return new RecentlyUsedProject(projectJson.get(NAME).asText(), deserializeOrigin(projectJson.get(ORIGIN)),
            OffsetDateTime.parse(projectJson.get(TIME_USED).asText(), DateTimeFormatter.ISO_OFFSET_DATE_TIME));
    }

    private static Origin deserializeOrigin(final JsonNode originJson) {
        String itemId;
        var relativePath = Optional.ofNullable(originJson.get(RELATIVE_PATH)).map(JsonNode::asText);
        var isLocal = relativePath.isPresent();
        if (isLocal) {
            // relative path only given for local projects
            var localSpace = LocalSpaceUtil.getLocalWorkspace();
            var absolutePath = localSpace.getLocalRootPath().resolve(Path.of(relativePath.get()));
            itemId = localSpace.getItemId(absolutePath);
        } else {
            itemId = originJson.get(ITEM_ID).asText();
        }
        return new Origin() { // NOSONAR

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
                return relativePath;
            }

            @Override
            public ProjectTypeEnum getProjectType() {
                // project type might not be available in the rare case that the workflow at the
                // given absolute path doesn't exist anymore
                if (isLocal) {
                    return LocalSpaceUtil.getLocalWorkspace().getProjectType(itemId).orElse(null);
                } else {
                    return null;
                }
            }
        };
    }

}