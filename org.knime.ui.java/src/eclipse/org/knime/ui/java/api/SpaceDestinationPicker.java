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

import java.lang.reflect.InvocationTargetException;
import java.util.Arrays;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.core.runtime.IStatus;
import org.eclipse.core.runtime.OperationCanceledException;
import org.eclipse.core.runtime.Status;
import org.eclipse.core.runtime.jobs.Job;
import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.jface.window.Window;
import org.eclipse.ui.PlatformUI;
import org.knime.core.node.NodeLogger;
import org.knime.workbench.explorer.ExplorerMountTable;
import org.knime.workbench.explorer.filesystem.RemoteExplorerFileStore;
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
        SAVE("Save to...", "saved"),
        MOVE("Move to...", "moved"),
        COPY("Copy to...", "copied");

        private final String m_title;
        private final String m_desc;

        Operation(final String title, final String desc) {
            m_title = title;
            m_desc = desc;
        }
    }

    private final Operation m_operation;

    private final String[] m_spaceProviders;

    private String m_fileName;

    private DestinationSelectionDialog m_dialog;

    private SelectedDestination m_destination;

    public SpaceDestinationPicker(final String[] spaceProviders, final Operation operation) {
        m_spaceProviders = spaceProviders;
        m_operation = operation;
    }

    public SpaceDestinationPicker(final String[] spaceProviders, final Operation operation, final String defaultName) {
        this(spaceProviders, operation);
        m_fileName = defaultName;
    }

    private final class RefreshJob extends Job {

        private final RemoteExplorerFileStore m_store;

        private RefreshJob(final RemoteExplorerFileStore store) {
            super("Refresh remote content");
            setUser(true);
            m_store = store;
        }

        @Override
        public boolean belongsTo(final Object family) {
            return family == SpaceDestinationPicker.this;
        }

        @Override
        protected IStatus run(final IProgressMonitor monitor) {
            monitor.beginTask("Refreshing \"%s\"...".formatted(m_store.getMountID()), IProgressMonitor.UNKNOWN);
            if (monitor.isCanceled()) {
                return Status.CANCEL_STATUS;
            }
            m_store.refresh(true);
            monitor.done();
            return Status.OK_STATUS;
        }

        @Override
        protected void canceling() {
            super.canceling();
            // we need to interrupt the thread, because the store refresh does not check the progress monitor for
            // cancellation
            getThread().interrupt();
        }

    }

    /**
     * Displays a modal dialog for picking a target folder or space.
     *
     * @return true if the dialog was closed and something is selected, false otherwise or cancelled
     */
    public boolean open() { // NOSONAR accepted for now
        final var workbench = PlatformUI.getWorkbench();
        return workbench.getDisplay().syncCall(() -> { // NOSONAR

            // Workaround, especially refreshing file stores, until we have a modern picker (NXT-2842)
            // Fetchers are not active, so we need to make sure we refresh before showing the dialog
            final var mountIDs = Arrays.stream(m_spaceProviders).collect(Collectors.toSet());
            final var remotes = ExplorerMountTable.getMountedContent() //
                .values().stream() //
                // filter mounted with current space providers, to not refresh remotes that are not visible in
                // ModernUI, if any
                .filter(m -> mountIDs.contains(m.getMountID())) //
                // we don't need to refresh local and currently unconnected
                .filter(p -> p.isRemote() && p.isAuthenticated()) //
                .map(p -> p.getRootStore()) //
                .filter(RemoteExplorerFileStore.class::isInstance) //)
                .map(RemoteExplorerFileStore.class::cast) //)
                .toList();
            if (!remotes.isEmpty()) {
                // These refresh calls restart the "sleeping" Fetchers, which are not actively running in ModernUI
                for (final var remote : remotes) {
                    new RefreshJob(remote).schedule();
                }
                final var canceled = new AtomicBoolean(false);
                try {
                    workbench.getProgressService().busyCursorWhile(monitor -> { // NOSONAR complexity ok
                        try {
                            // We wait for our refresh jobs to finish.
                            // In contrast to `new RefreshJob(...).run(monitor)`, this lets us cancel individual jobs
                            // or the whole thing. For some reason, the former does not cancel jobs on "Cancel".
                            Job.getJobManager().join(this, monitor);
                        } catch (final OperationCanceledException e) { // NOSONAR we handle this exception
                            // user hit cancel, suggest jobs to cancel as well. Unfortunately, it's not possible to
                            // find the job's thread to interrupt it... :(
                            for (final var job : Job.getJobManager().find(this)) {
                                job.cancel();
                            }
                            // handle refresh cancelation as complete cancelation, i.e. not opening the picker, too
                            canceled.set(true);
                            return;
                        }
                    });
                } catch (final InvocationTargetException e) {
                    NodeLogger.getLogger(getClass())
                        .warn("Failed to refresh remote content before opening dialog – content might be stale.", e);
                } catch (final InterruptedException e) { // NOSONAR we recover from that
                    // we got interrupted while waiting for refresh, so we cancel the whole thing
                    canceled.set(true);
                }
                if (canceled.get()) {
                    // user has chosen to cancel
                    return false;
                }
            }

            final var shell = workbench.getModalDialogShellProvider().getShell();
            m_dialog = new DestinationSelectionDialog(shell, m_spaceProviders, null,
                "Destination", m_operation.m_title, "Select the destination folder.",
                "Select the destination folder to which the selected element will be " + m_operation.m_desc);
            m_dialog.setShowExcludeDataOption(m_operation == Operation.UPLOAD);
            m_dialog.setNameFieldEnabled(m_operation == Operation.SAVE);
            // take some sensible default when op is not SAVE
            m_dialog.setNameFieldDefaultValue(m_fileName);

            if (m_spaceProviders.length == 1) {
                // open the single mountpoint for the user
                m_dialog.setInitTreeLevel(2);
            }
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

    public SelectedDestination getSelectedDestination() {
        return m_destination;
    }

    public String getTextInput() {
        return m_dialog.getNameFieldValue();
    }
}
