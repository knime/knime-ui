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
 *   Oct 30, 2023 (kai): created
 */
package org.knime.ui.java.util;

import java.util.Optional;

import org.knime.core.node.workflow.WorkflowManager;
import org.knime.core.node.workflow.contextv2.AnalyticsPlatformExecutorInfo;
import org.knime.core.node.workflow.contextv2.HubSpaceLocationInfo;
import org.knime.core.node.workflow.contextv2.WorkflowContextV2;
import org.knime.gateway.api.webui.entity.SpaceItemReferenceEnt.ProjectTypeEnum;
import org.knime.gateway.impl.project.DefaultProject;
import org.knime.gateway.impl.project.Project;
import org.knime.gateway.impl.project.Project.Origin;
import org.knime.gateway.impl.webui.spaces.SpaceProvider;
import org.knime.gateway.impl.webui.spaces.local.LocalWorkspace;

/**
 * Factory methods to create a {@link Project}.
 *
 * @author Kai Franze, KNIME GmbH, Germany
 */
public final class ProjectFactory {

    private ProjectFactory() {
        // Utility class
    }

    /**
     * Creates a project based on space-item-infos.
     *
     * @param wfm
     * @param spaceProviderId
     * @param spaceId
     * @param itemId
     * @param relativePath
     * @param projectType
     * @return The newly created project
     */
    public static Project createProject(final WorkflowManager wfm, final String spaceProviderId,
        final String spaceId, final String itemId, final String relativePath, final ProjectTypeEnum projectType) {
        return createProject(wfm, spaceProviderId, spaceId, itemId, relativePath, projectType, null);
    }

    /**
     * Creates a project based on space-item-infos using a custom project ID.
     *
     * @param wfm
     * @param providerId
     * @param spaceId
     * @param itemId
     * @param relativePath
     * @param projectType
     * @param customProjectId
     * @return The newly created project
     */
    public static Project createProject(final WorkflowManager wfm, final String providerId,
        final String spaceId, final String itemId, final String relativePath, final ProjectTypeEnum projectType,
        final String customProjectId) {
        final var origin = getOrigin(providerId, spaceId, itemId, relativePath, projectType);
        final var projectName = wfm.getName();
        return createProject(wfm, origin, projectName, customProjectId);
    }

    /**
     * Creates a project considering most notably the {@link WorkflowManager} and the {@link WorkflowContextV2}.
     *
     * @param wfm
     * @param context
     * @param projectType
     * @param customProjectId
     * @return The newly created project
     */
    public static Project createProject(final WorkflowManager wfm, final WorkflowContextV2 context,
        final ProjectTypeEnum projectType, final String customProjectId) {
        final var path = context.getExecutorInfo().getLocalWorkflowPath();
        final var itemId = LocalSpaceUtil.getLocalWorkspace().getItemId(path);
        final var relativePath = LocalSpaceUtil.getLocalWorkspace().getLocalRootPath().relativize(path).toString();
        final var origin = getOrigin(SpaceProvider.LOCAL_SPACE_PROVIDER_ID, LocalWorkspace.LOCAL_WORKSPACE_ID, itemId,
            relativePath, projectType);
        final var projectName = path.toFile().getName();
        return createProject(wfm, origin, projectName, customProjectId);
    }

    /**
     * Creates a project from a {@link WorkflowManager} and an {@link Origin}
     *
     * @param wfm
     * @param origin
     * @param projectName
     * @param customProjectId
     * @return The newly created project
     */
    public static Project createProject(final WorkflowManager wfm,
        final Origin origin, final String projectName, final String customProjectId) {
        final var projectId =
            customProjectId == null ? DefaultProject.getUniqueProjectId(wfm.getName()) : customProjectId;
        return DefaultProject.builder(wfm) //
            .setId(projectId) //
            .setName(projectName)//
            .setOrigin(origin) //
            .build();
    }

    private static Origin getOrigin(final String providerId, final String spaceId, final String itemId,
        final String relativePath, final ProjectTypeEnum projectType) {
        return new Origin() { // NOSONAR
            @Override
            public String getProviderId() {
                return providerId;
            }

            @Override
            public String getSpaceId() {
                return spaceId;
            }

            @Override
            public String getItemId() {
                return itemId;
            }

            @Override
            public Optional<String> getRelativePath() {
                return Optional.ofNullable(relativePath);
            }

            @Override
            public ProjectTypeEnum getProjectType() {
                return projectType;
            }
        };
    }

    /**
     * Creates an {@link Origin} from a Hub Space and a WorkflowManager
     *
     * @param hubLocation
     * @param wfm
     * @return The newly created Origin, or an empty {@link Optional} if hubLocation or workflow manager are missing
     */
    public static Optional<Origin> getOriginFromHubSpaceLocationInfo(final HubSpaceLocationInfo hubLocation,
        final WorkflowManager wfm) {
        if (hubLocation == null || wfm == null) {
            return Optional.empty();
        }
        final var context = wfm.getContextV2();
        final var apExecInfo = (AnalyticsPlatformExecutorInfo)context.getExecutorInfo();
        return Optional.of(new Project.Origin() {
            @Override
            public String getProviderId() {
                final var mountpoint = apExecInfo.getMountpoint()
                    .orElseThrow(() -> new IllegalStateException("Missing Mount ID for Hub workflow '" + wfm + "'"));
                return mountpoint.getFirst().getAuthority();
            }

            @Override
            public String getSpaceId() {
                return hubLocation.getSpaceItemId();
            }

            @Override
            public String getItemId() {
                return hubLocation.getWorkflowItemId();
            }

            @Override
            public ProjectTypeEnum getProjectType() {
                return wfm.isComponentProjectWFM()? ProjectTypeEnum.COMPONENT: ProjectTypeEnum.WORKFLOW;
            }
        });
    }
}
