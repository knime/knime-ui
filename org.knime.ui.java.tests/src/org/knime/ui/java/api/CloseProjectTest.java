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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.io.IOException;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.knime.core.node.CanceledExecutionException;
import org.knime.core.node.InvalidSettingsException;
import org.knime.core.node.workflow.UnsupportedWorkflowVersionException;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.core.util.LockFailedException;
import org.knime.gateway.api.util.CoreUtil;
import org.knime.gateway.api.webui.entity.SpaceItemReferenceEnt.ProjectTypeEnum;
import org.knime.gateway.impl.project.CachedProject;
import org.knime.gateway.impl.project.Origin;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.gateway.impl.webui.AppStateUpdater;
import org.knime.gateway.impl.webui.service.events.EventConsumer;
import org.knime.testing.util.WorkflowManagerUtil;

/**
 * Tests method in {@link CloseProject}.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
@SuppressWarnings({"java:S5960", "java:S1192"})
class CloseProjectTest {

    private List<WorkflowManager> m_wfms;

    private Runnable m_appStateUpdateListener;

    @BeforeEach
    void setup() throws IOException, InvalidSettingsException, CanceledExecutionException,
        UnsupportedWorkflowVersionException, LockFailedException {
        var eventConsumer = mock(EventConsumer.class);
        var appStateUpdater = new AppStateUpdater();
        m_appStateUpdateListener = mock(Runnable.class);
        appStateUpdater.addAppStateChangedListener(m_appStateUpdateListener);
        var pm = ProjectManager.getInstance();
        DesktopAPI.injectDependency(pm);
        DesktopAPI.injectDependency(appStateUpdater);
        DesktopAPI.injectDependency(eventConsumer);

        var workflowDir = CoreUtil.resolveToFile("/files/test_workspace/simple", OpenProjectTest.class);

        var wfm1 = WorkflowManagerUtil.loadWorkflow(workflowDir);
        var wfm2 = WorkflowManagerUtil.loadWorkflow(workflowDir);
        var origin = Origin.of("providerID", "spaceId", "itemId", ProjectTypeEnum.WORKFLOW);
        pm.addProject(CachedProject.builder() //
            .setWfm(wfm1) //
            .setOrigin(origin) //
            .setId("projectId1") //
            .build());
        pm.addProject(CachedProject.builder() //
            .setWfm(wfm2) //
            .setOrigin(origin) //
            .setId("projectId2") //
            .build());
        pm.setProjectActive("projectId1");
        assertThat(pm.getProjectIds()).hasSize(2);

        m_wfms = List.of(wfm1, wfm2);
    }

    @Test
    void testCloseWorkflow() {
        assertThat(CloseProject.closeProject("projectId1", "projectId2")).isTrue();

        var wfm1 = m_wfms.get(0);
        var wfm2 = m_wfms.get(1);
        assertThatThrownBy(() -> WorkflowManager.ROOT.getNodeContainer(wfm1.getID())) // NOSONAR
            .isInstanceOf(IllegalArgumentException.class);
        assertThat(WorkflowManager.ROOT.getNodeContainer(wfm2.getID()).getName()).isEqualTo("simple");
        var pm = ProjectManager.getInstance();
        assertThat(pm.getProjectIds()).hasSize(1);
        assertThat(pm.isActiveProject("projectId2")).isTrue();
        verify(m_appStateUpdateListener).run();
    }

    @Test
    void testForceCloseWorkflow() {
        // make sure that a workflow is dirty
        var wfm1 = m_wfms.get(0);
        wfm1.setDirty();
        assertThat(wfm1.isDirty()).isTrue();
        var wfm2 = m_wfms.get(1);
        wfm2.setDirty();
        assertThat(wfm2.isDirty()).isTrue();
        ProjectManager.getInstance().getProject("projectId2").orElseThrow().getWorkflowManager();

        CloseProject.forceCloseProjects(List.of("projectId1", "projectId2", "non-existing-id"));

        assertThatThrownBy(() -> WorkflowManager.ROOT.getNodeContainer(wfm1.getID())) // NOSONAR
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> WorkflowManager.ROOT.getNodeContainer(wfm2.getID())) // NOSONAR
            .isInstanceOf(IllegalArgumentException.class);
        var pm = ProjectManager.getInstance();
        assertThat(pm.getProjectIds()).isEmpty();
        verify(m_appStateUpdateListener).run();
    }

    @AfterEach
    void cleanUp() {
        var pm = ProjectManager.getInstance();
        pm.getProjectIds().forEach(pm::removeProject);
        DesktopAPI.disposeDependencies();
    }

}
