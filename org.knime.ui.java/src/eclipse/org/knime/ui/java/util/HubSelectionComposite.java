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
 */
package org.knime.ui.java.util;

import java.util.List;
import java.util.Optional;
import java.util.function.Predicate;
import java.util.stream.Stream;

import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.core.runtime.IStatus;
import org.eclipse.core.runtime.Status;
import org.eclipse.core.runtime.jobs.Job;
import org.eclipse.swt.SWT;
import org.eclipse.swt.custom.StackLayout;
import org.eclipse.swt.layout.GridData;
import org.eclipse.swt.layout.GridLayout;
import org.eclipse.swt.widgets.Button;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Control;
import org.eclipse.swt.widgets.Display;
import org.eclipse.swt.widgets.Label;
import org.eclipse.swt.widgets.ProgressBar;
import org.knime.workbench.explorer.ExplorerMountTable;

import com.knime.explorer.server.internal.WorkflowHubContentProvider;

/**
 * Reusable composite for selecting a KNIME Hub mount point.
 *
 * This class provides only the UI component and does not handle persistence.
 *
 * Reusable composite for selecting a KNIME Hub mount point.
 */
public final class HubSelectionComposite extends Composite {

    private final Predicate<WorkflowHubContentProvider> m_choicesFilter;

    private final Predicate<HubInfo> m_isSelected;

    private final String m_noHubsText;

    private Button[] m_hubRadios = new Button[0];

    private final String m_selectionLabelText;

    private final String m_progressText;

    private final StackLayout m_stackLayout;

    private final Composite m_contentComposite;

    private final Composite m_stackComposite;

    private final Composite m_progressComposite;

    private final boolean m_selectFirstIfNone;

    public HubSelectionComposite( //
        final Composite parent, //
        final String selectionLabelText, //
        final String progressText, //
        final String noHubsText, //
        final Predicate<WorkflowHubContentProvider> choicesFilter, //
        final Predicate<HubInfo> isSelected) {
        this(parent, selectionLabelText, progressText, noHubsText, choicesFilter, isSelected, true);
    }

    public HubSelectionComposite( //
        final Composite parent, //
        final String selectionLabelText, //
        final String progressText, //
        final String noHubsText, //
        final Predicate<WorkflowHubContentProvider> choicesFilter, //
        final Predicate<HubInfo> isSelected, //
        final boolean selectFirstIfNone) {
        super(parent, SWT.NONE);
        m_isSelected = isSelected;
        m_choicesFilter = choicesFilter;
        m_selectionLabelText = selectionLabelText;
        m_progressText = progressText;
        m_noHubsText = noHubsText;
        m_selectFirstIfNone = selectFirstIfNone;

        setLayout(new GridLayout(1, false));
        setLayoutData(new GridData(SWT.FILL, SWT.FILL, true, true));

        m_stackComposite = new Composite(this, SWT.NONE);
        m_stackLayout = new StackLayout();
        m_stackComposite.setLayout(m_stackLayout);
        m_stackComposite.setLayoutData(new GridData(SWT.FILL, SWT.FILL, true, true));

        m_contentComposite = createComposite(m_stackComposite, 1);
        m_progressComposite = addProgressComposite(m_stackComposite, m_progressText);
        m_stackLayout.topControl = m_progressComposite;

        layout(true, true);
        adjustHeightHintToContent();
    }

    public void updateChoices() {
        var hubs = ExplorerMountTable.getMountedContent().entrySet().stream()//
            .filter(e -> e.getValue() instanceof WorkflowHubContentProvider)//
            // Remove the EXAMPLES server which is the Community hub
            .filter(e -> !"EXAMPLES".equals(e.getKey()))
            .map(e -> new HubInfo(e.getKey(), (WorkflowHubContentProvider)e.getValue())) //
            .toList();

        var job = new Job("Loading compatible KNIME Hubs...") { // how/where is this string displayed?
            @Override
            protected IStatus run(final IProgressMonitor iProgressMonitor) {
                var filteredChoices = hubs.stream().filter(hub -> m_choicesFilter.test(hub.hub())).toList();
                Display.getDefault().asyncExec(() -> {
                    updateChoicesInternal(filteredChoices, m_isSelected);
                });
                return Status.OK_STATUS;
            }
        };
        job.schedule();
    }

    public record HubInfo(String id, WorkflowHubContentProvider hub) {
    }

    private void updateChoicesInternal(final List<HubInfo> choices, final Predicate<HubInfo> isSelected) {
        for (Control child : m_contentComposite.getChildren()) {
            child.dispose();
        }

        if (choices.isEmpty()) {
            var label = new Label(m_contentComposite, SWT.NONE);
            label.setText(m_noHubsText);
            m_stackLayout.topControl = m_contentComposite;
            m_stackComposite.layout(true, true);
            layout(true, true);
            adjustHeightHintToContent();
            relayoutAncestors();
            return;
        }

        var label = new Label(m_contentComposite, SWT.NONE);
        label.setText(m_selectionLabelText);

        // pre-select first eligible entry if no setting yet
        var anySelected = choices.stream().anyMatch(isSelected);
        final Predicate<HubInfo> effectivelySelected = (!anySelected && !choices.isEmpty() && m_selectFirstIfNone) //
            ? hub -> hub.equals(choices.get(0)) //
            : isSelected; //
        m_hubRadios = choices.stream().map(hub -> {
            var radio = new Button(m_contentComposite, SWT.RADIO);
            radio.setText(hub.id());
            radio.setSelection(effectivelySelected.test(hub));
            return radio;
        }).toArray(Button[]::new);

        m_stackLayout.topControl = m_contentComposite;
        m_stackComposite.layout(true, true);
        layout(true, true);
        adjustHeightHintToContent();
        relayoutAncestors();
    }

    public void setHubSelectionEnabled(final boolean enabled) {
        setEnabled(enabled);
        Stream.of(getChildren()).forEach(control -> control.setEnabled(enabled));
        Stream.of(m_hubRadios).forEach(radio -> radio.setEnabled(enabled));
    }

    public Optional<String> getSelectedHub() {
        return Stream.of(m_hubRadios).filter(Button::getSelection).map(Button::getText).findFirst();
    }

    private static Composite addProgressComposite(final Composite stackComposite, final String progressText) {
        var progressComposite = createComposite(stackComposite, 1);
        var progressLabel = new Label(progressComposite, SWT.NONE);
        progressLabel.setText(progressText);
        var progressBar = new ProgressBar(progressComposite, SWT.INDETERMINATE);
        progressBar.setLayoutData(new GridData(SWT.FILL, SWT.CENTER, true, false));
        return progressComposite;
    }

    public static Composite createComposite(final Composite parent, final int numColumns) {
        Composite composite = new Composite(parent, SWT.NULL);
        GridLayout layout = new GridLayout();
        layout.marginWidth = 0;
        layout.marginHeight = 0;
        layout.numColumns = numColumns;
        composite.setLayout(layout);
        composite.setLayoutData(new GridData(SWT.FILL, SWT.FILL, true, false));
        return composite;
    }

    private void adjustHeightHintToContent() {
        // Let the layout compute the required height; avoid forcing a heightHint that can under-measure
        var gd = getLayoutData() instanceof GridData grid ? grid : null;
        if (gd != null) {
            gd.heightHint = SWT.DEFAULT;
            setLayoutData(gd);
        }
        var parent = getParent();
        if (parent != null) {
            parent.layout(true, true);
        }
    }

    private void relayoutAncestors() {
        Composite current = this;
        while (current != null) {
            current.layout(true, true);
            current = current.getParent();
        }
    }
}
