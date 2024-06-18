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
 * History
 *   Feb 27, 2023 (hornm): created
 */
package org.knime.ui.java.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.util.Map;

import org.eclipse.core.runtime.NullProgressMonitor;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.DisabledIfSystemProperty;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.gateway.api.webui.entity.SpaceItemReferenceEnt.ProjectTypeEnum;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.gateway.impl.webui.AppStateUpdater;
import org.knime.gateway.impl.webui.service.events.EventConsumer;
import org.knime.gateway.impl.webui.spaces.Space;
import org.knime.gateway.impl.webui.spaces.SpaceProvider;
import org.knime.gateway.impl.webui.spaces.SpaceProviders;
import org.knime.testing.util.WorkflowManagerUtil;
import org.knime.ui.java.util.LocalSpaceUtilTest;
import org.knime.ui.java.util.MostRecentlyUsedProjects;
import org.knime.ui.java.util.ProjectFactory;

/**
 * Tests methods in {@link OpenProject}.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
class OpenProjectTest {

    WorkflowManager m_wfm;

    @Test
    @DisabledIfSystemProperty(named = "java.awt.headless", matches = "true")
    void testOpenWorkflowInWebUIOnly() throws IOException {
        var localWorkspace = LocalSpaceUtilTest.createLocalWorkspace();
        var spaceProvider = mock(SpaceProvider.class);
        when(spaceProvider.getSpace("local")).thenReturn(localWorkspace);
        var spaceProviders = mock(SpaceProviders.class);
        when(spaceProviders.getProvidersMap()).thenReturn(Map.of("local", spaceProvider));
        var eventConsumer = mock(EventConsumer.class);
        var appStateUpdater = new AppStateUpdater();
        var appStateUpdateListener = mock(Runnable.class);
        appStateUpdater.addAppStateChangedListener(appStateUpdateListener);
        var mruProjects = new MostRecentlyUsedProjects();
        var pm = ProjectManager.getInstance();
        DesktopAPI.injectDependencies(pm, appStateUpdater, spaceProviders, null,
            eventConsumer, null, null, null, mruProjects, localWorkspace, null);

        var itemId = localWorkspace.listWorkflowGroup(Space.ROOT_ITEM_ID).getItems().get(0).getId();

        var didOpen1 = OpenProject.openProjectInWebUIOnly("local", "local", "does-not-exist", new NullProgressMonitor());
        assertThat(didOpen1).isFalse();
        var didOpen2 = OpenProject.openProjectInWebUIOnly("local", "local", itemId, new NullProgressMonitor());
        assertThat(didOpen2).isTrue();

        var projectIds = pm.getProjectIds();
        assertThat(projectIds).hasSize(1);
        var project = pm.getProject(projectIds.iterator().next()).get();
        assertThat(project.getName()).isEqualTo("simple");
        m_wfm = project.loadWorkflowManager();
        assertThat(m_wfm).isNotNull();
        assertThat(m_wfm.getName()).startsWith("simple");
        assertThat(mruProjects.get()).hasSize(1);
        assertThat(mruProjects.get().get(0).name()).isEqualTo("simple");

        verify(appStateUpdateListener).run();
    }

    @Test
    void testCreateWorkflowProject() throws IOException {
        m_wfm = WorkflowManagerUtil.createEmptyWorkflow();
        var project = ProjectFactory.createProject(m_wfm, "providerId", "spaceId", "itemId", "relativePath",
            ProjectTypeEnum.WORKFLOW, "projectId");
        assertThat(project.getName()).isEqualTo("workflow");
        assertThat(project.getID()).isEqualTo("projectId");
        assertThat(project.loadWorkflowManager()).isSameAs(m_wfm);
        var origin = project.getOrigin().orElseThrow();
        assertThat(origin.getItemId()).isEqualTo("itemId");
        assertThat(origin.getSpaceId()).isEqualTo("spaceId");
        assertThat(origin.getProviderId()).isEqualTo("providerId");
        assertThat(origin.getRelativePath().orElseThrow()).hasToString("relativePath");
    }

    @AfterEach
    void cleanUp() {
        var pm = ProjectManager.getInstance();
        pm.getProjectIds().forEach(id -> pm.removeProject(id, WorkflowManagerUtil::disposeWorkflow));
        DesktopAPI.disposeDependencies();
    }

}
