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

import java.util.Arrays;
import java.util.Objects;
import java.util.function.BiConsumer;

import org.eclipse.core.runtime.preferences.InstanceScope;
import org.eclipse.jface.preference.IPersistentPreferenceStore;
import org.eclipse.jface.util.PropertyChangeEvent;
import org.eclipse.ui.preferences.ScopedPreferenceStore;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.workflow.NodeTimer;
import org.knime.core.webui.node.dialog.SubNodeContainerDialogFactory;
import org.knime.core.workbench.preferences.MountPointsPreferencesUtil;
import org.knime.gateway.api.webui.entity.AppStateEnt;
import org.knime.ui.java.UIPlugin;
import org.knime.ui.java.util.PerspectiveUtil;
import org.osgi.service.prefs.BackingStoreException;

/**
 * The preference of the modern UI.
 *
 * @author Benjamin Wilhelm, KNIME GmbH, Berlin, Germany
 * @author Kai Franze, KNIME GmbH, Germany
 */
public final class KnimeUIPreferences {

    private static BiConsumer<String, String> selectedNodeCollectionChangeListener;

    static final String SELECTED_NODE_COLLECTION_PREF_KEY = "selectedNodeCollection";

    private static BiConsumer<String, String> mouseWheelActionChangeListener;

    static final String MOUSE_WHEEL_ACTION_PREF_KEY = "mouseWheelAction";

    private static Runnable confirmNodeConfigChangesPrefChangeListener;

    static final String CONFIRM_NODE_CONFIG_CHANGES_PREF_KEY = "confirmNodeConfigChanges";

    static final String CONFIRM_CLOSE_PROJECTS_ON_SWITCH_PREF_KEY = "confirmCloseProjectsOnSwitch";

    static final String NODE_DIALOG_MODE_PREF_KEY = "nodeDialogMode";

    private static BiConsumer<String, String> nodeDialogModeChangeListener;

    @SuppressWarnings("restriction")
    static final String SUB_NODE_CONTAINER_UI_MODE_JS_PREF_KEY =
        SubNodeContainerDialogFactory.SUB_NODE_CONTAINER_UI_MODE_JS_PREF_KEY;

    static final String CANVAS_RENDERER_PREF_KEY = "canvasRenderer";

    private static BiConsumer<String, String> canvasRendererChangeListener;

    private static final String BUNDLE_NAME = UIPlugin.getContext().getBundle().getSymbolicName();

    static final IPersistentPreferenceStore PREF_STORE = new ScopedPreferenceStore(InstanceScope.INSTANCE, BUNDLE_NAME);

    private static Runnable explorerMountPointChangeListener;

