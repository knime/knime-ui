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
import static org.knime.ui.java.util.MostRecentlyUsedProjectsTest.createOrigin;

import java.io.IOException;
import java.time.OffsetDateTime;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.gateway.api.webui.entity.SpaceItemReferenceEnt.ProjectTypeEnum;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.testing.util.WorkflowManagerUtil;
import org.knime.ui.java.util.LocalSpaceUtilTest;
import org.knime.ui.java.util.MostRecentlyUsedProjects;
import org.knime.ui.java.util.MostRecentlyUsedProjects.RecentlyUsedProject;
import org.knime.ui.java.util.ProjectFactory;

/**
 * Tests some methods in {@link ProjectAPI}.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
class ProjectAPITest {

    private WorkflowManager m_wfm;

    @Test
    void testSetProjectActiveAndEnsureItsLoaded() throws IOException {
        m_wfm = WorkflowManagerUtil.createEmptyWorkflow();
        var wpm = ProjectManager.getInstance();
        wpm.addProject(ProjectFactory.createProject(m_wfm, "providerId", "spaceId", "itemId",
            "relativePath", ProjectTypeEnum.WORKFLOW, "projectId"));

        ProjectAPI.setProjectActiveAndEnsureItsLoaded("projectId");

        assertThat(wpm.getCachedProject("projectId")).isNotNull();
        assertThat(wpm.isActiveProject("projectId")).isTrue();
    }

    @Test
    void testUpdateAndGetMostRecentlyUsedProjects() throws IOException {
        var mruProjects = new MostRecentlyUsedProjects();
        var proj1 =
            new RecentlyUsedProject("name1", createOrigin("local", "local", "iid", "relPath"), OffsetDateTime.MAX);
        var proj2 = new RecentlyUsedProject("name2", createOrigin("pid", "sid", "iid2", null), OffsetDateTime.MAX);
        var proj3 =
            new RecentlyUsedProject("name2", createOrigin("local", "local", "iid3", "relPath2"), OffsetDateTime.MAX);
        mruProjects.add(proj1);
        mruProjects.add(proj2);
        mruProjects.add(proj3);

        DesktopAPI.injectDependencies(null, null, null, null, null, null, null, null, mruProjects,
            LocalSpaceUtilTest.createLocalWorkspace());

        var res = ProjectAPI.updateAndGetMostRecentlyUsedProjects();
        assertThat(res).isEqualTo(String.format("""
                [ {
                  "name" : "name2",
                  "timeUsed" : "%s",
                  "origin" : {
                    "providerId" : "pid",
                    "spaceId" : "sid",
                    "itemId" : "iid2"
                  }
                } ]""", OffsetDateTime.MAX));
        assertThat(mruProjects.get()).hasSize(1);
    }

    @Test
    void testRemoveMostRecentlyUsedProject() {
        var mruProjects = new MostRecentlyUsedProjects();
        var proj1 =
            new RecentlyUsedProject("name1", createOrigin("local", "local", "iid", "relPath"), OffsetDateTime.MAX);
        var proj2 = new RecentlyUsedProject("name2", createOrigin("pid", "sid", "iid2", null), OffsetDateTime.MAX);
        mruProjects.add(proj1);
        mruProjects.add(proj2);

        DesktopAPI.injectDependencies(null, null, null, null, null, null, null, null, mruProjects, null);

        ProjectAPI.removeMostRecentlyUsedProject("pidblub", "sid", "iid2");
        assertThat(mruProjects.get()).hasSize(2);

        ProjectAPI.removeMostRecentlyUsedProject("pid", "sid", "iid2");
        assertThat(mruProjects.get()).hasSize(1);
        assertThat(mruProjects.get().get(0).name()).isEqualTo("name1");
    }

    @AfterEach
    void cleanUp() {
        ProjectManager.getInstance().removeProject("projectId", WorkflowManagerUtil::disposeWorkflow);
        DesktopAPI.disposeDependencies();
    }

}
