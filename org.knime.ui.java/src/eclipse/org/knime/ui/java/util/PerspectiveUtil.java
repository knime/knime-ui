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
 */
package org.knime.ui.java.util;

import java.util.Optional;

import org.eclipse.e4.ui.model.application.MApplication;
import org.eclipse.e4.ui.model.application.ui.MUIElement;
import org.eclipse.e4.ui.model.application.ui.advanced.MArea;
import org.eclipse.e4.ui.model.application.ui.advanced.MPerspective;
import org.eclipse.e4.ui.model.application.ui.advanced.MPlaceholder;
import org.eclipse.e4.ui.model.application.ui.basic.MPart;
import org.eclipse.e4.ui.model.application.ui.basic.MPartSashContainer;
import org.eclipse.e4.ui.model.application.ui.basic.MPartSashContainerElement;
import org.eclipse.e4.ui.model.application.ui.basic.MWindow;
import org.eclipse.e4.ui.workbench.modeling.EModelService;
import org.eclipse.e4.ui.workbench.modeling.EPartService;
import org.eclipse.ui.PlatformUI;
import org.eclipse.ui.keys.IBindingService;
import org.knime.ui.java.browser.KnimeBrowserView;
import org.knime.workbench.editor2.WorkflowEditor;
import org.knime.workbench.explorer.ExplorerMountTable;
import org.knime.workbench.explorer.localworkspace.LocalWorkspaceContentProvider;

/**
 * Utility methods and constants to manage switching between Web UI and classic perspectives.
 *
 * @author Benjamin Moser, KNIME GmbH, Konstanz, Germany
 * @author Kai Franze, KNIME GmbH
 */
public final class PerspectiveUtil {

    private PerspectiveUtil() {
        // utility class
    }

    /**
     * System property that signals the currently active perspective.
     */
    public static final String PERSPECTIVE_SYSTEM_PROPERTY = "perspective";

    /**
     * The Web UI perspective.
     */
    public static final String WEB_UI_PERSPECTIVE_ID = "org.knime.ui.java.perspective";

    /**
     * The main perspective of the classic AP UI.
     */
    public static final String CLASSIC_PERSPECTIVE_ID = "org.knime.workbench.ui.ModellerPerspective";

    /**
     * The view part in the Web UI perspective that displays the Web UI.
     */
    public static final String BROWSER_VIEW_PART_ID = "org.knime.ui.java.browser.view";

    /**
     * The container for the browser view in the Web UI perspective.
     *
     * @see PerspectiveUtil#addSharedEditorAreaToWebUIPerspective(EModelService, MApplication)
     */
    public static final String BROWSER_VIEW_CONTAINER_ID = "org.knime.ui.java.browser.viewcontainer";

    /**
     * A shared {@link org.eclipse.e4.ui.model.application.ui.advanced.MArea} that is among the Window's sharedElements.
     * Used for sharing editors across different perspectives.
     */
    public static final String SHARED_EDITOR_AREA_ID = "org.eclipse.ui.editorss";

    /**
     * To find the {@link LocalWorkspaceContentProvider} within the list of mounted content providers
     */
    private static final String LOCAL_CONTENT_PROVIDER_ID = "LOCAL";

    private static Boolean isClassicPerspectiveLoaded;

    private static Boolean isClassicPerspectiveActive;

    /**
     * @return {@code true} if the classic perspective has been loaded (i.e. the user switched from there to the Modern
     *         UI at least once)
     */
    public static boolean isClassicPerspectiveLoaded() {
        if (isClassicPerspectiveLoaded == null) {
            return isClassicPerspectiveActive();
        }
        return isClassicPerspectiveLoaded;
    }

    /**
     * @return {@code true} if the classic perspective is currently active
     */
    public static boolean isClassicPerspectiveActive() {
        if (isClassicPerspectiveActive == null) {
            return CLASSIC_PERSPECTIVE_ID.equals(System.getProperty(PERSPECTIVE_SYSTEM_PROPERTY));
        }
        return isClassicPerspectiveActive;
    }

    /**
     * Marks the classic perspective as currently active.
     *
     * @param isActive
     */
    public static void setClassicPerspectiveActive(final boolean isActive) {
        isClassicPerspectiveActive = isActive;
        if (isActive) {
            isClassicPerspectiveLoaded = true;
            System.setProperty(PERSPECTIVE_SYSTEM_PROPERTY, CLASSIC_PERSPECTIVE_ID);
        } else {
            System.setProperty(PERSPECTIVE_SYSTEM_PROPERTY, WEB_UI_PERSPECTIVE_ID);
        }
    }

    /**
     * Marks the classic perspective as being loaded at least once (does not mean it's active).
     */
    public static void setClassicPerspectiveLoaded() {
        isClassicPerspectiveLoaded = true;
    }

