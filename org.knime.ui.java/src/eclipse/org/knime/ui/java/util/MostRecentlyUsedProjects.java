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
import org.knime.gateway.impl.project.Origin;
import org.knime.gateway.impl.project.Project;
import org.knime.gateway.impl.webui.spaces.local.LocalSpace;

/**
 * Utility class to be able to keep track of the most recently used projects.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public final class MostRecentlyUsedProjects {

    private static final int MAX_NUM_RECENTLY_USED_PROJECTS = 20;

    private final Map<String, RecentlyUsedProject> m_projects = new LinkedHashMap<>() {
        @Override
        protected boolean removeEldestEntry(final Map.Entry<String, RecentlyUsedProject> eldest) {
            return size() > MAX_NUM_RECENTLY_USED_PROJECTS;
        }
    };

    /**
     * Only for testing.
     */
    public MostRecentlyUsedProjects() {
    }

    /**
     * -
     * 
     * @param localSpace The local space instance to listen to
     */
    public MostRecentlyUsedProjects(final LocalSpace localSpace) {
        localSpace.addItemRemovedListener(
            removedItemId -> this.removeIf(recentlyUsedProject -> recentlyUsedProject.origin().isLocal()
                && recentlyUsedProject.origin().itemId().equals(removedItemId)));
    }

    /**
     * @param project the project to add, see also {@link #add(RecentlyUsedProject)}
     */
    public void add(final Project project) {
        project.getOrigin()
            .ifPresent(origin -> add(new RecentlyUsedProject(project.getName(), origin, OffsetDateTime.now())));
    }

    /**
     * Adds a new recently used project to the list. Projects are identified by their relative path or, if it doesn't
     * exist, by item-id (further 'uniquified' by space- and provider-id). If a project of the same 'id' is added again,
     * it will move to the bottom of the list.
     *
     * @param project
     */
    public void add(final RecentlyUsedProject project) {
        var projectKey = getKey(project.origin());
        if (m_projects.containsKey(projectKey)) {
            // ensures that the newly added entry is inserted at the bottom of the 'list'
            m_projects.remove(projectKey);
        }
        m_projects.put(projectKey, project);
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

    /**
     * Updates infos on a most recently used project (name, relative path (in case of a local project)).
     *
     * @param providerId
     * @param spaceId
     * @param itemId
     * @param newName a new name to set; won't be updated if {@code null} or empty
     * @param localSpace
     */
    public void updateOriginAndName(final String providerId, final String spaceId, final String itemId,
        final String newName, final LocalSpace localSpace) {

        Origin newOrigin = null;
        if (LocalSpaceUtil.isLocalSpace(providerId, spaceId)) {
            // update relative path in origin (in case the project has been renamed or moved
            var absolutePath = localSpace.toLocalAbsolutePath(itemId).orElse(null);
            if (absolutePath != null) {
                newOrigin = LocalSpaceUtil.getLocalOrigin(absolutePath, localSpace);
            }
        }

        var projectKey = getKey(providerId, spaceId, itemId);
        var project = m_projects.get(projectKey);
        if (project == null) {
            return;
        }
        m_projects.put(projectKey,
            new RecentlyUsedProject(newName == null || newName.isEmpty() ? project.name() : newName,
                newOrigin == null ? project.origin() : newOrigin, project.timeUsed()));
    }

    private static String getKey(final Origin origin) {
        return getKey(origin.providerId(), origin.spaceId(), origin.itemId());
    }

    private static String getKey(final String providerId, final String spaceId, final String itemId) {
        return format("%s_%s_%s", providerId, spaceId, itemId);
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

        @SuppressWarnings({"javadoc", "MissingJavadoc"})
        public RecentlyUsedProject {
            CheckUtils.checkNotNull(name);
            CheckUtils.checkNotNull(origin);
            CheckUtils.checkNotNull(timeUsed);
        }
    }
}
