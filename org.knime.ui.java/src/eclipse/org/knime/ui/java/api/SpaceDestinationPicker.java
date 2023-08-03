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
 *   Jan 31, 2023 (leonard.woerteler): created
 */
package org.knime.ui.java.api;

import java.util.Optional;

import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.jface.window.Window;
import org.eclipse.ui.PlatformUI;
import org.knime.workbench.explorer.view.dialogs.DestinationSelectionDialog;
import org.knime.workbench.explorer.view.dialogs.DestinationSelectionDialog.SelectedDestination;

/**
 * Destination folder/space picker for uploads.
 *
 * @author Leonard Wörteler, KNIME GmbH, Konstanz, Germany
 */
final class SpaceDestinationPicker {

    public enum Operation {
        UPLOAD("Upload to...", "uploaded"),
        DOWNLOAD("Download to...", "downloaded"),
        SAVE("Save to...", "saved");

        private final String m_title;
        private final String m_desc;

        Operation(final String title, final String desc) {
            m_title = title;
            m_desc = desc;
        }
    }

    private final Operation m_operation;

    private final String[] m_spaceProviders;

    private String m_fileName = null;

    private DestinationSelectionDialog m_dialog;

    private SelectedDestination m_destination;

    private SpaceDestinationPicker(final String[] spaceProviders, final Operation operation) {
        m_spaceProviders = spaceProviders;
        m_operation = operation;
    }

    public SpaceDestinationPicker(final String[] spaceProviders, final Operation operation, final String defaultName) {
        this(spaceProviders, operation);
        m_fileName = defaultName;
    }

    /**
     * Displays a modal dialog for picking a target folder or space.
     *
     * @return true if something is selected, false otherwise or cancelled
     */
    public boolean open() {
        final var workbench = PlatformUI.getWorkbench();
        return workbench.getDisplay().syncCall(() -> { // NOSONAR
            final var shell = workbench.getModalDialogShellProvider().getShell();
            m_dialog = new DestinationSelectionDialog(shell, m_spaceProviders, null,
                "Destination", m_operation.m_title, "Select the destination folder.",
                "Select the destination folder to which the selected element will be " + m_operation.m_desc);
            m_dialog.setShowExcludeDataOption(m_operation == Operation.UPLOAD);
            m_dialog.setNameFieldEnabled(m_operation == Operation.SAVE);
            // take some sensible default when op is not SAVE
            m_dialog.setNameFieldDefaultValue(m_fileName);
            while (m_dialog.open() == Window.OK) {
                final var destGroup = m_dialog.getSelectedDestination();
                final var destGroupInfo = destGroup.getDestination().fetchInfo();
                if (!destGroupInfo.isWriteable()) {
                    if (MessageDialog.openConfirm(shell, "Not writable",
                            "The selected folder is not writable.\n\nChoose a new location.")) {
                        continue;
                    } else {
                        // user has chosen to abort
                        return false;
                    }
                }
                m_destination = destGroup;
                return true;
            }
            return false;
        });
    }

    public Optional<SelectedDestination> getSelectedDestination() {
        return m_destination != null ? Optional.of(m_destination) : Optional.empty();
    }

    public String getTextInput() {
        return m_dialog.getNameFieldValue();
    }

    /**
     * Displays a modal dialog for picking a target folder or space.
     *
     * @param spaceProviders space providers to allow selections from
     * @param operation type of operation, determines text in the dialog
     * @return destination if selected, {@link Optional#empty()} otherwise
     */
    static Optional<SelectedDestination> promptForTargetLocation(final String[] spaceProviders,
        final Operation operation) {
        final var workbench = PlatformUI.getWorkbench();
        return workbench.getDisplay().syncCall(() -> { // NOSONAR
            final var shell = workbench.getModalDialogShellProvider().getShell();
            final var destinationDialog = new DestinationSelectionDialog(shell, spaceProviders, null,
                "Destination", operation.m_title, "Select the destination folder.",
                "Select the destination folder to which the selected element will be " + operation.m_desc);
            destinationDialog.setShowExcludeDataOption(operation == Operation.UPLOAD);
            while (destinationDialog.open() == Window.OK) {
                final var destGroup = destinationDialog.getSelectedDestination();
                final var destGroupInfo = destGroup.getDestination().fetchInfo();
                if (!destGroupInfo.isWriteable()) {
                    if (MessageDialog.openConfirm(shell, "Not writable",
                            "The selected folder is not writable.\n\nChoose a new location.")) {
                        continue;
                    } else {
                        // user has chosen to abort
                        return Optional.empty();
                    }
                }
                return Optional.of(destGroup);
            }
            return Optional.empty();
        });
    }
}
