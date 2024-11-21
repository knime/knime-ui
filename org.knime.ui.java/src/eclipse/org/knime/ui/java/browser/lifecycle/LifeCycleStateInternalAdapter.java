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

import java.util.function.Supplier;

import org.eclipse.core.runtime.jobs.IJobChangeListener;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.gateway.impl.webui.spaces.local.LocalWorkspace;
import org.knime.product.rcp.intro.WelcomeAPEndpoint;
import org.knime.ui.java.api.SaveAndCloseProjects;
import org.knime.ui.java.profile.UserProfile;
import org.knime.ui.java.util.MostRecentlyUsedProjects;

/**
 * Implementation of {@link LifeCycleStateInternal} that 'adapts' the wrapped life-cycle-state and delegates the calls
 * to it. Allows subclasses to just selectively overwrite respective methods.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
class LifeCycleStateInternalAdapter implements LifeCycleStateInternal {

    private final LifeCycleStateInternal m_lifeCycleStateInternal;

    LifeCycleStateInternalAdapter(final LifeCycleStateInternal lifeCycleStateInternal) {
        m_lifeCycleStateInternal = lifeCycleStateInternal;
    }

    @Override
    public Supplier<SaveAndCloseProjects.State> saveAndCloseAllWorkflows() {
        return m_lifeCycleStateInternal.saveAndCloseAllWorkflows();
    }

    @Override
    public String serializedAppState() {
        return m_lifeCycleStateInternal.serializedAppState();
    }

    @Override
    public IJobChangeListener getJobChangeListener() {
        return m_lifeCycleStateInternal.getJobChangeListener();
    }

    @Override
    public ProjectManager getProjectManager() {
        return m_lifeCycleStateInternal.getProjectManager();
    }

    @Override
    public MostRecentlyUsedProjects getMostRecentlyUsedProjects() {
        return m_lifeCycleStateInternal.getMostRecentlyUsedProjects();
    }

    @Override
    public LocalWorkspace getLocalWorkspace() {
        return m_lifeCycleStateInternal.getLocalWorkspace();
    }

    @Override
    public UserProfile getUserProfile() {
        return m_lifeCycleStateInternal.getUserProfile();
    }

    @Override
    public WelcomeAPEndpoint getWelcomeApEndpoint() {
        return m_lifeCycleStateInternal.getWelcomeApEndpoint();
    }

}
