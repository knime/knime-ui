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
 *   Jul 1, 2024 (hornm): created
 */
package org.knime.ui.java.api;

import org.eclipse.ui.IPartListener;
import org.eclipse.ui.IWorkbenchPart;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.ui.java.util.PerspectiveUtil;
import org.knime.workbench.editor2.WorkflowEditor;

/**
 * The {@link DesktopAPI} is usually only meant to be called by the frontend (hence, all desktop API functions are
 * package scope). However, are cases where a desktop API logic is required by other java-code. This class publicly
 * exposes the required logic/functions accordingly.
 *
 * The function calls will only have an effect if the desktop API has been initialized.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public final class DesktopAPIExport {

    private DesktopAPIExport() {
        // utility
    }

    /**
     * Part listener that removes the project from the {@link ProjectManager} on when the part is closed.
     */
    public static final IPartListener PART_CLOSED_LISTENER = new IPartListener() {

        @Override
        public void partActivated(final IWorkbenchPart part) {} // NOSONAR

        @Override
        public void partBroughtToTop(final IWorkbenchPart part) {} // NOSONAR

        @Override
        public void partDeactivated(final IWorkbenchPart part) {} // NOSONAR

        @Override
        public void partOpened(final IWorkbenchPart part) {} // NOSONAR

        @Override
        public void partClosed(final IWorkbenchPart part) {
            if (!PerspectiveUtil.isClassicPerspectiveActive() && part instanceof WorkflowEditor editor) {
                editor.getWorkflowManager() //
                    .map(WorkflowManager::getNameWithID) //
                    .filter(id -> ProjectManager.getInstance().getProject(id).isPresent()) //
                    .ifPresent(CloseProject::onProjectClosedInClassicUI);
            }
        }
    };

    /**
     * Sends the event to update the space provider infos on the frontend.
     */
    public static void sendSpaceProviderChangedEvent() {
        if (DesktopAPI.areDependenciesInjected()) {
            SpaceAPI.getSpaceProviders();
        }
    }

}
