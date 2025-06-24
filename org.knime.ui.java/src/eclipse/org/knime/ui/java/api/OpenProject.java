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

import static org.knime.gateway.api.entity.EntityBuilderManager.builder;

import java.io.IOException;
import java.net.URI;
import java.util.NoSuchElementException;
import java.util.Optional;

import org.knime.core.node.workflow.NodeTimer;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.core.node.workflow.contextv2.AnalyticsPlatformExecutorInfo;
import org.knime.core.node.workflow.contextv2.HubSpaceLocationInfo;
import org.knime.core.util.Pair;
import org.knime.core.util.hub.NamedItemVersion;
import org.knime.gateway.api.util.VersionId;
import org.knime.gateway.api.webui.entity.SpaceItemReferenceEnt.ProjectTypeEnum;
import org.knime.gateway.api.webui.entity.SpaceItemVersionEnt;
import org.knime.gateway.api.webui.entity.SpaceProviderEnt;
import org.knime.gateway.impl.project.Origin;
import org.knime.gateway.impl.project.Project;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.gateway.impl.webui.AppStateUpdater;
import org.knime.gateway.impl.webui.spaces.Space;
import org.knime.ui.java.util.CreateProject;
import org.knime.ui.java.util.DesktopAPUtil;
import org.knime.ui.java.util.MostRecentlyUsedProjects;
import org.knime.ui.java.util.ProgressReporter;
import org.knime.workbench.core.imports.RepoObjectImport;
import org.knime.workbench.explorer.ExplorerMountTable;
import org.knime.workbench.explorer.RemoteWorkflowInput;
import org.knime.workbench.explorer.filesystem.RemoteExplorerFileStore;

/**
 * Opens a project.
 *
 * @author Benjamin Moser, KNIME GmbH, Konstanz, Germany
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 * @author Kai Franze, KNIME GmbH, Germany
 */
@SuppressWarnings("java:S1602") // braces on one-expression lambda
final class OpenProject {

    private OpenProject() {
        // utility
    }