    /**
     * Obtain the Web UI perspective
     *
     * @param app The application model
     * @param modelService The model service
     * @return The Web Ui perspective
     */
    public static MPerspective getWebUIPerspective(final MApplication app, final EModelService modelService) {
        MPerspective p = (MPerspective)modelService.find(WEB_UI_PERSPECTIVE_ID, app);
        if (p == null) {
            // the id of the perspective changes once switched (no idea why)
            // -> try the new id, too
            p = (MPerspective)modelService.find(WEB_UI_PERSPECTIVE_ID + ".<WebUI>", app);
        }
        return p;
    }

    /**
     * Make the given perspective visible and switch to it.
     * @param p The perspective to switch to
     * @param partService The part service to use
     * @throws IllegalStateException If the given perspective is <code>null</code>
     */
    public static void switchAndMakeVisible(final MPerspective p, final EPartService partService)
        throws IllegalStateException {
        if (p != null) {
            if (!p.isVisible()) {
                p.setVisible(true);
            }
            partService.switchPerspective(p);
        } else {
            throw new IllegalStateException("No KNIME Web UI perspective registered");
        }
    }

    /**
     * Workaround to open a {@link WorkflowEditor} from the Web UI perspective without showing the editor part.
     * Having an editor part is required for saving the workflow. See NXT-622 (save workflow) and NXT-807 (open workflow).
     * Creates a sash container of the {@link KnimeBrowserView} and a placeholder for the shared editor area. A sash
     * container is a {@link MPart} that displays two child parts side-by-side with configurable space distribution.
     * The shared editor area is the {@link MArea} with a hardcoded ID and newly opened editors will appear in that area
     * by default. The sash container is configured s.t. the part displaying the shared editor area receives zero space.
     *
     * @see org.knime.ui.java.browser.OpenProject.OpenWorkflow
     */
    public static void addSharedEditorAreaToWebUIPerspective(final EModelService modelService, final MApplication application) {
        MPerspective webUIPerspective = getWebUIPerspective(application, modelService);

        var hasSharedEditorArea = modelService.find(SHARED_EDITOR_AREA_ID, webUIPerspective) != null;
        var hasBrowserViewContainer = modelService.find(BROWSER_VIEW_CONTAINER_ID, webUIPerspective) != null;
        if (hasSharedEditorArea && hasBrowserViewContainer) {
            return;
        }

        MWindow window = application.getSelectedElement();
        var sharedEditorArea = window.getSharedElements().stream()
                .filter(muiElement -> muiElement.getElementId().equals(SHARED_EDITOR_AREA_ID))
                .findAny().orElseThrow();

        var areaPlaceholder = createPlaceholder(sharedEditorArea, modelService);
        areaPlaceholder.setCloseable(false);
        // As child of an MPartSashContainer, containerData sets the space distribution.
        areaPlaceholder.setContainerData("0");
        areaPlaceholder.setVisible(false);

        // The browser view part is expected to already be a child of this perspective.
        var browserViewPart = modelService.find(BROWSER_VIEW_PART_ID, webUIPerspective);

        var sashContainer = modelService.createModelElement(MPartSashContainer.class);
        sashContainer.setElementId(BROWSER_VIEW_CONTAINER_ID);
        // Previously a direct child of the perspective.
        sashContainer.getChildren().add((MPartSashContainerElement)browserViewPart);
        sashContainer.getChildren().add(areaPlaceholder);
        webUIPerspective.getChildren().add(sashContainer);
    }

    /**
     * Create a placeholder part for the given element. By convention, the placeholder receives the same ID as the
     * source element. This is essential e.g. when using the shared editor area in different perspectives.
     * @see org.eclipse.e4.ui.internal.workbench.PartServiceImpl#createSharedPart(String)
     * @param sourceElement The element to create a placeholder for.
     * @return The placeholder for the element.
     */
    private static MPlaceholder createPlaceholder(final MUIElement sourceElement, final EModelService modelService) {
        // Create and return a reference to the shared part
        MPlaceholder placeholder = modelService.createModelElement(MPlaceholder.class);
        placeholder.setElementId(sourceElement.getElementId());
        placeholder.setRef(sourceElement);
        placeholder.getTags().addAll(sourceElement.getTags());
        return placeholder;
    }

    /**
     * Calls {@link LocalWorkspaceContentProvider#refresh()} to keep the workflow files in sync
     */
    public static void refreshLocalWorkspaceContentProvider() {
        Optional.ofNullable(ExplorerMountTable.getMountedContent().get(LOCAL_CONTENT_PROVIDER_ID))//
            .map(LocalWorkspaceContentProvider.class::cast)//
            .ifPresent(LocalWorkspaceContentProvider::refresh);
    }

    /**
     * Enable or disable all classic UI key bindings
     *
     * @param isEnableKeyBindings Whether to enable (or disable) all the key bindings
     */
    public static void toggleClassicPerspectiveKeyBindings(final boolean isEnableKeyBindings) {
        if (PlatformUI.isWorkbenchRunning()) {
            var bindingService = PlatformUI.getWorkbench().getAdapter(IBindingService.class);
            bindingService.setKeyFilterEnabled(isEnableKeyBindings);
        }
    }

}
