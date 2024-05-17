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
 *   May 17, 2024 (hornm): created
 */
package org.knime.ui.java.util;

import static java.lang.String.format;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Predicate;

import org.knime.core.node.util.CheckUtils;
import org.knime.gateway.impl.project.Project;
import org.knime.gateway.impl.project.Project.Origin;

/**
 * Utility class to be able to keep track of the most recently used projects.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public final class MostRecentlyUsedProjects {

    private static final int MAX_NUM_RECENTLY_USED_PROJECTS = 10;

    private final Map<String, RecentlyUsedProject> m_projects = new LinkedHashMap<>() {
        @Override
        protected boolean removeEldestEntry(final Map.Entry<String, RecentlyUsedProject> eldest) {
            return size() > MAX_NUM_RECENTLY_USED_PROJECTS;
        }
    };

    /**
     * @param proj the project to add, see also {@link #add(RecentlyUsedProject)}
     */
    public void add(final Project proj) {
        var origin = proj.getOrigin().orElse(null);
        if (origin != null) {
            add(new RecentlyUsedProject(proj.getName(), origin, OffsetDateTime.now()));
        }
    }

    /**
     * Adds a new recently used project to the list. Projects are identified by their relative path or, if it doesn't
     * exist, by item-id (further 'uniquified' by space- and provider-id). If a project of the same 'id' is added
     * again, it will move to the bottom of the list.
     *
     * @param project
     */
    public void add(final RecentlyUsedProject project) {
        var id = getId(project.origin());
        if (m_projects.containsKey(id)) {
            // ensures that the newly added entry is inserted at the bottom of the 'list'
            m_projects.remove(id);
        }
        m_projects.put(id, project);
    }

    /**
     * Removes projects matching the given filter.
     *
     * @param filter
     */
    public void removeIf(final Predicate<RecentlyUsedProject> filter) {
        new HashSet<>(m_projects.keySet()).stream().forEach(k -> {
            var p = m_projects.get(k);
            if (filter.test(p)) {
                m_projects.remove(k);
            }
        });
    }

    private static String getId(final Origin origin) {
        return origin.getRelativePath()
            .orElse(format("%s_%s_%s", origin.getItemId(), origin.getSpaceId(), origin.getProviderId()));
    }

    /**
     * @return the list of the recently used projects, with the most recently used one at the bottom
     */
    public List<RecentlyUsedProject> get() {
        return m_projects.values().stream().toList();
    }

    /**
     * @param name recently used project name
     * @param origin the project's origin
     * @param timeUsed timestamp of the last time it has been used
     */
    public record RecentlyUsedProject(String name, Origin origin, OffsetDateTime timeUsed) {

        @SuppressWarnings("javadoc")
        public RecentlyUsedProject {
            CheckUtils.checkNotNull(name);
            CheckUtils.checkNotNull(origin);
            CheckUtils.checkNotNull(timeUsed);
        }
    }
}
