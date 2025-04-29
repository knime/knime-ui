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
package org.knime.ui.java.persistence;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collector;

import org.knime.core.node.KNIMEConstants;
import org.knime.core.node.NodeLogger;
import org.knime.core.util.Pair;
import org.knime.gateway.api.webui.entity.SpaceItemReferenceEnt.ProjectTypeEnum;
import org.knime.gateway.impl.project.Origin;
import org.knime.gateway.impl.project.Project;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.gateway.impl.webui.spaces.local.LocalSpace;
import org.knime.ui.java.util.DesktopAPUtil;
import org.knime.ui.java.util.LocalSpaceUtil;
import org.knime.ui.java.util.MostRecentlyUsedProjects;
import org.knime.ui.java.util.MostRecentlyUsedProjects.RecentlyUsedProject;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

/**
 * Utility methods to persist (save and load) the state of the KNIME UI to a file.
 * <p>
 * An important part of the app state is derived from the {@link ProjectManager} which keeps track of the opened and
 * active workflow projects.
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

    private static final String PROJECT_TYPE = "projectType";

    private static final String ACTIVE = "active";

    private static final String NAME = "name";

    private static final String TIME_USED = "timeUsed";

    private AppStatePersistor() {
        // utility
    }

    /**
     * @param pm supplies the projects to serialize
     * @param mruProjects supplies the recently used projects to serialize
     * @param localSpace instance of the local space
     * @return a string representing the app state
     */
    public static String serializeAppState(final ProjectManager pm, final MostRecentlyUsedProjects mruProjects,
        final LocalSpace localSpace) {
        var projectsJson = serializeProjects(pm, localSpace);
        var mruProjectsJson = serializeMRUProjects(mruProjects, localSpace);
        var res = MAPPER.createObjectNode().put(VERSION, KNIMEConstants.VERSION);
        res.set(PROJECTS, projectsJson);
        if (!mruProjectsJson.isEmpty()) {
            res.set(MRU_PROJECTS, mruProjectsJson);
        }
        return res.toPrettyString();
    }

    private static ArrayNode serializeProjects(final ProjectManager projectManager, final LocalSpace localSpace) {
        return projectManager.getProjectIds().stream().map(id -> projectManager.getProject(id).orElse(null))
            .filter(Objects::nonNull) //
            // only persist local workflow projects
            .filter(project -> project.getOrigin() //
                .map(o -> LocalSpaceUtil.isLocalSpace(o.providerId(), o.spaceId())) //
                .orElse(Boolean.FALSE) //
            ) //
            .map(project -> serializeProject(projectManager, project, localSpace)) //
            .collect(arrayNodeCollector());
    }

    private static ObjectNode serializeProject(final ProjectManager projectManager, final Project project,
        final LocalSpace localSpace) {
        var projectJson = MAPPER.createObjectNode() //
            .put(NAME, project.getName()) //
            .put(ACTIVE, projectManager.isActiveProject(project.getID()));
        project.getOrigin().ifPresent(origin -> projectJson.set(ORIGIN, serializeOrigin(origin, false, localSpace)));
        return projectJson;
    }

    private static ArrayNode serializeMRUProjects(final MostRecentlyUsedProjects mruProjects,
        final LocalSpace localSpace) {
        return mruProjects.get().stream().map(project -> serializeRUProject(project, localSpace)) //
            .collect(arrayNodeCollector());
    }

    private static ObjectNode serializeRUProject(final RecentlyUsedProject project, final LocalSpace localSpace) {
        var projectJson = MAPPER.createObjectNode() //
            .put(NAME, project.name()) //
            .put(TIME_USED, project.timeUsed().format(DateTimeFormatter.ISO_OFFSET_DATE_TIME));
        projectJson.set(ORIGIN, serializeOrigin(project.origin(), true, localSpace));
        return projectJson;
    }

    private static JsonNode serializeOrigin(final Origin origin, final boolean addProjectTypeIfPresent,
        final LocalSpace localSpace) {
        var originJson = MAPPER.createObjectNode() //
            .put(PROVIDER_ID, origin.providerId()) //
            .put(SPACE_ID, origin.spaceId());
        if (addProjectTypeIfPresent) {
            origin.projectType().map(ProjectTypeEnum::name).ifPresent(t -> originJson.put(PROJECT_TYPE, t));
        }
        if (origin.isLocal()) {
            final var relativePath = localSpace.toLocalRelativePath(origin.itemId()).orElseThrow();
            originJson.put(RELATIVE_PATH, relativePath.toString());
        } else {
            originJson.put(ITEM_ID, origin.itemId());
        }
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
     * A representation of an open project which needs to be restored
     *
     * @param origin the project's origin
     * @param isActive indicates if the project is the currently active one
     */
    public record RestoredOpenProject(Origin origin, boolean isActive) {

    }

    /**
     * A representation of the loaded application state with recently used and open projects.
     *
     * @param recentlyUsedProjects projects which were recently used
     * @param openProjectsToRestore projects which were open and need to be restored
     */
    public record LoadedApplicationState(List<RecentlyUsedProject> recentlyUsedProjects,
            List<RestoredOpenProject> openProjectsToRestore) {

        /**
         * clears the record
         *
         * @return an empty instance
         */
        public static LoadedApplicationState empty() {
            return new LoadedApplicationState(List.of(), List.of());
        }

    }

    /**
     * Loads the app state from a file and registers the opened workflow projects with the {@link ProjectManager}.
     *
     * @param localSpace the local space instance
     * @return -
     */
    public static LoadedApplicationState loadAppState(final LocalSpace localSpace) {
        if (!Files.exists(APP_STATE_FILE)) {
            return LoadedApplicationState.empty();
        }
        JsonNode appStateJson;
        try {
            appStateJson = MAPPER.readTree(APP_STATE_FILE.toFile());
        } catch (IOException e) {
            LOGGER.error("Failed to load the app state", e);
            return LoadedApplicationState.empty();
        }
        //
        return new LoadedApplicationState( //
            deserializeMRUProjects(appStateJson, localSpace), //
            deserializeProjects(appStateJson, localSpace) //
        );
    }

    private static List<RestoredOpenProject> deserializeProjects(final JsonNode appStateJson,
        final LocalSpace localSpace) {
        var projectsJson = (ArrayNode)appStateJson.get(PROJECTS);
        var restoredOpenProjects = new ArrayList<RestoredOpenProject>();
        for (var projectJson : projectsJson) {
            if (!hasOriginAndRelativePath(projectJson)) {
                continue;
            }
            var restoredOpenProject = deserializeLocalProject(projectJson, localSpace);
            if (restoredOpenProject != null) {
                restoredOpenProjects.add(restoredOpenProject);
            }
        }
        return restoredOpenProjects;
    }

    private static RestoredOpenProject deserializeLocalProject(final JsonNode projectJson,
        final LocalSpace localSpace) {
        var originAndRelativePath = deserializeOrigin(projectJson.get(ORIGIN), localSpace);
        var absolutePath = localSpace.getRootPath().resolve(originAndRelativePath.getSecond().orElseThrow());
        if (!Files.exists(absolutePath)) {
            DesktopAPUtil.showWarning("No workflow project found", "No workflow project found at " + absolutePath);
            return null;
        }

        var origin = originAndRelativePath.getFirst();
        return new RestoredOpenProject( //
            origin, //
            projectJson.get(ACTIVE).asBoolean() //
        );
    }

    private static boolean hasOriginAndRelativePath(final JsonNode projectJson) {
        if (!projectJson.has(ORIGIN)) {
            return false;
        }
        return projectJson.get(ORIGIN).has(RELATIVE_PATH);
    }

    private static List<RecentlyUsedProject> deserializeMRUProjects(final JsonNode appStateJson,
        final LocalSpace localSpace) {
        var projectsJson = (ArrayNode)appStateJson.get(MRU_PROJECTS);
        if (projectsJson == null) {
            return List.of();
        }
        var recentlyUsedProjects = new ArrayList<RecentlyUsedProject>();
        for (var projectJson : projectsJson) {
            recentlyUsedProjects.add(deserializeMRUProject(projectJson, localSpace));
        }
        return recentlyUsedProjects;
    }

    private static RecentlyUsedProject deserializeMRUProject(final JsonNode projectJson, final LocalSpace localSpace) {
        var origin = deserializeOrigin(projectJson.get(ORIGIN), localSpace).getFirst();
        return new RecentlyUsedProject( //
            projectJson.get(NAME).asText(), //
            origin, //
            OffsetDateTime.parse(projectJson.get(TIME_USED).asText(), DateTimeFormatter.ISO_OFFSET_DATE_TIME) //
        );
    }

    private static Pair<Origin, Optional<String>> deserializeOrigin(final JsonNode originJson,
        final LocalSpace localSpace) {
        var providerId = originJson.get(PROVIDER_ID).asText();
        var spaceId = originJson.get(SPACE_ID).asText();

        var relativePath = Optional.ofNullable(originJson.get(RELATIVE_PATH)).map(JsonNode::asText);
        var itemId = getItemId(originJson, localSpace, relativePath.orElse(null));

        var projectTypeOptional = getProjectType(originJson, relativePath.isPresent(), localSpace, itemId);
        var origin = new Origin(providerId, spaceId, itemId, projectTypeOptional.orElse(null));

        return new Pair<>(origin, relativePath);
    }

    private static String getItemId(final JsonNode originJson, final LocalSpace localSpace, final String relativePath) {
        if (relativePath != null) { // Relative path only given for local projects
            var absolutePath = localSpace.getRootPath().resolve(Path.of(relativePath));
            return localSpace.getItemId(absolutePath);
        }

        return originJson.get(ITEM_ID).asText();
    }

    private static Optional<ProjectTypeEnum> getProjectType(final JsonNode originJson, final boolean isLocal,
        final LocalSpace localSpace, final String itemId) {
        var projectType = Optional.ofNullable(originJson.get(PROJECT_TYPE)) //
            .map(JsonNode::asText) //
            .map(ProjectTypeEnum::valueOf);

        // Project type might not be available in the rare case that the workflow at the
        // given absolute path doesn't exist anymore
        if (projectType.isEmpty() && isLocal) {
            return localSpace.getProjectType(itemId);
        }

        return projectType;
    }

}
