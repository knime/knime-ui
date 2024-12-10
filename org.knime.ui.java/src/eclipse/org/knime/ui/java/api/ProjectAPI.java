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
 *   Jan 30, 2023 (hornm): created
 */
package org.knime.ui.java.api;

import static org.knime.ui.java.api.DesktopAPI.MAPPER;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collector;

import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.swt.widgets.Display;
import org.eclipse.ui.PlatformUI;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.NotConfigurableException;
import org.knime.core.node.workflow.NodeTimer;
import org.knime.core.node.workflow.NodeTimer.GlobalNodeStats.WorkflowType;
import org.knime.core.node.workflow.WorkflowPersistor;
import org.knime.core.ui.wrapper.WorkflowManagerWrapper;
import org.knime.gateway.api.webui.entity.SpaceItemReferenceEnt.ProjectTypeEnum;
import org.knime.gateway.impl.project.Project.Origin;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.gateway.impl.webui.AppStateUpdater;
import org.knime.gateway.impl.webui.entity.AppStateEntityFactory;
import org.knime.gateway.impl.webui.spaces.SpaceProvider;
import org.knime.gateway.impl.webui.spaces.SpaceProviders;
import org.knime.gateway.impl.webui.spaces.local.LocalWorkspace;
import org.knime.ui.java.util.ExampleProjects;
import org.knime.ui.java.util.LocalSpaceUtil;
import org.knime.ui.java.util.MostRecentlyUsedProjects;
import org.knime.workbench.ui.wrapper.WrappedNodeDialog;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;

