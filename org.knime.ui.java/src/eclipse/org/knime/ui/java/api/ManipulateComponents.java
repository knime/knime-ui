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
 *   Sep 7, 2023 (kai): created
 */
package org.knime.ui.java.api;

import java.lang.reflect.InvocationTargetException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ExecutionException;
import java.util.function.BiPredicate;

import org.eclipse.core.runtime.Path;
import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.jface.window.Window;
import org.eclipse.swt.SWT;
import org.eclipse.swt.events.SelectionAdapter;
import org.eclipse.swt.events.SelectionEvent;
import org.eclipse.swt.widgets.Button;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Label;
import org.eclipse.swt.widgets.Shell;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.port.PortObject;
import org.knime.core.node.util.ClassUtils;
import org.knime.core.node.workflow.MetaNodeTemplateInformation.Role;
import org.knime.core.node.workflow.NodeID;
import org.knime.core.node.workflow.SubNodeContainer;
import org.knime.core.node.workflow.contextv2.HubSpaceLocationInfo;
import org.knime.core.ui.util.SWTUtilities;
import org.knime.core.util.exception.ResourceAccessException;
import org.knime.core.util.hub.HubItemVersion;
import org.knime.core.util.urlresolve.KnimeUrlResolver;
import org.knime.core.util.urlresolve.KnimeUrlResolver.IdAndPath;
import org.knime.core.util.urlresolve.KnimeUrlResolver.KnimeUrlVariant;
import org.knime.core.util.urlresolve.URLResolverUtil;
import org.knime.gateway.api.util.CoreUtil;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.NodeNotFoundException;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.NotASubWorkflowException;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.OperationNotAllowedException;
import org.knime.gateway.impl.webui.WorkflowKey;
import org.knime.gateway.impl.webui.WorkflowMiddleware;
import org.knime.gateway.impl.webui.service.commands.UpdateComponentLinkInformation;
import org.knime.ui.java.util.DesktopAPUtil;
import org.knime.workbench.editor2.actions.ChangeComponentHubVersionDialog;
import org.knime.workbench.editor2.actions.ChangeSubNodeLinkAction;
import org.knime.workbench.editor2.commands.ChangeSubNodeLinkCommand;
import org.knime.workbench.editor2.commands.UpdateMetaNodeLinkCommand;
import org.knime.workbench.explorer.ExplorerMountTable;
import org.knime.workbench.explorer.dialogs.MessageJobFilter;
import org.knime.workbench.explorer.dialogs.SpaceResourceSelectionDialog;
import org.knime.workbench.explorer.dialogs.Validator;
import org.knime.workbench.explorer.filesystem.AbstractExplorerFileInfo;
import org.knime.workbench.explorer.filesystem.AbstractExplorerFileStore;
import org.knime.workbench.explorer.filesystem.FreshFileStoreResolver;
import org.knime.workbench.explorer.view.AbstractContentProvider;
import org.knime.workbench.explorer.view.ContentObject;

/**
 * Helper methods to operate on components
 *
 * @author Manuel Hotz, KNIME GmbH, Konstanz, Germany
 * @author Kai Franze, KNIME GmbH, Germany
 */
@SuppressWarnings("restriction")
final class ManipulateComponents {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(ManipulateComponents.class);

    private ManipulateComponents() {
        // Stateless
    }

    static boolean openLinkComponentDialog(final SubNodeContainer component, final WorkflowKey wfKey)
        throws OperationNotAllowedException {
        assertLinkedComponent(component, false);

        final var validMountPoints = getAllValidMountPoint(ExplorerMountTable.getMountedContent());
        final var shell = SWTUtilities.getActiveShell();
        final var dialog = new DestinationSelectionDialog(shell, validMountPoints, null);
        if (dialog.open() != Window.OK) {
            return false; // If the operation was aborted
        }

        final var data = getDataFromComponent(dialog.m_isIncludeInputData, component, shell);
        final var target = dialog.getSelection();
        final var contentProvider = target.getContentProvider();
        return contentProvider.saveSubNodeTemplate(component, target, data);
    }

