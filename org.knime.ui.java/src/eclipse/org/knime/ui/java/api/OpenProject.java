/*
 * ------------------------------------------------------------------------
 *
 *  Copyright by KNIME AG, Zurich, Switzerland
 *  Website: http://www.knime.org; Email: contact@knime.org
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
 */
package org.knime.ui.java.api;

import static org.knime.ui.java.util.PerspectiveUtil.SHARED_EDITOR_AREA_ID;

import java.io.IOException;
import java.net.URI;
import java.util.Optional;

import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.e4.ui.workbench.modeling.EModelService;
import org.eclipse.ui.PartInitException;
import org.eclipse.ui.PlatformUI;
import org.knime.core.node.ExecutionMonitor;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.workflow.NodeTimer;
import org.knime.core.node.workflow.NodeTimer.GlobalNodeStats.WorkflowType;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.core.node.workflow.contextv2.HubSpaceLocationInfo;
import org.knime.core.node.workflow.contextv2.WorkflowContextV2.LocationType;
import org.knime.gateway.api.webui.entity.SpaceItemReferenceEnt.ProjectTypeEnum;
import org.knime.gateway.api.webui.entity.SpaceProviderEnt;
import org.knime.gateway.impl.project.DefaultProject;
import org.knime.gateway.impl.project.Project;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.gateway.impl.project.WorkflowServiceProjects;
import org.knime.gateway.impl.webui.AppStateUpdater;
import org.knime.gateway.impl.webui.spaces.Space;
import org.knime.gateway.impl.webui.spaces.SpaceProviders;
import org.knime.gateway.impl.webui.spaces.local.LocalWorkspace;
import org.knime.ui.java.util.ClassicWorkflowEditorUtil;
import org.knime.ui.java.util.DesktopAPUtil;
import org.knime.ui.java.util.MostRecentlyUsedProjects;
import org.knime.ui.java.util.PerspectiveUtil;
import org.knime.ui.java.util.ProjectFactory;
import org.knime.workbench.core.imports.RepoObjectImport;
import org.knime.workbench.explorer.RemoteWorkflowInput;
import org.knime.workbench.explorer.filesystem.ExplorerFileSystem;
import org.knime.workbench.explorer.filesystem.RemoteExplorerFileStore;

/**
 * Opens a project.
 *
 * @author Benjamin Moser, KNIME GmbH, Konstanz, Germany
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 * @author Kai Franze, KNIME GmbH, Germany
 */
final class OpenProject {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(OpenProject.class);

    private OpenProject() {
        // utility
    }

    /**
     * Open a project from a mounted space
     *
     * @param spaceId The ID of the space the item is in
     * @param itemId The item ID of the workflow to open
     * @param spaceProviderId The ID of the space provider of the space
     * @throws IOException If something goes wrong opening the project
     */
    static void openProject(final String spaceId, final String itemId, final String spaceProviderId)
        throws IOException {
        // TODO: NXT-2549, Remove this part since hybrid mode is no longer supported.
        if (PerspectiveUtil.isClassicPerspectiveLoaded()) {
            final var spaceProviders = DesktopAPI.getDeps(SpaceProviders.class);
            final var space = SpaceProviders.getSpace(spaceProviders, spaceProviderId, spaceId);
            final var knimeUrl = space.toKnimeUrl(itemId);
            final var isServerProject =
                spaceProviders.getProviderTypes().get(spaceProviderId) == SpaceProviderEnt.TypeEnum.SERVER;
            openProjectInClassicAndWebUI(knimeUrl, null, isServerProject);
        } else {
            try {
                DesktopAPUtil.consumerWithProgress(DesktopAPUtil.LOADING_WORKFLOW_PROGRESS_MSG, LOGGER,
                    monitor -> openProjectInWebUIOnly(spaceProviderId, spaceId, itemId, monitor));
            } catch (Exception e) {
                throw new IOException(e);
            }
        }
    }

