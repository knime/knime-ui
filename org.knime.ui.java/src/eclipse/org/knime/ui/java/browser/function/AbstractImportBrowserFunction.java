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
 *   Jan 23, 2023 (kai): created
 */
package org.knime.ui.java.browser.function;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.swt.SWTException;
import org.eclipse.swt.widgets.FileDialog;
import org.knime.core.node.NodeLogger;
import org.knime.core.ui.util.SWTUtilities;
import org.knime.gateway.api.webui.entity.SpaceItemEnt;
import org.knime.gateway.impl.webui.LocalWorkspace;
import org.knime.ui.java.util.LocalSpaceUtil;

import com.equo.chromium.swt.Browser;
import com.equo.chromium.swt.BrowserFunction;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Abstract browser function to import files or workflows into a given workspace.
 *
 * @author Kai Franze, KNIME GmbH
 */
public abstract class AbstractImportBrowserFunction extends BrowserFunction {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(AbstractImportBrowserFunction.class);

    private final ObjectMapper m_mapper;

    private LocalWorkspace m_localWorkspace;

    AbstractImportBrowserFunction(final Browser browser, final String name, final ObjectMapper mapper) {
        super(browser, name);
        m_mapper = mapper;
    }

    /**
     * @param arguments spaceProviderId (0), spaceId (1) and itemId (2)
     * @return A {@link SpaceItemEnt} if import succeeded, {@code null} otherwise
     */
    @Override
    public Object function(final Object[] arguments) {
        // Evaluate function arguments
        String spaceProviderId;
        String spaceId;
        String itemId;
        try {
            spaceProviderId = (String)arguments[0];
            spaceId = (String)arguments[1];
            itemId = (String)arguments[2];
        } catch (ClassCastException | ArrayIndexOutOfBoundsException e) {
            throw new IllegalArgumentException("Could not parse all of the arguments", e);
        }
        if (!spaceProviderId.equals("local") || !spaceId.equals("local")) {
            throw new SWTException("Cannot import something to non-local workspaces");
        }

        // Get file paths of files to import
        var dialog = getFileDialog();
        var baseDir = Path.of(new File(dialog.open()).toURI()).getParent();
        var fileNames = dialog.getFileNames();

        // Attempt to import files
        m_localWorkspace = LocalSpaceUtil.getLocalWorkspace();
        var importedSpaceItems = Arrays.stream(fileNames)//
            .map(baseDir::resolve)//
            .map(srcPath -> importItem(srcPath, itemId))//
            .filter(Optional::isPresent)//
            .map(Optional::get)//
            .collect(Collectors.toList());

        // Notify the user if not all files could be imported
        if (importedSpaceItems.size() < fileNames.length) {
            showWarningWithTitleAndMessage();
        }

        // Create response for the FE
        try {
            return importedSpaceItems.isEmpty() ? null : createResultObjectFromSpaceItems(importedSpaceItems, m_mapper);
        } catch (JsonProcessingException e) {
            var msg = "Failed to create result object, sorry";
            LOGGER.error(msg, e);
            throw new SWTException(msg);
        }
    }

    /**
     * @return The file dialog needed to pick something to import.
     */
    protected abstract FileDialog getFileDialog();

    /**
     * @param srcPath The source path.
     * @param destItemId The item ID of the destination folder
     * @return An optional space item entity if the import succeeded.
     */
    protected abstract Optional<SpaceItemEnt> importItem(final Path srcPath, final String destItemId);

    /**
     * Shows a warning if the import was not complete.
     */
    protected abstract void showWarningWithTitleAndMessage();

    static Optional<Path> generateUniqueSpaceItemPath(final Path workflowGroup, final String name) {
        if (Files.exists(workflowGroup.resolve(name))) { // Name collision case
            var sh = SWTUtilities.getActiveShell();
            var msg = String.format(
                "The item <%s> already exists in <%s>. Attemting to rename by (recursively) appending \"_copy\"?", name,
                workflowGroup.getFileName());
            var doProceed = MessageDialog.openQuestion(sh, "Name collision", msg);
            if (!doProceed) {
                return Optional.empty();
            }
            var lastIndexOfDot = name.lastIndexOf(".");
            var fileExtension = lastIndexOfDot > -1 ? name.substring(lastIndexOfDot) : "";
            var builder = new StringBuilder(lastIndexOfDot > -1 ? name.substring(0, lastIndexOfDot) : name);
            do {
                builder.append("_copy");
            } while (Files.exists(workflowGroup.resolve(builder.toString() + fileExtension)));
            return Optional.of(workflowGroup.resolve(builder.toString() + fileExtension));
        } else { // No name collision case
            return Optional.of(workflowGroup.resolve(name));
        }
    }

    private static String createResultObjectFromSpaceItems(final List<SpaceItemEnt> spaceItems,
        final ObjectMapper mapper) throws JsonProcessingException {
        var json = mapper.createObjectNode();
        var importedSpaceItems = json.arrayNode();
        for (var spaceItem : spaceItems) {
            importedSpaceItems.addPOJO(spaceItem);
        }
        return mapper.writeValueAsString(json.set("importedSpaceItems", importedSpaceItems));
    }

    NodeLogger getLogger() {
        return LOGGER;
    }

    LocalWorkspace getLocalWorkspace() {
        return m_localWorkspace;
    }
}
