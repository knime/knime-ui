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
 *   May 23, 2024 (hornm): created
 */
package org.knime.ui.java.util;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.knime.gateway.api.webui.entity.SpaceItemReferenceEnt.ProjectTypeEnum;
import org.knime.gateway.impl.project.DefaultProject;
import org.knime.gateway.impl.project.Project;
import org.knime.gateway.impl.project.Project.Origin;
import org.knime.testing.util.WorkflowManagerUtil;
import org.knime.ui.java.util.MostRecentlyUsedProjects.RecentlyUsedProject;

/**
 * Tests {@link MostRecentlyUsedProjects}.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public class MostRecentlyUsedProjectsTest {

    /**
     * Makes, e.g., sure that projects with the same 'id' aren't added twice but just move in the list.
     */
    @Test
    void testAddAndGetRecentlyUsedProjects() {
        var mruProjects = new MostRecentlyUsedProjects();
        var proj1 = new RecentlyUsedProject("name1", createOrigin("pid", "sid", "iid", "relPath"), OffsetDateTime.MAX);
        var proj2 =
            new RecentlyUsedProject("name2", createOrigin("pid", "sid", "iid2", null), OffsetDateTime.MAX);
        var proj3 = new RecentlyUsedProject("name3", createOrigin("pid", "sid", "iid3", "relPath"), OffsetDateTime.MAX);
        var proj4 = new RecentlyUsedProject("name4", createOrigin("pid", "sid", "iid2", null), OffsetDateTime.MAX);
        mruProjects.add(proj1);
        mruProjects.add(proj2);
        assertThat(mruProjects.get()).isEqualTo(List.of(proj1, proj2));
        mruProjects.add(proj3);
        assertThat(mruProjects.get()).isEqualTo(List.of(proj2, proj3));
        mruProjects.add(proj4);
        assertThat(mruProjects.get()).isEqualTo(List.of(proj3, proj4));
    }

    /**
     * Tests {@link MostRecentlyUsedProjects#add(org.knime.gateway.impl.project.Project)}
     *
     * @throws IOException
     */
    @Test
    void testAddProject() throws IOException {
        var mruProjects = new MostRecentlyUsedProjects();
        var wfm = WorkflowManagerUtil.createEmptyWorkflow();
        mruProjects.add(DefaultProject.builder(wfm).build());
        assertThat(mruProjects.get()).as("projects without origin are omitted").isEmpty();
        var origin = createOrigin("1", "2", "3", null);
        mruProjects.add(DefaultProject.builder(wfm).setOrigin(origin).build());
        assertThat(mruProjects.get()).hasSize(1);
        assertThat(mruProjects.get().get(0).name()).isEqualTo("workflow");
        assertThat(mruProjects.get().get(0).origin()).isSameAs(origin);
        WorkflowManagerUtil.disposeWorkflow(wfm);
    }

    /**
     * Tests {@link MostRecentlyUsedProjects#removeIf(java.util.function.Predicate)}.
     */
    @Test
    void testRemoveIf() {
        var mruProjects = new MostRecentlyUsedProjects();
        var proj1 = new RecentlyUsedProject("name1", createOrigin("pid", "sid", "iid", "relPath"), OffsetDateTime.MAX);
        var proj2 = new RecentlyUsedProject("name2", createOrigin("pid", "sid", "iid2", null), OffsetDateTime.MAX);
        mruProjects.add(proj1);
        mruProjects.add(proj2);

        mruProjects.removeIf(p -> p.name().equals("name1"));
        assertThat(mruProjects.get()).hasSize(1);
        assertThat(mruProjects.get().get(0).name()).isEqualTo("name2");

    }

    /**
     * Creates a {@link Project.Origin} instance for testing purposes.
     *
     * @param providerId
     * @param spaceId
     * @param itemId
     * @param relativePath
     * @return a new instance
     */
    public static Origin createOrigin(final String providerId, final String spaceId, final String itemId,
        final String relativePath) {
        return new Origin() {

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
            public ProjectTypeEnum getProjectType() {
                return null;
            }

            @Override
            public Optional<String> getRelativePath() {
                return Optional.ofNullable(relativePath);
            }

        };
    }

}
