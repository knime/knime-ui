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
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.stream.Collector;

import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.swt.widgets.Display;
import org.knime.core.node.CanceledExecutionException;
import org.knime.core.node.Node;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.NodeModel;
import org.knime.core.node.NotConfigurableException;
import org.knime.core.node.workflow.NodeTimer;
import org.knime.core.node.workflow.NodeTimer.GlobalNodeStats.WorkflowType;
import org.knime.core.node.workflow.WorkflowManager.NodeModelFilter;
import org.knime.core.node.workflow.WorkflowPersistor;
import org.knime.core.ui.wrapper.WorkflowManagerWrapper;
import org.knime.gateway.api.util.VersionId;
import org.knime.gateway.api.webui.entity.SpaceItemReferenceEnt.ProjectTypeEnum;
import org.knime.gateway.api.webui.entity.SpaceProviderEnt;
import org.knime.gateway.impl.project.Origin;
import org.knime.gateway.impl.project.Project;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.gateway.impl.webui.AppStateUpdater;
import org.knime.gateway.impl.webui.entity.AppStateEntityFactory;
import org.knime.gateway.impl.webui.spaces.SpaceProvider;
import org.knime.gateway.impl.webui.spaces.local.LocalSpace;
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
     * @see #openProject(String, String, String) (String, String, String)
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
     */
    @API
    static void forceCloseProjects(final Object[] projectIdsToClose) {
        CloseProject.closeProjectsAndUpdateAppState(Arrays.stream(projectIdsToClose).map(String.class::cast).toList());
    }

    /**
     * Save the project workflow manager identified by a given project ID.
     *
     * @param projectId ID of the project
     * @return A boolean indicating whether the project was saved.
     */
    @API
    static boolean saveProject(final String projectId, final Boolean allowOverwritePrompt) {
        var allowPrompt = allowOverwritePrompt == null ? Boolean.TRUE : allowOverwritePrompt;
        return SaveProject.saveProject(projectId, false, allowPrompt);
    }

    /**
     * Sets that project for the given id to active and ensures that the workflow is already loaded (in memory). And
     * loads it if not.
     *
     * @param projectId The project ID
     * @param versionId The version ID, can be {@code null} meaning current state.
     * @param removeProjectIfNotLoaded If {@code true}, the project will be removed from the {@link ProjectManager} if
     *            it could not be loaded. This is helpful in case of version switches: we might try to re-load the
     *            previously loaded version before we removing the project entirely.
     * @return Whether the project is or has been loaded successfully
     */
    @API
    static boolean setProjectActiveAndEnsureItsLoaded(final String projectId, final String versionId,
        final boolean removeProjectIfNotLoaded) {
        var projectManager = DesktopAPI.getDeps(ProjectManager.class);
        var appStateUpdater = DesktopAPI.getDeps(AppStateUpdater.class);

        var project = projectManager.getProject(projectId).orElseThrow();
        var version = VersionId.parse(versionId);
        closeAllOpenViewsIfSwitchingVersions(project, version);

        // Project already loaded
        if (project.getWorkflowManagerIfLoaded(version).isPresent()) {
            projectManager.setProjectActive(projectId, version);
            appStateUpdater.updateAppState();
            return true;
        }

        // Project not yet loaded, load
        var wfm = project.getFromCacheOrLoadWorkflowManager(version).orElse(null);
        if (wfm == null) {
            // TODO NXT-3867: solution will be superseded by workflow load error handling
            if (removeProjectIfNotLoaded) {
                // Cleanup if project cannot be loaded
                projectManager.removeProject(projectId);
                appStateUpdater.updateAppState();
            }
            NodeLogger.getLogger(ProjectAPI.class)
                .error("Workflow with ID '" + projectId + "' couldn't be loaded. Workflow closed.");
            return false;
        }

        // Project has just been loaded
        trackWorkflowOpeningIfCurrentState(project, version);
        projectManager.setProjectActive(projectId, version);
        appStateUpdater.updateAppState();
        return true;
    }

    /**
     * We understand "loading of current-state wfm" as an indication of a fresh open of a project. This could in
     * principle also be triggered by switching between versions, but currently the current-state version is always and
     * only loaded on project open and then cached indefinitely.
     *
     * TODO NXT-3636 de-duplicate project activation, loading, tracking (NOSONAR)
     * TODO NXT-3762 make tracking calls unit-testable (NOSONAR)
     */
    private static void trackWorkflowOpeningIfCurrentState(final Project project, final VersionId versionId) {
        if (versionId.isCurrentState() && project.getOrigin().isPresent()) {
            var origin = project.getOrigin().orElseThrow(); // Should never throw, we just checked
            var provider = DesktopAPI.getSpaceProvider(origin.providerId());
            var wfm = project.getWorkflowManagerIfLoaded().orElseThrow(); // Should never throw, we just checked
            NodeTimer.GLOBAL_TIMER.incWorkflowOpening(wfm, getWorkflowTypeToTrack(provider.getType()));
        }
    }

    private static void closeAllOpenViewsIfSwitchingVersions(final Project project, final VersionId versionId) {
        var pm = DesktopAPI.getDeps(ProjectManager.class);
        var projectId = project.getID();
        var switchingVersions = pm.isActiveProject(projectId) && !pm.isActiveProjectVersion(projectId, versionId);
        if (switchingVersions) {
            pm.getActiveVersionForProject(projectId) //
                .flatMap(project::getWorkflowManagerIfLoaded) // Should be loaded, since the version is active
                .ifPresent(wfm -> {
                    var nodeIdsAndModels = wfm.findNodes(NodeModel.class, new NodeModelFilter<>(), true, true);
                    nodeIdsAndModels.values().forEach(Node::invokeNodeModelCloseViews);
                });
        }
    }



    static WorkflowType getWorkflowTypeToTrack(final SpaceProviderEnt.TypeEnum providerType) {
        return switch (providerType) {
            case HUB, SERVER -> WorkflowType.REMOTE;
            case LOCAL -> WorkflowType.LOCAL;
            // keep default branch in case other provider types are added in the future
            default -> throw new IllegalArgumentException("Unknown provider type: " + providerType);
        };
    }


    /**
     * @see SaveProjectCopy#saveCopyOf(String, String)
     *
     * @param projectId The project ID of the open remote workflow
     * @throws IOException if moving the workflow fails
     */
    @API
    static void saveProjectAs(final String projectId) {
        SaveProjectCopy.saveCopyOf(projectId);
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
        final var space = DesktopAPI.getSpace(spaceProviderId, spaceId);
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
        final var projectWfm = DesktopAPI.getDeps(ProjectManager.class) //
            .getProject(projectId) //
            .flatMap(Project::getWorkflowManagerIfLoaded) //
            .orElseThrow(() -> new NoSuchElementException("WorkflowManager of project is not loaded"));
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
     * Updates the list of most recently used projects and returns the updated list.
     * <p>
     * The list needs to be explicitly updated here because projects in the Local space may have been removed by other
     * means than via AP (e.g. through OS file explorer).
     *
     * @return json-serialized list of the recently used projects with the most recently used one at the bottom
     */
    @API
    static String updateAndGetMostRecentlyUsedProjects() {
        var mruProjects = DesktopAPI.getDeps(MostRecentlyUsedProjects.class);
        var localSpace = DesktopAPI.getDeps(LocalSpace.class);
        mruProjects.removeIf(p -> wasRemovedFromLocalSpace(p.origin(), localSpace));
        return reverseList(mruProjects.get()).stream() //
            .map(p -> MAPPER.createObjectNode() //
                .put("name", p.name()) //
                .put("timeUsed", p.timeUsed().format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)) //
                .set("origin", MAPPER.createObjectNode() //
                    .put("providerId", p.origin().providerId()) //
                    .put("spaceId", p.origin().spaceId()) //
                    .put("itemId", p.origin().itemId()) //
                    .put("projectType", p.origin().projectType().orElse(ProjectTypeEnum.WORKFLOW).toString()) //
                    .set("ancestorItemIds", createAncestorItemIds(p.origin(), localSpace)) //
                )) //
            .collect(arrayNodeCollector()) //
            .toPrettyString();
    }

    private static boolean wasRemovedFromLocalSpace(final Origin origin, final LocalSpace localSpace) {
        if (LocalSpaceUtil.isLocalSpace(origin.providerId(), origin.spaceId())) {
            try {
                return localSpace.toLocalAbsolutePath(null, origin.itemId()).isEmpty();
            } catch (CanceledExecutionException ex) { // NOSONAR: We don't care about this exception
                return true;
            }
        } else {
            return false;
        }
    }

    /**
     * @return Ancestor item IDs of the given origin if it is local, otherwise {@code null}.
     */
    private static JsonNode createAncestorItemIds(final Origin origin, final LocalSpace localSpace) {
        if (origin.isLocal()) {
            var res = MAPPER.createArrayNode();
            localSpace.getAncestorItemIds(origin.itemId()).forEach(res::add);
            return res;
        } else {
            return null;
        }
    }

    private static <T> List<T> reverseList(final List<T> list) {
        var res = new ArrayList<>(list);
        Collections.reverse(res);
        return res;
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
            var left = p.origin();
            var right = new Origin(spacePoviderId, spaceId, itemId);
            return left.equals(right);
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
            DesktopAPI.getDeps(LocalSpace.class));
    }

    /**
     * @return example project as json-formatted string
     */
    @API
    static String getExampleProjects() {
        var localSpace = DesktopAPI.getDeps(LocalSpace.class);
        var exampleProjects = DesktopAPI.getDeps(ExampleProjects.class);
        return exampleProjects.getRelativeExampleProjectPaths().stream() //
            .map(s -> localSpace.getRootPath().resolve(Path.of(s))) //
            .filter(Files::exists) //
            .map(f -> createExampleProjectJson(f, localSpace)) //
            .filter(Objects::nonNull) //
            .collect(arrayNodeCollector()).toPrettyString();
    }

    private static JsonNode createExampleProjectJson(final Path workflowDir, final LocalSpace localSpace) {
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
        var itemId = localSpace.getItemId(workflowDir);
        return createExampleProjectJson(name, svgEncoded, itemId);
    }

    private static JsonNode createExampleProjectJson(final String name, final String svg, final String itemId) {
        return MAPPER.createObjectNode() //
            .put("name", name) //
            .put("svg", svg) //
            .set("origin", MAPPER.createObjectNode() //
                .put("itemId", itemId) //
                .put("spaceId", LocalSpace.LOCAL_SPACE_ID) //
                .put("providerId", SpaceProvider.LOCAL_SPACE_PROVIDER_ID) //
            );
    }

    private static Collector<Object, ArrayNode, ArrayNode> arrayNodeCollector() {
        return Collector.of(MAPPER::createArrayNode, ArrayNode::addPOJO, (n1, n2) -> {
            throw new UnsupportedOperationException();
        });
    }

    /**
     * Update the order of open projects
     *
     * @param projectIdsInNewOrder The new order of the project IDs
     */
    @API
    static void updateOpenProjectsOrder(final Object[] projectIdsInNewOrder) {
        var projectIds = Arrays.stream(projectIdsInNewOrder) //
            .map(String.class::cast) //
            .toList();
        DesktopAPI.getDeps(ProjectManager.class).updateOpenProjectsOrder(projectIds);
        DesktopAPI.getDeps(AppStateUpdater.class).updateAppState();
    }

}
