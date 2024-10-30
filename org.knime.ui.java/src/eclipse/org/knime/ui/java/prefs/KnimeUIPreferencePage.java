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
 *   Jan 13, 2023 (benjamin): created
 */
package org.knime.ui.java.prefs;

import org.eclipse.jface.preference.BooleanFieldEditor;
import org.eclipse.jface.preference.FieldEditorPreferencePage;
import org.eclipse.jface.preference.RadioGroupFieldEditor;
import org.eclipse.ui.IWorkbench;
import org.eclipse.ui.IWorkbenchPreferencePage;

/**
 * The preference page for the Modern UI.
 *
 * @author Benjamin Wilhelm, KNIME GmbH, Berlin, Germany
 * @author Kai Franze, KNIME GmbH, Germany
 */
public final class KnimeUIPreferencePage extends FieldEditorPreferencePage implements IWorkbenchPreferencePage {
    /**
     * Create a new preference page for the Modern UI.
     */
    public KnimeUIPreferencePage() {
        super(GRID);
    }

    @Override
    protected void createFieldEditors() {
        /// Node collection
        final var nodeRepoFilterOptions = new String[][]{ //
            new String[]{"All nodes", KnimeUIPreferences.SELECTED_NODE_COLLECTION_NONE_ID}, //
            new String[]{"Starter nodes", KnimeUIPreferences.SELECTED_NODE_COLLECTION_STARTER_ID} //
        };

        final var nodeRepoFilterEditor = new RadioGroupFieldEditor(KnimeUIPreferences.SELECTED_NODE_COLLECTION_PREF_KEY,
                "Nodes included in the node repository and node recommendations", 1, nodeRepoFilterOptions, getFieldEditorParent());

        addField(nodeRepoFilterEditor);

        /// Mouse wheel actions
        final var scrollToZoomOptions = new String[][]{ //
            new String[]{"Zoom", KnimeUIPreferences.MOUSE_WHEEL_ACTION_ZOOM}, //
            new String[]{"Scroll", KnimeUIPreferences.MOUSE_WHEEL_ACTION_SCROLL} //
        };

        final var scrollToZoomEditor = new RadioGroupFieldEditor(KnimeUIPreferences.MOUSE_WHEEL_ACTION_PREF_KEY,
                "Mouse wheel action", 1, scrollToZoomOptions, getFieldEditorParent());

        addField(scrollToZoomEditor);

        /// Close project confirmation on interface switch
        final var confirmCloseProjectsOnSwitchEditor =
            new BooleanFieldEditor(KnimeUIPreferences.CONFIRM_CLOSE_PROJECTS_ON_SWITCH_PREF_KEY,
                    "Ask for confirmation to close all open projects when switching between user interfaces", getFieldEditorParent());

        addField(confirmCloseProjectsOnSwitchEditor);

        /// Confirmation for node config changes
        addField(new BooleanFieldEditor(KnimeUIPreferences.CONFIRM_NODE_CONFIG_CHANGES_PREF_KEY,
                "Always confirm node configuration changes", getFieldEditorParent()));

        /// Node configuration dialog mode
        final var nodeConfigurationModeOptions = new String[][]{ //
                new String[]{"Embedded inside application", KnimeUIPreferences.NODE_DIALOG_MODE_EMBEDDED}, //
                new String[]{"Open in new window", KnimeUIPreferences.NODE_DIALOG_MODE_DETACHED} //
        };

        final var nodeDialogModeEditor = new RadioGroupFieldEditor(KnimeUIPreferences.NODE_DIALOG_MODE_PREF_KEY,
                "Node configuration dialog mode (experimental)", 1, nodeConfigurationModeOptions, getFieldEditorParent());

        addField(nodeDialogModeEditor);
    }

    @Override
    public void init(final IWorkbench workbench) {
        setPreferenceStore(KnimeUIPreferences.PREF_STORE);
    }
}
