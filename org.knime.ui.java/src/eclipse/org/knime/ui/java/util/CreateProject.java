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

import org.knime.core.node.NodeLogger;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.gateway.impl.project.Origin;
import org.knime.gateway.impl.project.Project;
import org.knime.gateway.impl.project.WorkflowManagerLoader;
import org.knime.gateway.impl.webui.spaces.Space;
import org.knime.gateway.impl.webui.spaces.SpaceProviders;

/**
 * Static logic to load and create projects.
 */
public final class CreateProject {

    private CreateProject() {

    }

    /**
     * Create a {@link Project} instance that corresponds to an {@link Origin}, i.e. an item in a {@link Space}.
     *
     * @param origin -
     * @param progressReporter -
     * @param spaceProviders -
     * @return -
     */
    public static Project createProjectFromOrigin(final Origin origin, final ProgressReporter progressReporter,
        final SpaceProviders spaceProviders) {
        var name = spaceProviders.getSpace(origin.providerId(), origin.spaceId()) //
            .getItemName(origin.itemId());
        var projectId = Project.getUniqueProjectId(name);
        return createProjectFromOrigin(projectId, name, origin, progressReporter, spaceProviders);
    }

    /**
     * Create a {@link Project} instance that corresponds to an {@link Origin}, i.e. an item in a {@link Space}.
     *
     * @param projectId -
     * @param name -
     * @param origin -
     * @param progressReporter -
     * @param spaceProviders -
     * @return -
     */
    public static Project createProjectFromOrigin(final String projectId, final String name, final Origin origin,
        final ProgressReporter progressReporter, final SpaceProviders spaceProviders) {
        return Project.builder() //
            .setWfmLoader(loaderFromOrigin(origin, progressReporter, spaceProviders)) //
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
     * @param spaceProviders
     * @return A loader instance that can be called to load the {@link WorkflowManager}
     */
    private static WorkflowManagerLoader loaderFromOrigin(final Origin origin, final ProgressReporter progressReporter,
        final SpaceProviders spaceProviders) {
        return version -> progressReporter.getWithProgress( //
            DesktopAPUtil.LOADING_WORKFLOW_PROGRESS_MSG, //
            NodeLogger.getLogger(CreateProject.class), //
            monitor -> DesktopAPUtil.fetchAndLoadWorkflowWithTask(spaceProviders, origin, monitor, version) //
        ).orElse(null);
    }
}
