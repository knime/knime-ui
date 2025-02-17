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
 *   Jan 26, 2023 (hornm): created
 */
package org.knime.ui.java.browser.lifecycle;

import java.util.List;
import java.util.function.Supplier;

import org.eclipse.core.runtime.jobs.IJobChangeListener;
import org.eclipse.core.runtime.jobs.IJobManager;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.gateway.impl.webui.service.events.EventConsumer;
import org.knime.gateway.impl.webui.spaces.local.LocalSpace;
import org.knime.product.rcp.intro.WelcomeAPEndpoint;
import org.knime.ui.java.api.SaveAndCloseProjects;
import org.knime.ui.java.profile.UserProfile;
import org.knime.ui.java.util.MostRecentlyUsedProjects;

/**
 * Life-cycle-state only available to the state-transitions (within this package).
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public interface LifeCycleStateInternal extends LifeCycleState {

    @SuppressWarnings({"MissingJavadoc", "javadoc"})
    static LifeCycleStateInternal of(final ProjectManager projectManager,
        final MostRecentlyUsedProjects mostRecentlyUsedProjects, final LocalSpace localSpace,
        final WelcomeAPEndpoint welcomeAPEndpoint, final UserProfile userProfile) {

        return new LifeCycleStateInternal() { // NOSONAR

            @Override
            public ProjectManager getProjectManager() {
                return projectManager;
            }

            @Override
            public MostRecentlyUsedProjects getMostRecentlyUsedProjects() {
                return mostRecentlyUsedProjects;
            }

            @Override
            public LocalSpace getLocalSpace() {
                return localSpace;
            }

            @Override
            public WelcomeAPEndpoint getWelcomeApEndpoint() {
                return welcomeAPEndpoint;
            }

            @Override
            public UserProfile getUserProfile() {
                return userProfile;
            }
        };
    }

    /**
     * @return the logic which saves and closes all workflows.
     * @see SaveAndCloseProjects#saveAndCloseProjectsInteractively(List, EventConsumer)
     */
    default Supplier<SaveAndCloseProjects.State> getSaveAndCloseAllProjectsFunction() {
        return null;
    }

    /**
     * @return the app state serialized into a string
     */
    default String serializedAppState() {
        return null;
    }

    /**
     * @return The job change listener that was registered to the {@link IJobManager}
     */
    default IJobChangeListener getJobChangeListener() {
        return null;
    }

    /**
     * @return the instance
     */
    WelcomeAPEndpoint getWelcomeApEndpoint();

    /**
     * @return project manager instance to be passed between life cycle phases
     */
    ProjectManager getProjectManager();

    /**
     * @return most recently used projects to be passed between life cycle phases
     */
    MostRecentlyUsedProjects getMostRecentlyUsedProjects();

    /**
     * @return the local space instance to be passed between life cycle phases
     */
    LocalSpace getLocalSpace();

    /**
     * @return the user profile instance to be passed between life cycle phases
     */
    UserProfile getUserProfile();
}
