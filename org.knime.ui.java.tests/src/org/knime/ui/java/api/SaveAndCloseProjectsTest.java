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
 *   Feb 28, 2023 (hornm): created
 */
package org.knime.ui.java.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.knime.ui.java.api.SaveProjectTest.assertWorkflowSaved;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.util.List;
import java.util.function.Consumer;

import org.eclipse.core.runtime.NullProgressMonitor;
import org.eclipse.jface.operation.IRunnableWithProgress;
import org.eclipse.ui.progress.IProgressService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.gateway.api.webui.entity.SpaceItemReferenceEnt.ProjectTypeEnum;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.gateway.impl.webui.AppStateUpdater;
import org.knime.testing.util.WorkflowManagerUtil;
import org.knime.ui.java.api.SaveAndCloseProjects.PostProjectCloseAction;
import org.knime.ui.java.util.ProjectFactory;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

/**
 * Tests methods in {@link SaveAndCloseProjects}.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
class SaveAndCloseProjectsTest {

    private List<WorkflowManager> m_wfms;

    @Test
    void testSaveAndCloseWorkflows() throws IOException, InvocationTargetException, InterruptedException {
        var wfm1 = WorkflowManagerUtil.createEmptyWorkflow();
        var wfm2 = WorkflowManagerUtil.createEmptyWorkflow();
        var wfm3 = WorkflowManagerUtil.createEmptyWorkflow();
        var wfms = List.of(wfm1, wfm2, wfm3);
        m_wfms = wfms;
        assertThat(wfm1.isDirty()).isTrue();
        var pm = ProjectManager.getInstance();
        for (int i = 1; i <= 3; i++) {
            var projectId = "projectId" + i;
            pm.addProject(ProjectFactory.createProject(wfms.get(i - 1), "providerId",
                "spaceId", "itemId", "relativePath", ProjectTypeEnum.WORKFLOW, projectId));
            pm.openAndCacheProject(projectId);
        }

        var appStateUpdater = new AppStateUpdater();
        var appStateUpdateListener = mock(Runnable.class);
        appStateUpdater.addAppStateChangedListener(appStateUpdateListener);
        DesktopAPI.injectDependencies(null, appStateUpdater, null, null, null, null, null, null);

        var progressService = mock(IProgressService.class);
        Mockito.doAnswer(invocation -> {
            var runnable = (IRunnableWithProgress)invocation.getArgument(2);
            runnable.run(new NullProgressMonitor());
            return null;
        }).when(progressService).run(eq(true), eq(false), ArgumentMatchers.any());

        Consumer<PostProjectCloseAction> postWorkflowCloseActionConsumer = mock(Consumer.class);

        SaveAndCloseProjects.saveAndCloseProjects(
            new Object[]{3.0, "projectId1", "projectId2", "projectId3", "svg1", "svg2", "svg3", "UPDATE_APP_STATE"},
            postWorkflowCloseActionConsumer, progressService);

        for (int i = 1; i <= 3; i++) {
            assertWorkflowSaved(wfms.get(i - 1), "svg" + i);
            assertWorkflowClosed(wfms.get(i - 1), "projectId" + i);
        }
        verify(appStateUpdateListener).run();

        // check the other post workflow closed actions
        SaveAndCloseProjects.saveAndCloseProjects(new Object[]{1.0, "projectId1", "svg1", "SWITCH_PERSPECTIVE"},
            postWorkflowCloseActionConsumer, progressService);
        verify(postWorkflowCloseActionConsumer).accept(PostProjectCloseAction.SWITCH_PERSPECTIVE);

        SaveAndCloseProjects.saveAndCloseProjects(new Object[]{1.0, "projectId1", "svg1", "SHUTDOWN"},
            postWorkflowCloseActionConsumer, progressService);
        verify(postWorkflowCloseActionConsumer).accept(PostProjectCloseAction.SHUTDOWN);
    }

    private static void assertWorkflowClosed(final WorkflowManager wfm, final String projectId) {
        assertThatThrownBy(() -> WorkflowManager.ROOT.getNodeContainer(wfm.getID())) // NOSONAR
            .isInstanceOf(IllegalArgumentException.class);
        assertThat(ProjectManager.getInstance().getProjectIds()).doesNotContain(projectId);
    }

    @AfterEach
    void cleanUp() {
        var pm = ProjectManager.getInstance();
        pm.getProjectIds().forEach(id -> pm.removeProject(id, WorkflowManagerUtil::disposeWorkflow));
        DesktopAPI.disposeDependencies();
    }
}