    static void openChangeComponentLinkTypeDialog(final SubNodeContainer component, final WorkflowKey wfKey)
        throws OperationNotAllowedException, NotASubWorkflowException, NodeNotFoundException {
        assertLinkedComponent(component, true);

        final var templateInfo = component.getTemplateInformation();
        final var sourceURI = templateInfo.getSourceURI();
        final var optLinkVariant = KnimeUrlVariant.getVariant(sourceURI);
        if (optLinkVariant.isEmpty()) {
            throw new OperationNotAllowedException(
                "Only the type of KNIME URLs can be changed, found '" + sourceURI + "'.");
        }

        final var linkVariant = optLinkVariant.get();
        final Map<KnimeUrlVariant, URL> changeOptions;
        try {
            final var context = CoreUtil.getProjectWorkflow(component).getContextV2();
            changeOptions = KnimeUrlResolver.getResolver(context) //
                    .changeLinkType(URLResolverUtil.toURL(sourceURI), ManipulateComponents::translateHubUrl);
            if (changeOptions.size() <= (changeOptions.containsKey(linkVariant) ? 1 : 0)) {
                // there are no other options available
                return;
            }
        } catch (ResourceAccessException e) {
            throw new IllegalStateException("Cannot compute alternative KNIME URL types for '"
                    + sourceURI + "': " + e.getMessage(), e);
        }

        final var msg = String.format("""
                This is a linked (read-only) component. Only the link type can be changed.
                Please select the new type of the link to the shared component.
                (current type: %s, current link: %s)
                The origin of the component will not be changed - just the way it is referenced.
                """, linkVariant.getDescription(), sourceURI);

        final var shell = SWTUtilities.getActiveShell();
        final var newUri = ChangeSubNodeLinkAction.showDialogAndGetUri(shell, sourceURI, linkVariant, msg,
            changeOptions);
        if (newUri.isPresent()) {
            final var workflowMiddleware = DesktopAPI.getDeps(WorkflowMiddleware.class);
            final var cmd = workflowMiddleware.getCommands();
            cmd.setCommandToExecute(getChangeSubNodeLinkCommand(component, sourceURI, newUri.get(), false));
            cmd.execute(wfKey, null);
        }
    }

    /**
     * Requests the catalog path and ID of the given URL if it references an item in a Hub catalog.
     *
     * @param url KNIME URL to translate
     * @return ID and path of the item if located on Hub, {@link Optional#empty()} otherwise
     */
    private static Optional<IdAndPath> translateHubUrl(final URL url) {
        try {
            return queryHubInfo(url.toURI()).map(loc -> new IdAndPath(loc.getWorkflowItemId(),
                Path.forPosix(loc.getWorkflowPath()).makeRelative()));
        } catch (URISyntaxException e) {
            LOGGER.debug(e);
        }
        return Optional.empty();
    }

    /**
     * This will not be callable from the FE until NXT-2038 is solved.
     */
    static void openChangeComponentHubItemVersionDialog(final SubNodeContainer component, final WorkflowKey wfKey)
        throws OperationNotAllowedException, NotASubWorkflowException, NodeNotFoundException {
        assertLinkedComponent(component, true);

        final var srcUri = component.getTemplateInformation().getSourceURI();
        if (queryHubInfo(srcUri).isEmpty()) {
            throw new OperationNotAllowedException("""
                    Changing item version is not possible, since the source of this component is not located on a
                    mountpoint that supports item versioning.
                    """);
        }

        final var shell = SWTUtilities.getActiveShell();
        final var wfm = component.getParent();
        final var dialog = new ChangeComponentHubVersionDialog(shell, component, wfm);
        if (dialog.open() != 0) {
            return;
        }

        final var currentVersion = HubItemVersion.of(srcUri).orElse(HubItemVersion.currentState());
        final var targetVersion = dialog.getSelectedVersion();
        if (Objects.equals(targetVersion, currentVersion)) {
            return;
        }

        final var newSrcUri = targetVersion.applyTo(srcUri);
        final var workflowMiddleware = DesktopAPI.getDeps(WorkflowMiddleware.class);
        final var cmd = workflowMiddleware.getCommands();
        cmd.setCommandToExecute(getChangeSubNodeLinkCommand(component, srcUri, newSrcUri, true));
        cmd.execute(wfKey, null);

        // ChangeComponentHubVersionCommand does not check canExecute of the actual update command
        cmd.setCommandToExecute(getUpdateComponentCommand(component));
        try {
            cmd.execute(wfKey, null);
        } catch (final OperationNotAllowedException | NotASubWorkflowException | NodeNotFoundException e) {
            // undo setLink if we could not update the component
            cmd.undo(wfKey);
            throw e;
        }
    }

    private static void assertLinkedComponent(final SubNodeContainer component, final boolean isLinked)
        throws OperationNotAllowedException {
        final BiPredicate<Role, Role> predicate = (left, right) -> isLinked ? (left == right) : (left != right);
        if (!predicate.test(component.getTemplateInformation().getRole(), Role.Link)) {
            throw new OperationNotAllowedException("The component is " + (isLinked ? "not " : "") + "linked.");
        }
    }

    private static String[] getAllValidMountPoint(final Map<String, AbstractContentProvider> contentProviders)
        throws OperationNotAllowedException {
        List<String> list = new ArrayList<>();
        for (final var entry : contentProviders.entrySet()) {
            final var contentProvider = entry.getValue();
            if (contentProvider.isWritable() && contentProvider.canHostComponentTemplates()) {
                list.add(entry.getKey());
            }
        }

        if (list.isEmpty()) {
            // Hard to imagine when this would happen, since `LOCAL` is always an option
            throw new OperationNotAllowedException("None of your spaces can host shared components.");
        }

        return list.toArray(new String[0]);
    }

