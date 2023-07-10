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

import java.util.function.BiConsumer;

import org.eclipse.core.runtime.preferences.InstanceScope;
import org.eclipse.jface.preference.IPreferenceStore;
import org.eclipse.jface.util.PropertyChangeEvent;
import org.eclipse.ui.preferences.ScopedPreferenceStore;
import org.knime.core.node.workflow.NodeTimer;
import org.knime.ui.java.UIPlugin;
import org.knime.ui.java.util.PerspectiveUtil;
import org.knime.workbench.explorer.ExplorerMountTable;

/**
 * The preference of the modern UI.
 *
 * @author Benjamin Wilhelm, KNIME GmbH, Berlin, Germany
 */
public final class KnimeUIPreferences {

    private static BiConsumer<String, String> selectedNodeCollectionChangeListener;

    static final String SELECTED_NODE_COLLECTION_PREF_KEY = "selectedNodeCollection";

    private static BiConsumer<String, String> mouseWheelActionChangeListener;

    private static Runnable explorerMountPointChangeListener;

    static final String MOUSE_WHEEL_ACTION_PREF_KEY = "mouseWheelAction";

    static final IPreferenceStore PREF_STORE =
        new ScopedPreferenceStore(InstanceScope.INSTANCE, UIPlugin.getContext().getBundle().getSymbolicName());

    static {
        PREF_STORE.addPropertyChangeListener(event -> {
            if (SELECTED_NODE_COLLECTION_PREF_KEY.equals(event.getProperty())) {
                updateLastUsedPerspectiveAndNotifyListener(event);
          }
            if (MOUSE_WHEEL_ACTION_PREF_KEY.equals(event.getProperty()) && mouseWheelActionChangeListener != null) {
                final var oldValue = (String)event.getOldValue();
                final var newValue = (String)event.getNewValue();
                mouseWheelActionChangeListener.accept(oldValue, newValue);
            }
        });

        ExplorerMountTable.addPropertyChangeListener(e -> {
            if (explorerMountPointChangeListener != null) {
                explorerMountPointChangeListener.run();
            }
        });
    }

    private KnimeUIPreferences() {
        // Utility class
    }

    private static void updateLastUsedPerspectiveAndNotifyListener(final PropertyChangeEvent event) {
        final var newValue = (String)event.getNewValue();
        if (!PerspectiveUtil.isClassicPerspectiveActive()) {
            //update the last used perspective only if we are in the modern UI
            NodeTimer.GLOBAL_TIMER.setLastUsedPerspective(newValue);
        }
        if (selectedNodeCollectionChangeListener != null) {
            final var oldValue = (String)event.getOldValue();
            selectedNodeCollectionChangeListener.accept(oldValue, newValue);
        }
    }

    /** The identifier for a no node repository filter. The node repository will show all nodes. */
    public static final String SELECTED_NODE_COLLECTION_NONE_ID = "none";

    /** The identifier for the starter node collection. The node repository will only show starter nodes. */
    public static final String SELECTED_NODE_COLLECTION_STARTER_ID = "starter";

    /** If the desired mouse wheel action is scrolling */
    public static final String MOUSE_WHEEL_ACTION_SCROLL = "scroll";

    /** If the desired mouse wheel action is zooming */
    public static final String MOUSE_WHEEL_ACTION_ZOOM = "zoom";

    /**
     * @return the identifier of the selected node collection. {@link #SELECTED_NODE_COLLECTION_NONE_ID} if no
     *         collection is selected.
     */
    public static String getSelectedNodeCollection() {
        return PREF_STORE.getString(SELECTED_NODE_COLLECTION_PREF_KEY);
    }

    /**
     * Set a listener that is called whenever the selected node collection changes. If a listener was set already it is
     * replaced.
     *
     * @param listener the listener that is called with the old value and the new value. <code>null</code> is allowed.
     */
    public static void setSelectedNodeCollectionChangeListener(final BiConsumer<String, String> listener) {
        selectedNodeCollectionChangeListener = listener;
    }

    /**
     * @return which action to perform on mouse wheel. Can be {@link #MOUSE_WHEEL_ACTION_SCROLL} or
     *         {@link #MOUSE_WHEEL_ACTION_ZOOM}
     */
    public static String getMouseWheelAction() {
        return PREF_STORE.getString(MOUSE_WHEEL_ACTION_PREF_KEY);
    }

    /**
     * Set a listener that is called whenever the desired mouse wheel action changes. If a listener was set already it
     * is replaced.
     *
     * @param listener the listener that is called with the old value and the new value. <code>null</code> is allowed.
     */
    public static void setMouseWheelActionChangeListener(final BiConsumer<String, String> listener) {
        mouseWheelActionChangeListener = listener;
    }

    /**
     * Set a listener that is called whenever the mount point table changes. If a listener was set already it is
     * replaced.
     *
     * @param runnable
     */
    public static void setExplorerMointPointChangeListener(final Runnable runnable) {
        explorerMountPointChangeListener = runnable;
    }

    /**
     * Removes all the set listeners.
     */
    public static void unsetAllListeners() {
        selectedNodeCollectionChangeListener = null;
        mouseWheelActionChangeListener = null;
        explorerMountPointChangeListener = null;
    }
}