    static {
        PREF_STORE.addPropertyChangeListener(event -> { // NOSONAR
            if (SELECTED_NODE_COLLECTION_PREF_KEY.equals(event.getProperty())) {
                updateLastUsedPerspectiveAndNotifyListener(event);
            }
            if (MOUSE_WHEEL_ACTION_PREF_KEY.equals(event.getProperty()) && mouseWheelActionChangeListener != null) {
                final var oldValue = (String)event.getOldValue();
                final var newValue = (String)event.getNewValue();
                mouseWheelActionChangeListener.accept(oldValue, newValue);
            }
            if (confirmNodeConfigChangesPrefChangeListener != null
                && CONFIRM_NODE_CONFIG_CHANGES_PREF_KEY.equals(event.getProperty())
                && !Objects.equals(event.getOldValue(), event.getNewValue())) {
                confirmNodeConfigChangesPrefChangeListener.run();
            }
            if (NODE_DIALOG_MODE_PREF_KEY.equals(event.getProperty()) && nodeDialogModeChangeListener != null) {
                final var oldValue = (String)event.getOldValue();
                final var newValue = (String)event.getNewValue();
                nodeDialogModeChangeListener.accept(oldValue, newValue);
            }
            if (CANVAS_RENDERER_PREF_KEY.equals(event.getProperty()) && canvasRendererChangeListener != null) {
                final var oldValue = (String)event.getOldValue();
                final var newValue = (String)event.getNewValue();
                canvasRendererChangeListener.accept(oldValue, newValue);
            }
        });

        MountPointsPreferencesUtil.addMountSettingsSavedListener(() -> {
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

    /** If the desired mouse wheel action is scrolling */
    public static final String MOUSE_WHEEL_ACTION_SCROLL = "scroll";

    /** If the desired mouse wheel action is zooming */
    public static final String MOUSE_WHEEL_ACTION_ZOOM = "zoom";

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
     * @return whether to always confirm node configuration changes or not
     */
    public static boolean confirmNodeConfigChanges() {
        return PREF_STORE.getBoolean(CONFIRM_NODE_CONFIG_CHANGES_PREF_KEY);
    }

    /**
     * @param confirmNodeConfigChanges whether to always confirm node configuration changes or not
     */
    public static void confirmNodeConfigChanges(final boolean confirmNodeConfigChanges) {
        PREF_STORE.setValue(CONFIRM_NODE_CONFIG_CHANGES_PREF_KEY, confirmNodeConfigChanges);
        savePreferenceChanges();
    }

    /**
     * Changes listener for the {@link #confirmNodeConfigChanges()} preference.
     *
     * @param listener
     */
    public static void setConfirmNodeConfigChangesPrefChangeListener(final Runnable listener) {
        confirmNodeConfigChangesPrefChangeListener = listener;
    }

    /**
     * @return Whether to always confirm closing projects on perspective switch or not
     */
    public static boolean confirmCloseProjectsOnSwitch() {
        return PREF_STORE.getBoolean(CONFIRM_CLOSE_PROJECTS_ON_SWITCH_PREF_KEY);
    }

    /**
     * @param confirmCloseProjectsOnSwitch Whether to always confirm closing projects on perspective switch or not
     */
    public static void confirmCloseProjectsOnSwitch(final boolean confirmCloseProjectsOnSwitch) {
        PREF_STORE.setValue(CONFIRM_CLOSE_PROJECTS_ON_SWITCH_PREF_KEY, confirmCloseProjectsOnSwitch);
        savePreferenceChanges();
    }

    /** If the desired mouse wheel action is scrolling */
    public static final String NODE_DIALOG_MODE_DETACHED = "detached";

    /** If the desired mouse wheel action is zooming */
    public static final String NODE_DIALOG_MODE_EMBEDDED = "embedded";

    /**
     * @return which mode to use for Node Dialogs.
     */
    public static String getNodeDialogMode() {
        return PREF_STORE.getString(NODE_DIALOG_MODE_PREF_KEY);
    }

    /**
     * Set a listener that is called whenever the node configuration dialog mode changes. If a listener was set already it
     * is replaced.
     *
     * @param listener the listener that is called with the old value and the new value. <code>null</code> is allowed.
     */
    public static void setNodeDialogModeChangeListener(final BiConsumer<String, String> listener) {
        nodeDialogModeChangeListener = listener;
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
     * -
     * @return -
     */
    public static AppStateEnt.CanvasRendererEnum getCanvasRenderer() {
        var saved = PREF_STORE.getString(CANVAS_RENDERER_PREF_KEY);
        return Arrays.stream(AppStateEnt.CanvasRendererEnum.values()) //
                .filter(r -> r.toString().equals(saved)) //
                .findFirst() //
                .orElse(AppStateEnt.CanvasRendererEnum.SVG); //
    }

    /**
     * -
     * @param listener -
     */
    public static void setCanvasRendererChangeListener(final BiConsumer<String, String> listener) {
        canvasRendererChangeListener = listener;
    }

    /**
     * Removes all the set listeners.
     */
    public static void unsetAllListeners() {
        selectedNodeCollectionChangeListener = null;
        mouseWheelActionChangeListener = null;
        explorerMountPointChangeListener = null;
    }

    /**
     * Persists all preference changes if there are any
     */
    private static void savePreferenceChanges() {
        try {
            InstanceScope.INSTANCE.getNode(UIPlugin.getContext().getBundle().getSymbolicName()).flush();
        } catch (BackingStoreException e) {
            NodeLogger.getLogger(KnimeUIPreferences.class).error("Could not persist preference changes", e);
        }
    }
}