    /**
     * @return The data of the component, can be {@code null}.
     */
    private static PortObject[] getDataFromComponent(final boolean isIncludeInputData, final SubNodeContainer component,
        final Shell shell) {
        PortObject[] data = null;
        if (isIncludeInputData) {
            //fetch input data
            final var optData = DesktopAPUtil.runWithProgress("Executing upstream nodes ...", LOGGER, mon -> {
                try {
                    return component.fetchInputDataFromParent();
                } catch (ExecutionException e) {
                    throw new InvocationTargetException(e);
                }
            });
            if (optData.isEmpty()) {
                MessageDialog.openError(shell, "Problem saving component with example input data",
                    "No data available at the component's input ports, "
                        + "most likely because the execution of upstream nodes failed.");
                return null; // NOSONAR: Can be `null` documented.
            }
            data = optData.get();
        }
        return data;
    }

    /**
     * @deprecated See NXT-2173
     */
    private static WorkflowCommandAdapter getUpdateComponentCommand(final SubNodeContainer component) {
        final var componentID = component.getID();
        final var wfm = component.getParent();
        final var updateComponentCommand = new UpdateMetaNodeLinkCommand(wfm, new NodeID[]{componentID});
        return new WorkflowCommandAdapter(updateComponentCommand, false);
    }

    private static WorkflowCommandAdapter getChangeSubNodeLinkCommand(final SubNodeContainer component,
        final URI oldLink, final URI newLink, final boolean resetLastModified) {
        final var wfm = component.getParent();
        final var oldTimestamp = resetLastModified ? component.getTemplateInformation().getTimestampInstant() : null;
        final var newTimestamp = resetLastModified ? Instant.EPOCH : null;
        final var linkCmd = new ChangeSubNodeLinkCommand(wfm, component, oldLink, oldTimestamp, newLink, newTimestamp);
        return new WorkflowCommandAdapter(linkCmd, true);
    }

    private static UpdateComponentLinkInformation
        getUpdateComponentLinkInformationCommand(final SubNodeContainer component) {
        final var componentId = component.getID();
        final var targetUri = component.getTemplateInformation().getSourceURI();
        return new UpdateComponentLinkInformation(componentId, targetUri);
    }

    /**
     * Fetches information for the given KNIME URL if it is located on a Hub mountpoint. This may issue a REST request.
     *
     * @param uri KNIME URL
     * @return location info if located on Hub, {@link Optional#empty()} otherwise
     */
    private static Optional<HubSpaceLocationInfo> queryHubInfo(final URI uri) {
        return Optional.ofNullable(uri) //
                .map(FreshFileStoreResolver::resolveAndRefreshWithProgress) //
                .flatMap(AbstractExplorerFileStore::locationInfo) //
                .flatMap(info -> ClassUtils.castOptional(HubSpaceLocationInfo.class, info));
    }

    /**
     * Dialog to select the mountpoint + destination folder. Also contains a checkbox whether to include input data.
     */
    private static final class DestinationSelectionDialog extends SpaceResourceSelectionDialog {

        private boolean m_isIncludeInputData;

        /**
         * @param parentShell
         * @param mountIDs
         * @param initialSelection
         */
        DestinationSelectionDialog(final Shell parentShell, final String[] mountIDs,
            final ContentObject initialSelection) {
            super(parentShell, mountIDs, initialSelection);
            setTitle("Save As Shared Component");
            setHeader("Select destination folder for shared component");
            setValidator(new Validator() {
                @Override
                public String validateSelectionValue(final AbstractExplorerFileStore selection, final String name) {
                    final AbstractExplorerFileInfo info = selection.fetchInfo();
                    if (info.isWorkflowGroup()) {
                        return null;
                    }
                    return "Only folders can be selected as destination.";
                }
            });
            setFilter(new MessageJobFilter());
        }

        @Override
        protected void createCustomFooterField(final Composite parent) {
            final var includeInputDataButton = new Button(parent, SWT.CHECK);
            m_isIncludeInputData = false;
            includeInputDataButton.setSelection(m_isIncludeInputData);
            includeInputDataButton.setText("Include input data with component");
            includeInputDataButton.addSelectionListener(new SelectionAdapter() {
                @Override
                public void widgetSelected(final SelectionEvent e) {
                    final var b = (Button)e.widget;
                    m_isIncludeInputData = b.getSelection();
                }
            });
            final var hint = new Label(parent, SWT.NONE);
            hint.setText("""
                    Including input data in a component facilitates their direct editing later on.
                    Please note that upstream nodes need to be executed (or will be executed on save)"
                    if input data is to be included. It is advised to keep the input data as small as possible.""");
        }
    }
}