    /**
     * Fetch and open a local copy of a project sourced from the given import (e.g. by dropping an URI)
     *
     * @apiNote While opening a project from a mounted remote space may also open them as local copies, the behavior of
     *          these two cases is different w.r.t. interaction with the space explorer, opening and saving.
     * @param repoObjectImport The source of the project
     * @return Whether the project could be fetched and opened
     */
    static boolean openProjectCopy(final RepoObjectImport repoObjectImport) {
        final var locationInfo = repoObjectImport.locationInfo()//
            .filter(HubSpaceLocationInfo.class::isInstance)//
            .map(HubSpaceLocationInfo.class::cast)//
            .orElse(null);

        if (PerspectiveUtil.isClassicPerspectiveLoaded()) {
            final var isServerProject = repoObjectImport.locationInfo()//
                .map(info -> info.getType() == LocationType.SERVER_REPOSITORY)//
                .orElse(false);
            openProjectInClassicAndWebUI(repoObjectImport.getKnimeURI(), locationInfo, isServerProject);
        } else {
            final var wfm = fetchAndLoadProjectWithProgress(repoObjectImport);
            if (wfm == null) {
                return false;
            }
            final var origin = ProjectFactory.getOriginFromHubSpaceLocationInfo(locationInfo, wfm).orElse(null);
            final var project = DefaultProject.builder(wfm).setOrigin(origin).build();
            registerProjectAndSetActiveAndUpdateAppState(project, wfm, WorkflowType.REMOTE);
        }
        return true;
    }

    /**
     * Opens the project in both the Classic UI and the Modern/Web UI
     *
     * @param knimeUrl The knime:// URI identifying the source of the project to load
     * @param locationInfo Information about where on a KNIME Hub a workflow is stored
     * @param isServerProject Whether the project to open is a KNIME Server project or not
     * @return A boolean indicating whether the project has been opened successfully or not.
     */
    private static boolean openProjectInClassicAndWebUI(final URI knimeUrl, final HubSpaceLocationInfo locationInfo,
        final boolean isServerProject) {
        try {
            if (!DesktopAPUtil.openEditor(ExplorerFileSystem.INSTANCE.getStore(knimeUrl), locationInfo)) {
                return false; // Since 'openEditor' returned a failure state
            }

            hideSharedEditorArea();
            var activeProjectId = ClassicWorkflowEditorUtil
                .updateWorkflowProjectsFromOpenedWorkflowEditors(DesktopAPI.getDeps(LocalWorkspace.class));
            activeProjectId.flatMap(id -> DesktopAPI.getDeps(ProjectManager.class).getProject(id)) //
                .filter(p -> !isServerProject) // To not track KNIME Server projects as recently used
                .ifPresent(p -> DesktopAPI.getDeps(MostRecentlyUsedProjects.class).add(p));
            DesktopAPI.getDeps(AppStateUpdater.class).updateAppState();

            return true;
        } catch (PartInitException | IllegalArgumentException e) { // NOSONAR
            LOGGER.warn("Could not open editor", e);
            return false;
        }
    }

    /**
     * Fetch, load, and open the project in the Modern/Web UI. Those projects won't be available in the classic UI when
     * switching to it.
     *
     * @implNote Needs to be stand-alone (not wrapped in progress manager) to be testable.
     * @apiNote  Throws unchecked exception on failure.
     * @param spaceId
     * @param itemId
     * @param spaceProviderId
     * @param monitor
     */
    static void openProjectInWebUIOnly(final String spaceProviderId, final String spaceId, final String itemId,
        final IProgressMonitor monitor)  {
        final var spaceProviders = DesktopAPI.getDeps(SpaceProviders.class);
        final var space = SpaceProviders.getSpace(spaceProviders, spaceProviderId, spaceId);

        var projectType = space.getProjectType(itemId).orElseThrow(() -> new IllegalArgumentException(
            "The item for id " + itemId + " is neither a workflow- nor a component-project"));

        var projectAndWfm = getAndUpdateWorkflowServiceProject(space, spaceProviderId, spaceId, itemId, projectType);
        if (projectAndWfm == null) {
            projectAndWfm = loadProject(space, spaceProviderId, spaceId, itemId, projectType, monitor);
        }
        if (projectAndWfm == null) {
            throw new IllegalArgumentException("Project could not be loaded");
        }

        final var isServerProject =
            spaceProviders.getProviderTypes().get(spaceProviderId) == SpaceProviderEnt.TypeEnum.SERVER;
        if (!isServerProject) { // To not track KNIME Server projects as recently used
            DesktopAPI.getDeps(MostRecentlyUsedProjects.class).add(projectAndWfm.project);
        }
        registerProjectAndSetActiveAndUpdateAppState(projectAndWfm.project, projectAndWfm.wfm,
            space instanceof LocalWorkspace ? WorkflowType.LOCAL : WorkflowType.REMOTE);
    }

