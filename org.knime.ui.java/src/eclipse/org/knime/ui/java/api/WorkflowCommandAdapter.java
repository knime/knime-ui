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
 *   16 Aug 2023 (Manuel Hotz, KNIME GmbH, Konstanz, Germany): created
 */
package org.knime.ui.java.api;

import org.knime.core.node.util.CheckUtils;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.ServiceCallException;
import org.knime.gateway.impl.webui.WorkflowKey;
import org.knime.gateway.impl.webui.service.commands.WorkflowCommand;
import org.knime.workbench.editor2.commands.AbstractKNIMECommand;

/**
 * Adapter to re-use Workbench-based AbstractKNIMECommand's on Desktop AP.
 *
 * @author Manuel Hotz, KNIME GmbH, Konstanz, Germany
 */
// we do not extend AbstractWorkflowCommand, since this locks the workflow and legacy AbstractKNIMECommand's
// might also do that (e.g. in modal contexts, leading to deadlocks).
final class WorkflowCommandAdapter implements WorkflowCommand {

    private final AbstractKNIMECommand m_delegate;
    private final boolean m_checkCanExecute;

    /**
     * Adapts an {@link AbstractKNIMECommand} to a knime-ui workflow command.
     *
     * @param delegate delegate command to adapt
     * @param checkCanExecute if the {@link AbstractKNIMECommand#canExecute()} method should be checked and obeyed
     *                        before executing the delegate
     */
    WorkflowCommandAdapter(final AbstractKNIMECommand delegate, final boolean checkCanExecute) {
        m_delegate = CheckUtils.checkNotNull(delegate);
        m_checkCanExecute = checkCanExecute;
    }

    @Override
    public boolean canUndo() {
        return m_delegate.canUndo();
    }

    @Override
    public boolean canRedo() {
        return m_delegate.canRedo();
    }

    @Override
    public void undo() throws ServiceCallException {
        if (!canUndo()) {
            throw ServiceCallException.builder() //
                .withTitle("Failed to undo operation") //
                .withDetails("Cannot undo wrapped command.") //
                .canCopy(false) //
                .build();
        }
        m_delegate.undo();
    }

    @Override
    public void redo() throws ServiceCallException {
        if (!canRedo()) {
            throw ServiceCallException.builder() //
            .withTitle("Failed to redo operation") //
            .withDetails("Cannot redo wrapped command.") //
            .canCopy(false) //
            .build();
        }
        m_delegate.redo();
    }

    @Override
    public boolean execute(final WorkflowKey wfKey) {
        if (m_checkCanExecute && !m_delegate.canExecute()) {
            return false;
        }

        m_delegate.execute();
        // assume the command mutated the workflow
        return true;
    }
}