    /**
     * Fetch, load, and open the project in the Modern/Web UI. Those projects won't be available in the classic UI when
     * switching to it.
     *
     * @implNote Needs to be stand-alone (not wrapped in progress manager) to be testable.
     * @param spaceId The ID of the space the item is located in
     * @param itemId The ID of the item to open
     * @param spaceProviderId The ID of the space provider
     * @throws OpenProjectException Specific exception thrown when a project failed to open
     */
    static void openProject(final String spaceId, final String itemId, final String spaceProviderId)
        throws IOException {
        var spaceProviders = DesktopAPI.getSpaceProviders();

        final Space space;
        try {
            space = spaceProviders.getSpace(spaceProviderId, spaceId);
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

        var projectManager = DesktopAPI.getDeps(ProjectManager.class);
        var project = projectManager //
            .getAndUpdateWorkflowServiceProject(space, spaceProviderId, spaceId, itemId, projectType) //
            .orElseGet(() -> {
                final var origin = new Origin(spaceProviderId, spaceId, itemId, projectType);
                return CreateProject.createProjectFromOrigin( //
                    origin, //
                    DesktopAPI.getDeps(ProgressReporter.class), //
                    DesktopAPI.getSpaceProviders() //
                );
            });
        // already trigger loading of wfm here because we want to abort and not register the project if this fails
        var loadedWfm = project.getFromCacheOrLoadWorkflowManager(VersionId.currentState());
        if (loadedWfm.isEmpty()) {
            throw new OpenProjectException("Could not load workflow");
        } else {
            final var providerType = spaceProviders.getProviderTypes().get(spaceProviderId);
            registerProjectAndSetActive(project, providerType);
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
        return openProjectCopy(repoObjectImport, null);
    }

    /**
     * Fetch and open a local copy of a project sourced from the given import (e.g. by dropping an URI)
     *
     * @apiNote While opening a project from a mounted remote space may also open them as local copies, the behavior of
     *          these two cases is different w.r.t. interaction with the space explorer, opening and saving.
     * @param repoObjectImport The source of the project
     * @param selectedVersion The version information of the given import, can be {@code null}
     * @return Whether the project could be fetched and opened
     */
    static boolean openProjectCopy(final RepoObjectImport repoObjectImport, final NamedItemVersion selectedVersion) {
        final var locationInfo = repoObjectImport.locationInfo()//
            .filter(HubSpaceLocationInfo.class::isInstance)//
            .map(HubSpaceLocationInfo.class::cast)//
            .orElseThrow();

        final Optional<SpaceItemVersionEnt> itemVersion = selectedVersion == null ? //
            Optional.empty() : //
            Optional.of(buildVersionInfo(selectedVersion));
        var origin = new Origin( //
            repoObjectImport.getKnimeURI().getHost(), //
            locationInfo.getSpaceItemId(), //
            locationInfo.getWorkflowItemId(), //
            Optional.of(mapType(repoObjectImport.getType())), //
            null, // TODO not relevant for d&d usecase right now but should be unified
            itemVersion // TODO remove this field
        );

        try {
            ProviderUtil.connectProvider(origin.providerId());
        } catch (NoSuchElementException e) {
            // okay -- provider not known
        }
        final Project project;
        if (ProviderUtil.isUnknownProject(origin.providerId(), origin.spaceId())) {
            // We do not have access to the space containing this project and are also not able to fetch
            // the version list or version metadata for it. Best we can do is fetch and load the wfm
            // of the requested version, but not offer any versioning features (breadcrumb, panel, ...)
            // TODO hasn't this shown a blue bar in the editor at some point?
            final var wfm = loadWorkflowWithProgress(repoObjectImport);
            if (wfm == null) {
                return false;
            }
            project = Project.builder().setWfm(wfm).setOrigin(origin).build();
        } else {
            // If we do have full access to the Space, we want to offer versioning features. 
            // This is facilitated though 
            // (a) providing a properly configured loader that is able to fetch other versions, too; and
            // (b) several workarounds frontend-side to still consider Origin#itemVersion in order to
            //     have the UI select the dropped version after import (TODO NXT-3701 NOSONAR)
            project = CreateProject.createProjectFromOrigin( //
                origin, //
                DesktopAPI.getDeps(ProgressReporter.class), //
                DesktopAPI.getSpaceProviders() //
            );
        }
        // Provider type can only be Hub here
        registerProjectAndSetActive(project, SpaceProviderEnt.TypeEnum.HUB);

        return true;
    }

    private static ProjectTypeEnum mapType(RepoObjectImport.RepoObjectType type) {
        return switch (type) {
            case Workflow -> ProjectTypeEnum.WORKFLOW;
            case WorkflowTemplate -> ProjectTypeEnum.COMPONENT;
            default -> throw new IllegalArgumentException("Unsupported type: " + type);
        };
    }

    /**
     * Creates an {@link Origin} from a Hub Space and a WorkflowManager
     *
     * @param hubLocation location information of the item
     * @param wfm the WorkflowManager that contains the project
     * @param selectedVersion the version information of the item, can be empty
     * @return The newly created Origin, or empty if hubLocation or workflow manager are missing
     */
    @SuppressWarnings({"java:S1188"})
    private static Optional<Origin> findOrigin(final HubSpaceLocationInfo hubLocation, final WorkflowManager wfm,
        final NamedItemVersion selectedVersion) {
        if (hubLocation == null || wfm == null) {
            return Optional.empty();
        }

        final var context = wfm.getContextV2();
        final var apExecInfo = (AnalyticsPlatformExecutorInfo)context.getExecutorInfo();

        final var providerId = apExecInfo.getMountpoint().map(Pair::getFirst).map(URI::getAuthority).orElse(null);
        final var spaceId = hubLocation.getSpaceItemId();
        final var itemId = hubLocation.getWorkflowItemId();
        final var projectType = wfm.isComponentProjectWFM() ? //
            Optional.of(ProjectTypeEnum.COMPONENT) : //
            Optional.of(ProjectTypeEnum.WORKFLOW);
        final Optional<SpaceItemVersionEnt> itemVersion = selectedVersion == null ? //
            Optional.empty() : //
            Optional.of(buildVersionInfo(selectedVersion));

        // TODO NXT-3701: Remove itemVersion from this record
        return Optional.of(new Origin(providerId, spaceId, itemId, projectType, null, itemVersion));
    }

    private static SpaceItemVersionEnt buildVersionInfo(final NamedItemVersion selectedVersion) {
        return builder(SpaceItemVersionEnt.SpaceItemVersionEntBuilder.class) //
            .setVersion(selectedVersion.version()) //
            .setTitle(selectedVersion.title()) //
            .setDescription(selectedVersion.description()) //
            .setAuthor(selectedVersion.author()) //
            .setAuthorAccountId(selectedVersion.authorAccountId()) //
            .setCreatedOn(selectedVersion.createdOn()) //
            .build();
    }

    @SuppressWarnings("serial")
    static final class OpenProjectException extends IOException {

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
    static void registerProjectAndSetActive(final Project project, final SpaceProviderEnt.TypeEnum providerType) {
        var pm = DesktopAPI.getDeps(ProjectManager.class);
        pm.addProject(project);
        pm.setProjectActive(project.getID());

        if (providerType != SpaceProviderEnt.TypeEnum.SERVER) {
            DesktopAPI.getDeps(MostRecentlyUsedProjects.class).add(project);
        }

        DesktopAPI.getDeps(AppStateUpdater.class).updateAppState();

        project.getWorkflowManagerIfLoaded().ifPresent(wfm -> {
            NodeTimer.GLOBAL_TIMER.incWorkflowOpening(wfm, ProjectAPI.getWorkflowTypeToTrack(providerType));
        });
    }

    private static WorkflowManager loadWorkflowWithProgress(final RepoObjectImport repoObjectImport) {
        final var fileStore =
            (RemoteExplorerFileStore)ExplorerMountTable.getFileSystem().getStore(repoObjectImport.getKnimeURI());
        var locationInfo = (HubSpaceLocationInfo)repoObjectImport.locationInfo().orElseThrow();
        return DesktopAPUtil.downloadWorkflowWithProgress(fileStore, locationInfo) //
            .map(RemoteWorkflowInput::getWorkflowContext) //
            .flatMap(DesktopAPUtil::loadWorkflowManagerWithProgress) //
            .orElse(null);
    }
}
