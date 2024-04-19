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
import org.knime.gateway.impl.webui.featureflags.FeatureFlags;
import org.knime.workbench.ui.preferences.HorizontalLineField;

/**
 * The preference page for the modern UI.
 *
 * @author Benjamin Wilhelm, KNIME GmbH, Berlin, Germany
 */
public final class KnimeUIPreferencePage extends FieldEditorPreferencePage implements IWorkbenchPreferencePage {

    private static final String SELECTED_NODE_COLLECTION_LABEL =
        "Nodes included in the node repository and node recommendations";

    private static final String SELECTED_NODE_COLLECTION_NONE_OPTION = "All nodes";

    private static final String SELECTED_NODE_COLLECTION_STARTER_OPTION = "Starter nodes";

    private static final String MOUSE_WHEEL_ACTION_LABEL = "Mouse wheel action";

    private static final String MOUSE_WHEEL_TO_ZOOM_OPTION = "Zoom";

    private static final String MOUSE_WHEEL_TO_SCROLL_OPTION = "Scroll";

    /** Create a new preference page for the modern UI. */
    public KnimeUIPreferencePage() {
        super(GRID);
    }

    @Override
    protected void createFieldEditors() {
        final var nodeRepoFilterOptions = new String[][]{ //
            new String[]{SELECTED_NODE_COLLECTION_NONE_OPTION, KnimeUIPreferences.SELECTED_NODE_COLLECTION_NONE_ID}, //
            new String[]{SELECTED_NODE_COLLECTION_STARTER_OPTION,
                KnimeUIPreferences.SELECTED_NODE_COLLECTION_STARTER_ID} //
        };
        final var nodeRepoFilterEditor = new RadioGroupFieldEditor(KnimeUIPreferences.SELECTED_NODE_COLLECTION_PREF_KEY,
            SELECTED_NODE_COLLECTION_LABEL, 1, nodeRepoFilterOptions, getFieldEditorParent());
        addField(nodeRepoFilterEditor);

        addField(new HorizontalLineField(getFieldEditorParent()));

        final var scrollToZoomOptions = new String[][]{ //
            new String[]{MOUSE_WHEEL_TO_ZOOM_OPTION, KnimeUIPreferences.MOUSE_WHEEL_ACTION_ZOOM}, //
            new String[]{MOUSE_WHEEL_TO_SCROLL_OPTION, KnimeUIPreferences.MOUSE_WHEEL_ACTION_SCROLL} //
        };
        final var scrollToZoomEditor = new RadioGroupFieldEditor(KnimeUIPreferences.MOUSE_WHEEL_ACTION_PREF_KEY,
            MOUSE_WHEEL_ACTION_LABEL, 1, scrollToZoomOptions, getFieldEditorParent());
        addField(scrollToZoomEditor);

        if (FeatureFlags.embedDialogs()) {
            addField(new HorizontalLineField(getFieldEditorParent()));
            addField(new BooleanFieldEditor(KnimeUIPreferences.CONFIRM_NODE_CONFIG_CHANGES_PREF_KEY,
                "Always confirm node configuration changes", getFieldEditorParent()));
        }
    }

    @Override
    public void init(final IWorkbench workbench) {
        setPreferenceStore(KnimeUIPreferences.PREF_STORE);
    }
}
