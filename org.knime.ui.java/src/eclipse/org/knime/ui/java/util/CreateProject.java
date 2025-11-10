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
 */

package org.knime.ui.java.util;

import java.nio.file.Path;

import org.eclipse.core.runtime.SubMonitor;
import org.knime.core.node.ExecutionMonitor;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.core.node.workflow.contextv2.LocationInfo;
import org.knime.core.node.workflow.contextv2.RestLocationInfo;
import org.knime.core.node.workflow.contextv2.WorkflowContextV2;
import org.knime.core.util.ProgressMonitorAdapter;
import org.knime.gateway.api.service.GatewayException;
import org.knime.gateway.api.util.VersionId;
import org.knime.gateway.api.webui.service.util.MutableServiceCallException;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.LoggedOutException;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.NetworkException;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.ServiceCallException;
import org.knime.gateway.impl.project.Origin;
import org.knime.gateway.impl.project.Project;
import org.knime.gateway.impl.project.WorkflowManagerLoader;
import org.knime.gateway.impl.webui.spaces.Space;
import org.knime.gateway.impl.webui.spaces.SpaceProviders;
import org.knime.gateway.impl.webui.spaces.local.LocalSpace;

/**
 * Static logic to load and create projects.
 */
public final class CreateProject {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(CreateProject.class);

    private CreateProject() {

    }

    /**
     * Create a {@link Project} instance that corresponds to an {@link Origin}, i.e. an item in a {@link Space}.
     *
     * @param origin -
     * @param progressReporter -
     * @param space -
     * @return -
     * @throws LoggedOutException
     * @throws NetworkException
     * @throws ServiceCallException
     */
    public static Project createProjectFromOrigin(final Origin origin, final ProgressReporter progressReporter,
        final Space space) throws NetworkException, LoggedOutException, ServiceCallException {
        String name;
        try {
            name = space.getItemName(origin.itemId());
        } catch (final MutableServiceCallException e) {
            throw e.toGatewayException("Failed to open project");
        }
        var projectId = Project.getUniqueProjectId(name);
        return createProjectFromOrigin(projectId, name, origin, progressReporter, space);
    }

    /**
     * Create a {@link Project} instance that corresponds to an {@link Origin}, i.e. an item in a {@link Space}.
     *
     * @param projectId -
     * @param name -
     * @param origin -
     * @param progressReporter -
     * @param space -
     * @return -
     */
    public static Project createProjectFromOrigin(final String projectId, final String name, final Origin origin,
        final ProgressReporter progressReporter, final Space space) {
        return Project.builder() //
            .setWfmLoader(fromOriginWithProgressReporter(origin, progressReporter, space)) //
            .setName(name) //
            .setId(projectId) //
            .setOrigin(origin) //
            .build();
    }

    /**
     * Obtain a {@link WorkflowManager} instance from a space item located by {@link Origin}.
     *
     * @implNote The {@link SpaceProviders} reference has to be obtained here and can not be given as parameter because
     *           the calling instance of {@link org.knime.ui.java.persistence.AppStatePersistor} is constructed before
     *           the SpaceProvider dependency is set (namely in `Create` and not in `Init`).
     * @param origin Locates the space item to load from
     * @param progressReporter to report loading state to
     * @param spaceProviders -
     * @return A loader instance that can be called to load the {@link WorkflowManager}
     */
    private static WorkflowManagerLoader fromOriginWithProgressReporter(final Origin origin,
        final ProgressReporter progressReporter, final Space space) {
        return version -> progressReporter.getWithProgress( // NOSONAR
            WorkflowManagerLoader.LOADING_WORKFLOW_PROGRESS_MSG, //
            LOGGER, //
            monitor -> { // NOSONAR
                final var subMonitor =
                    SubMonitor.convert(monitor, WorkflowManagerLoader.LOADING_WORKFLOW_PROGRESS_MSG, 100);

                final var execMon = new ExecutionMonitor(new ProgressMonitorAdapter(subMonitor)); // one tick/percent
                var path = WorkflowManagerLoader.fetch(origin, version, space, execMon);
                if (path.isEmpty()) {
                    LOGGER.error("Could not fetch workflow from origin " + origin);
                    return null;
                }

                try {
                    final var workflowContext = createWorkflowContext(space, origin.itemId(), path.get(), version);
                    monitor.subTask("Loading workflow from disk");
                    return DesktopAPUtil.loadWorkflowManager(subMonitor.slice(0), path.get(), workflowContext, version);
                } catch (final GatewayException | MutableServiceCallException e) {
                    LOGGER.error(e);
                    return null;
                }
            }).orElse(null);
    }

    private static WorkflowContextV2 createWorkflowContext(final Space space, final String itemId, final Path path,
        final VersionId version) throws NetworkException, LoggedOutException, MutableServiceCallException {
        final var mountId = space.toKnimeUrl(itemId).getAuthority();
        final var location = space.getLocationInfo(itemId, version);
        // TODO A local space root makes no sense for remote mountpoints
        //  see AP-22097 Remove Requirement for Local Mountpoint Root Path from `WorkflowContextV2`
        final var localSpaceRoot = getLocalRoot(space, location, path);
        return WorkflowContextV2.builder() //
            .withAnalyticsPlatformExecutor(builder -> builder //
                .withCurrentUserAsUserId() //
                .withLocalWorkflowPath(path) //
                .withMountpoint(mountId, localSpaceRoot)) //
            .withLocation(location) //
            .build();
    }

    private static Path getLocalRoot(final Space space, final LocationInfo location, final Path path) {
        if (space instanceof LocalSpace localSpace) {
            return localSpace.getRootPath();
        }
        if (location instanceof RestLocationInfo) {
            return path.getParent();
        }
        return Path.of("/").toAbsolutePath();
    }
}