/**
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
@SuppressWarnings("restriction")
final class ProjectAPI {

    private ProjectAPI() {
        // stateless
    }

    /**
     * Opens the workflow or component project either in both, the Classic UI and the Modern/Web UI if the classic UI is
     * active (the WorkflowEditor is used in that case to open the workflow). Or it opens and loads the project
     * exclusively in the Modern UI. Those projects won't be available in the classic UI when switching to it.
     *
     * @param spaceId
     * @param itemId
     * @param spaceProviderId {@code local} if absent
     * @throws IOException If something goes wrong opening the project
     */
    @API
    static void openProject(final String spaceId, final String itemId, final String spaceProviderId)
        throws IOException {
        OpenProject.openProject(spaceId, itemId, spaceProviderId);
    }

    /**
     * Close the Eclipse editor(s) associated with the given project ID.
     *
     * @param projectIdToClose The ID of the project to be closed
     * @param nextProjectId The ID of the project to make active after the current one has been closed. Can be null or
     *            omitted if there is no next project ID (e.g. when closing the last tab).
     * @return A boolean indicating whether an editor has been closed.
     */
    @API
    static boolean closeProject(final String projectIdToClose, final String nextProjectId) {
        return CloseProject.closeProject(projectIdToClose, nextProjectId);
    }

    /**
     * Closes (i.e. removes from memory) all the workflow or component projects for the given projects ids without
     * saving any pending changes.
     *
     * @return whether all the workflows have been successfully been closed
     */
    @API
    static boolean forceCloseProjects(final Object[] projectIdsToClose) {
        return CloseProject.forceCloseProjects(Arrays.stream(projectIdsToClose).map(String.class::cast).toList());
    }

    /**
     * Save the project workflow manager identified by a given project ID.
     */
    @API
    static void saveProject(final String projectId, final String projectSVG) {
        SaveProject.saveProject(projectId, projectSVG, false);
    }

    /**
     * @param projectIdsAndSvgs array containing the project-ids and svgs of the projects to save. The very first
     *            entry contains the number of projects to save, e.g., n. Followed by n projects-ids (strings), followed
     *            by n svg-strings
     */
    @API
    static void saveAndCloseProjects(final Object[] projectIdsAndSvgs) {
        var progressService = PlatformUI.getWorkbench().getProgressService();
        SaveAndCloseProjects.saveAndCloseProjects(projectIdsAndSvgs, progressService);
    }

    /**
     * Sets that project for the given id to active and ensures that the workflow is already loaded (in memory). And
     * loads it if not.
     *
     * @param projectId
     */
    @API
    static void setProjectActiveAndEnsureItsLoaded(final String projectId) {
        var pm = ProjectManager.getInstance();
        var wfm = pm.getCachedProject(projectId).orElse(null);
        if (wfm == null) {
            // workflow hasn't been loaded, yet -> open it
            wfm = pm.openAndCacheProject(projectId).orElse(null);
            if (wfm != null) {
                NodeTimer.GLOBAL_TIMER.incWorkflowOpening(wfm, WorkflowType.LOCAL);
            }
        }
        if (wfm != null) {
            pm.setProjectActive(projectId);
        } else {
            pm.removeProject(projectId, w -> {});
            NodeLogger.getLogger(ProjectAPI.class)
                .error("Workflow with ID '" + projectId + "' couldn't be loaded. Workflow closed.");
            DesktopAPI.getDeps(AppStateUpdater.class).updateAppState();
        }
    }

    /**
     * @see SaveProjectCopy#saveCopyOf(String, String)
     *
     * @param projectId The project ID of the open remote workflow
     * @throws IOException if moving the workflow fails
     */
    @API
    static void saveProjectAs(final String projectId, final String workflowSvg) {
        SaveProjectCopy.saveCopyOf(projectId, workflowSvg);
    }

    /**
     * Executes or schedules a job on a Server.
     *
     * @param spaceProviderId
     * @param spaceId
     * @param itemId
     */
    @API
    static void executeOnClassic(final String spaceProviderId, final String spaceId, final String itemId) {
        final var space = SpaceProviders.getSpace(DesktopAPI.getDeps(SpaceProviders.class), spaceProviderId, spaceId);
        space.openRemoteExecution(itemId);
    }

    /**
     * Opens the workflow configuration dialog for the given open workflow.
     * <p>
     * See org.knime.workbench.explorer.view.actions.GlobalConfigureWorkflowAction
     *
     * @param projectId the project ID of the open workflow
     */
    @API
    static void openWorkflowConfiguration(final String projectId) {
        final var projectWfm = DesktopAPI.getDeps(ProjectManager.class).openAndCacheProject(projectId).orElseThrow();
        try {
            var dialog = new WrappedNodeDialog(Display.getDefault().getActiveShell(),
                WorkflowManagerWrapper.wrap(projectWfm), null, null);
            dialog.setBlockOnOpen(true);
            dialog.open();
        } catch (final NotConfigurableException exception) {
            MessageDialog.openError( //
                Display.getDefault().getActiveShell(), //
                "Workflow not configurable", //
                "This workflow cannot be configured: " + exception.getMessage());
        }
    }

    /**
     * Updates the list of most recently used projects (i.e. removes non-existing ones, at least for the local space)
     * and returns the updated list.
     *
     * @return json-serialized list of the recently used projects with the most recently used one at the bottom
     */
    @API
    static String updateAndGetMostRecentlyUsedProjects() {
        var mruProjects = DesktopAPI.getDeps(MostRecentlyUsedProjects.class);
        var localSpace = DesktopAPI.getDeps(LocalWorkspace.class);
        mruProjects.removeIf(p -> wasRemovedFromLocalSpace(p.origin(), localSpace));
        return reverseList(mruProjects.get()).stream() //
            .map(p -> MAPPER.createObjectNode() //
                .put("name", p.name()) //
                .put("timeUsed", p.timeUsed().format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)) //
                .set("origin", MAPPER.createObjectNode() //
                    .put("providerId", p.origin().getProviderId()) //
                    .put("spaceId", p.origin().getSpaceId()) //
                    .put("itemId", p.origin().getItemId()) //
                    .put("projectType", p.origin().getProjectType().orElse(ProjectTypeEnum.WORKFLOW).toString()))) //
            .collect(arrayNodeCollector()).toPrettyString();
    }

    private static <T> List<T> reverseList(final List<T> list) {
        var res = new ArrayList<T>(list);
        Collections.reverse(res);
        return res;
    }

    private static boolean wasRemovedFromLocalSpace(final Origin origin, final LocalWorkspace localSpace) {
        if (LocalSpaceUtil.isLocalSpace(origin.getProviderId(), origin.getSpaceId())) {
            return localSpace.toLocalAbsolutePath(null, origin.getItemId()).isEmpty();
        } else {
            return false;
        }
    }

    /**
     * Removes the project with the given origin from the list of most recently used projects.
     *
     * @param spacePoviderId
     * @param spaceId
     * @param itemId
     */
    @API
    static void removeMostRecentlyUsedProject(final String spacePoviderId, final String spaceId, final String itemId) {
        DesktopAPI.getDeps(MostRecentlyUsedProjects.class).removeIf(p -> {
            var origin = p.origin();
            return origin.getItemId().equals(itemId) && origin.getSpaceId().equals(spaceId)
                && origin.getProviderId().equals(spacePoviderId);
        });
    }

    /**
     * Updates infos of the reference most recently used project, such as name or relative path (in case a local project
     * has been moved). No-op for space items that are not already part of the MRU list.
     */
    @API
    static void updateMostRecentlyUsedProject(final String providerId, final String spaceId, final String itemId,
        final String newName) {
        DesktopAPI.getDeps(MostRecentlyUsedProjects.class).updateOriginAndName(providerId, spaceId, itemId, newName,
            DesktopAPI.getDeps(LocalWorkspace.class));
    }

    /**
     * @return example project as json-formatted string
     */
    @API
    static String getExampleProjects() {
        var localWorkspace = DesktopAPI.getDeps(LocalWorkspace.class);
        var exampleProjects = DesktopAPI.getDeps(ExampleProjects.class);
        return exampleProjects.getRelativeExampleProjectPaths().stream() //
            .map(s -> localWorkspace.getLocalRootPath().resolve(Path.of(s))) //
            .filter(Files::exists) //
            .map(f -> createExampleProjectJson(f, localWorkspace)) //
            .filter(Objects::nonNull) //
            .collect(arrayNodeCollector()).toPrettyString();
    }

    private static JsonNode createExampleProjectJson(final Path workflowDir, final LocalWorkspace localWorkspace) {
        var svgFile = workflowDir.resolve(WorkflowPersistor.SVG_WORKFLOW_FILE);
        byte[] svg;
        try {
            svg = Files.readAllBytes(svgFile);
        } catch (IOException ex) {
            NodeLogger.getLogger(AppStateEntityFactory.class)
                .error("Svg for workflow '" + workflowDir + "' could not be read", ex);
            return null;
        }
        var name = workflowDir.getFileName().toString();
        var svgEncoded = Base64.getEncoder().encodeToString(svg);
        var itemId = localWorkspace.getItemId(workflowDir);
        return createExampleProjectJson(name, svgEncoded, itemId);
    }

    private static JsonNode createExampleProjectJson(final String name, final String svg, final String itemId) {
        return MAPPER.createObjectNode() //
            .put("name", name) //
            .put("svg", svg) //
            .set("origin", MAPPER.createObjectNode() //
                .put("itemId", itemId) //
                .put("spaceId", LocalWorkspace.LOCAL_SPACE_ID) //
                .put("providerId", SpaceProvider.LOCAL_SPACE_PROVIDER_ID) //
            );
    }

    private static Collector<Object, ArrayNode, ArrayNode> arrayNodeCollector() {
        return Collector.of(MAPPER::createArrayNode, ArrayNode::addPOJO, (n1, n2) -> {
            throw new UnsupportedOperationException();
        });
    }

}