    private static void registerProjectAndSetActiveAndUpdateAppState(final Project project, final WorkflowManager wfm,
        final WorkflowType wfType) {
        var pm = DesktopAPI.getDeps(ProjectManager.class);
        pm.addProject(project);
        pm.setProjectActive(project.getID());
        // instrumentation
        NodeTimer.GLOBAL_TIMER.incWorkflowOpening(wfm, wfType);
        // update application state
        DesktopAPI.getDeps(AppStateUpdater.class).updateAppState();
    }

    /*
     *  Checks whether there is already a workflow project loaded which is used as a workflow service (i.e. a workflow
     *  executed by another workflow). If so, the respective project is updated to add the project-origin and mark it as
     *  being used by the UI, too.
     *
     *  @return the project and workflow-manager or null if none
     */
    private static ProjectAndWorkflowManager getAndUpdateWorkflowServiceProject(final Space space,
        final String spaceProviderId, final String spaceId, final String itemId, final ProjectTypeEnum projectType) {
        if (space instanceof LocalWorkspace localSpace) {
            var pm = DesktopAPI.getDeps(ProjectManager.class);
            var path = localSpace.toLocalAbsolutePath(new ExecutionMonitor(), itemId).orElse(null);
            var project = WorkflowServiceProjects.getProject(path).flatMap(pm::getProject).orElse(null);
            if (project != null) {
                var wfm = pm.getCachedProject(project.getID()).orElse(null);
                if (wfm != null) {
                    // update project to set origin and mark it to be used by the UI
                    var projectWithOrigin = ProjectFactory.createProject(wfm, spaceProviderId, spaceId, itemId, null,
                        projectType, project.getID());
                    pm.addProject(projectWithOrigin);
                    return new ProjectAndWorkflowManager(projectWithOrigin, wfm);
                }
            }
        }
        return null;
    }

    private static ProjectAndWorkflowManager loadProject(final Space space, final String spaceProviderId,
        final String spaceId, final String itemId, final ProjectTypeEnum projectType, final IProgressMonitor monitor) {
        var wfm = DesktopAPUtil.fetchAndLoadWorkflowWithTask(space, itemId, monitor);
        if (wfm == null) {
            return null;
        }
        String relativePath = null;
        if (space instanceof LocalWorkspace localWorkspace) {
            var wfPath = wfm.getContextV2().getExecutorInfo().getLocalWorkflowPath();
            relativePath = localWorkspace.getLocalRootPath().relativize(wfPath).toString();
        }

        var project = ProjectFactory.createProject(wfm, spaceProviderId, spaceId, itemId, relativePath, projectType);
        return new ProjectAndWorkflowManager(project, wfm);
    }

    private static record ProjectAndWorkflowManager(Project project, WorkflowManager wfm) {
        //
    }

    @SuppressWarnings("restriction")
    private static void hideSharedEditorArea() {
        // Set editor area to non-visible again (WorkbenchPage#openEditor sets it to active).
        // Even though the part has zero size in its container, the renderer will still show a few pixels,
        //   and on these pixels a drag listener is active, allowing to resize the part.
        // This workaround results in these pixels being shown while the workflow is loading, causing a slight
        //   shift back and forth of the Web UI view.
        var workbench = (org.eclipse.ui.internal.Workbench)PlatformUI.getWorkbench();
        var modelService = workbench.getService(EModelService.class);
        var app = workbench.getApplication();
        var areaPlaceholder =
            modelService.find(SHARED_EDITOR_AREA_ID, PerspectiveUtil.getWebUIPerspective(app, modelService));
        areaPlaceholder.setVisible(false);
    }

    private static WorkflowManager fetchAndLoadProjectWithProgress(final RepoObjectImport repoObjectImport) {
        var knimeUrl = repoObjectImport.getKnimeURI();
        var hubSpaceLocationInfo = (HubSpaceLocationInfo)repoObjectImport.locationInfo().orElseThrow();
        var fs = (RemoteExplorerFileStore)ExplorerFileSystem.INSTANCE.getStore(knimeUrl);
        return DesktopAPUtil.downloadWorkflowWithProgress(fs, hubSpaceLocationInfo) //
            .map(RemoteWorkflowInput::getWorkflowContext) //
            .flatMap(DesktopAPUtil::loadWorkflowWithProgress) //
            .orElse(null);
    }

}
