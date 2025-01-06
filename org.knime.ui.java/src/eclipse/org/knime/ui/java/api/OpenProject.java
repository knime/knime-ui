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

import java.io.IOException;
import java.util.NoSuchElementException;
import java.util.Optional;

import org.eclipse.core.runtime.IProgressMonitor;
import org.knime.core.node.ExecutionMonitor;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.workflow.NodeTimer;
import org.knime.core.node.workflow.NodeTimer.GlobalNodeStats.WorkflowType;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.core.node.workflow.contextv2.HubSpaceLocationInfo;
import org.knime.core.util.hub.NamedItemVersion;
import org.knime.gateway.api.webui.entity.SpaceItemReferenceEnt.ProjectTypeEnum;
import org.knime.gateway.api.webui.entity.SpaceProviderEnt;
import org.knime.gateway.impl.project.DefaultProject;
import org.knime.gateway.impl.project.Project;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.gateway.impl.project.WorkflowServiceProjects;
import org.knime.gateway.impl.webui.AppStateUpdater;
import org.knime.gateway.impl.webui.spaces.Space;
import org.knime.gateway.impl.webui.spaces.SpaceProviders;
import org.knime.gateway.impl.webui.spaces.local.LocalSpace;
import org.knime.ui.java.util.DesktopAPUtil;
import org.knime.ui.java.util.MostRecentlyUsedProjects;
import org.knime.workbench.core.imports.RepoObjectImport;
import org.knime.workbench.explorer.RemoteWorkflowInput;
import org.knime.workbench.explorer.filesystem.FreshFileStoreResolver;
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
        try {
            DesktopAPUtil.consumerWithProgress(DesktopAPUtil.LOADING_WORKFLOW_PROGRESS_MSG, LOGGER,
                monitor -> openProjectWithProgress(spaceProviderId, spaceId, itemId, monitor));
        } catch (Exception e) {  // NOSONAR
            LOGGER.error("Failed to open project", e);
            throw new IOException(e.getMessage(), e);
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
        return openProjectCopy(repoObjectImport, Optional.empty());
    }

    /**
     * Fetch and open a local copy of a project sourced from the given import (e.g. by dropping an URI)
     *
     * @apiNote While opening a project from a mounted remote space may also open them as local copies, the behavior of
     *          these two cases is different w.r.t. interaction with the space explorer, opening and saving.
     * @param repoObjectImport The source of the project
     * @param selectedVersion The version information of the given import, can be empty
     * @return Whether the project could be fetched and opened
     */
    static boolean openProjectCopy(final RepoObjectImport repoObjectImport,
        final Optional<NamedItemVersion> selectedVersion) { // NOSONAR: The version is optional
        final var wfm = fetchAndLoadProjectWithProgress(repoObjectImport);
        if (wfm == null) {
            return false;
        }

        final var locationInfo = repoObjectImport.locationInfo()//
            .filter(HubSpaceLocationInfo.class::isInstance)//
            .map(HubSpaceLocationInfo.class::cast)//
            .orElse(null);
        final var origin =
            Project.Origin.of(locationInfo, wfm, selectedVersion).orElse(null);
        final var project = DefaultProject.builder(wfm).setOrigin(origin).build();
        // Provider type can only be Hub here
        registerProjectAndSetActive(project, wfm, SpaceProviderEnt.TypeEnum.HUB);

        return true;
    }

    /**
     * Fetch, load, and open the project in the Modern/Web UI. Those projects won't be available in the classic UI when
     * switching to it.
     *
     * @implNote Needs to be stand-alone (not wrapped in progress manager) to be testable.
     * @param spaceId
     * @param itemId
     * @param spaceProviderId
     * @param monitor
     * @throws OpenProjectException Specific exception thrown when a project failed to open
     */
    static void openProjectWithProgress(final String spaceProviderId, final String spaceId, final String itemId,
        final IProgressMonitor monitor) throws OpenProjectException {
        final var spaceProviders = DesktopAPI.getDeps(SpaceProviders.class);

        final Space space;
        try {
            space = SpaceProviders.getSpace(spaceProviders, spaceProviderId, spaceId);
        } catch (NoSuchElementException e) {
            throw new OpenProjectException("The space could not be accessed.", e);
        }

        final ProjectTypeEnum projectType;
        try {
            projectType = space.getProjectType(itemId).orElseThrow(
                () -> new OpenProjectException("The item is not a valid project.", new IllegalArgumentException(
                    "The item for id " + itemId + " is neither a workflow- nor a component-project")));
        } catch (NoSuchElementException e) {
            throw new OpenProjectException("The project could not be found.", e);
        }

        var projectAndWfm = getAndUpdateWorkflowServiceProject(space, spaceProviderId, spaceId, itemId, projectType);
        if (projectAndWfm == null) {
            projectAndWfm = loadProject(space, spaceProviderId, spaceId, itemId, projectType, monitor);
        }
        if (projectAndWfm == null) {
            throw new OpenProjectException("The project could not be loaded.");
        }

        final var providerType = spaceProviders.getProviderTypes().get(spaceProviderId);
        registerProjectAndSetActive(projectAndWfm.project, projectAndWfm.wfm, providerType);
    }

    @SuppressWarnings("serial")
    static final class OpenProjectException extends Exception {

        private OpenProjectException(final String message, final Throwable cause) {
            super(message, cause);

        }

        private OpenProjectException(final String message) {
            super(message);
        }
    }

    /**
     * Registers the project with the {@link ProjectManager}, sets it as active, adds it to the most recently used and
     * updates the app state.
     */
    static void registerProjectAndSetActive(final Project project, final WorkflowManager wfm,
        final SpaceProviderEnt.TypeEnum providerType) {
        var pm = DesktopAPI.getDeps(ProjectManager.class);
        pm.addProject(project);
        pm.setProjectActive(project.getID());

        if (providerType != SpaceProviderEnt.TypeEnum.SERVER) {
            DesktopAPI.getDeps(MostRecentlyUsedProjects.class).add(project);
        }

        DesktopAPI.getDeps(AppStateUpdater.class).updateAppState();

        // Instrumentation
        var wfType = providerType == SpaceProviderEnt.TypeEnum.LOCAL ? WorkflowType.LOCAL : WorkflowType.REMOTE;
        NodeTimer.GLOBAL_TIMER.incWorkflowOpening(wfm, wfType);
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
        if (space instanceof LocalSpace localSpace) {
            var pm = DesktopAPI.getDeps(ProjectManager.class);
            var path = localSpace.toLocalAbsolutePath(new ExecutionMonitor(), itemId).orElse(null);
            var project = WorkflowServiceProjects.getProject(path).flatMap(pm::getProject).orElse(null);
            if (project != null) {
                var wfm = pm.getCachedProject(project.getID()).orElse(null);
                if (wfm != null) {
                    // update project to set origin and mark it to be used by the UI
                    var projectWithOrigin =
                        Project.of(wfm, spaceProviderId, spaceId, itemId, projectType, project.getID());
                    pm.addProject(projectWithOrigin);
                    return new ProjectAndWorkflowManager(projectWithOrigin, wfm);
                }
            }
        }
        return null;
    }

    private static ProjectAndWorkflowManager loadProject(final Space space, final String spaceProviderId,
        final String spaceId, final String itemId, final ProjectTypeEnum projectType, final IProgressMonitor monitor) {
        // see caller -- pretty sure this can be simplified/flattened
        var wfm = DesktopAPUtil.fetchAndLoadWorkflowWithTask(space, itemId, monitor);
        if (wfm == null) {
            return null;
        }
        var project = Project.of(wfm, spaceProviderId, spaceId, itemId, projectType);
        return new ProjectAndWorkflowManager(project, wfm);
    }

    private static record ProjectAndWorkflowManager(Project project, WorkflowManager wfm) {
        //
    }

    private static WorkflowManager fetchAndLoadProjectWithProgress(final RepoObjectImport repoObjectImport) {
        var fileStore = (RemoteExplorerFileStore)FreshFileStoreResolver.resolveAndRefreshWithProgress( //
            repoObjectImport.getKnimeURI() //
        );
        var locationInfo = (HubSpaceLocationInfo)repoObjectImport.locationInfo().orElseThrow();
        return DesktopAPUtil
            .downloadWorkflowWithProgress(fileStore, locationInfo) //
            .map(RemoteWorkflowInput::getWorkflowContext) //
            .flatMap(DesktopAPUtil::loadWorkflowWithProgress) //
            .orElse(null);
    }
}
