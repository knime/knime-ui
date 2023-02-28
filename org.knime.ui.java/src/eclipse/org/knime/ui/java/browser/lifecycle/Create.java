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
 *   Jan 16, 2023 (hornm): created
 */
package org.knime.ui.java.browser.lifecycle;

import java.io.ByteArrayInputStream;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.Optional;
import java.util.stream.Collectors;

import org.apache.commons.io.IOUtils;
import org.eclipse.core.runtime.FileLocator;
import org.eclipse.core.runtime.IPath;
import org.eclipse.core.runtime.Platform;
import org.eclipse.ui.IEditorReference;
import org.eclipse.ui.PlatformUI;
import org.knime.core.node.KNIMEConstants;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.workflow.NodeTimer;
import org.knime.core.util.EclipseUtil;
import org.knime.core.util.HubStatistics;
import org.knime.js.cef.middleware.CEFMiddlewareService;
import org.knime.js.cef.middleware.CEFMiddlewareService.PageResourceHandler;
import org.knime.ui.java.api.DesktopAPI;
import org.knime.ui.java.browser.KnimeBrowserFunction;
import org.knime.ui.java.browser.KnimeBrowserView;
import org.knime.ui.java.prefs.KnimeUIPreferences;
import org.knime.ui.java.util.PerspectiveUtil;
import org.osgi.framework.Bundle;
import org.osgi.framework.FrameworkUtil;

import com.equo.chromium.swt.Browser;

/**
 * The 'create' lifecycle-phase for the KNIME-UI. Only called exactly once at the beginning.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
final class Create {

    private static final String BASE_PATH = "dist";

    private Create() {
        //
    }

    static void run(final Browser browser) {
        // In order for the mechanism to block external requests to work (see CEFPlugin-class)
        // the resource handlers must be registered before the browser initialization
        initializeResourceHandlers();
        DesktopAPI.forEachAPIFunction((name, function) -> new KnimeBrowserFunction(browser, name, function));

        if (!PerspectiveUtil.isClassicPerspectiveLoaded()) {
            var page = PlatformUI.getWorkbench().getActiveWorkbenchWindow().getActivePage();
            if (page != null) {
                var refs = page.getEditorReferences();
                if (refs.length > 0) {
                    NodeLogger.getLogger(LifeCycle.class).error("There are open eclipse editors which is not expected: "
                        + Arrays.stream(refs).map(IEditorReference::getName).collect(Collectors.joining(",")));
                }
            }
            callWelcomeAPEndpoint();
        }

        // initialize the node timer with the currently active 'perspective'
        NodeTimer.GLOBAL_TIMER.setLastUsedPerspective(KnimeUIPreferences.getSelectedNodeCollection());
    }

    private static void callWelcomeAPEndpoint() {
        if (EclipseUtil.isRunFromSDK()) {
            return;
        }
        try {
            final String baseUrl = "https://www.knime.com/welcome-ap";
            StringBuilder builder = new StringBuilder(baseUrl);
            builder.append("?knid=" + KNIMEConstants.getKNID());
            builder.append("&version=" + KNIMEConstants.VERSION);
            builder.append("&os=" + Platform.getOS());
            builder.append("&osname=" + KNIMEConstants.getOSVariant());
            builder.append("&arch=" + Platform.getOSArch());
            builder.append("&ui=modern");

            // details
            builder.append("&details=");
            builder.append(buildAPUsage());
            builder.append(",");
            builder.append(buildHubUsage());

            var url = new URL(builder.toString().replace(" ", "%20"));
            HttpURLConnection conn = (HttpURLConnection)url.openConnection();
            conn.setReadTimeout(5000);
            conn.setConnectTimeout(2000);
            conn.connect();

            try (var is = conn.getInputStream()) {
                IOUtils.toString(is, StandardCharsets.UTF_8);
            } finally {
                conn.disconnect();
            }
        } catch (Throwable e) { // NOSONAR
            NodeLogger.getLogger(Create.class).debug("Could not call 'welcome-AP' endpoint: " + e.getMessage(), e);
        }
    }

    private static String buildAPUsage() {
        // simple distinction between first and recurring users
        String apUsage = "apUsage:";
        if (isFreshWorkspace()) {
            apUsage += "first";
        } else {
            apUsage += "recurring";
        }
        return apUsage;
    }

    private static String buildHubUsage() {
        String hubUsage = "hubUsage:";
        Optional<ZonedDateTime> lastLogin = Optional.empty();
        Optional<ZonedDateTime> lastUpload = Optional.empty();
        try {
            lastLogin = HubStatistics.getLastLogin();
            lastUpload = HubStatistics.getLastUpload();
        } catch (Exception e) {
            NodeLogger.getLogger(Create.class).info("Hub statistics could not be fetched: " + e.getMessage(), e);
        }

        if (lastUpload.isPresent()) {
            hubUsage += "contributer";
        } else if (lastLogin.isPresent()) {
            hubUsage += "user";
        } else {
            hubUsage += "none";
        }
        return hubUsage;
    }

    private static boolean isFreshWorkspace() {
        Bundle productBundle = FrameworkUtil.getBundle(Create.class);
        IPath path = Platform.getStateLocation(productBundle);
        var workbenchStateFile =
            path.toFile().toPath().getParent().resolve("org.eclipse.e4.workbench").resolve("workbench.xmi");
        return !Files.exists(workbenchStateFile);
    }

    private static void initializeResourceHandlers() {
        CEFMiddlewareService.registerCustomResourceHandler(KnimeBrowserView.DOMAIN_NAME, urlString -> { // NOSONAR
            var path = stringToURL(urlString).getPath();
            var url = Platform.getBundle("org.knime.ui.js").getEntry(BASE_PATH + path);
            try {
                return FileLocator.toFileURL(url).openStream();
            } catch (Exception e) { // NOSONAR
                var message = "Problem loading UI resources at '" + urlString + "'. See log for details.";
                NodeLogger.getLogger(KnimeBrowserView.class).error(message, e);
                return new ByteArrayInputStream(message.getBytes(StandardCharsets.UTF_8));
            }
        });

        CEFMiddlewareService.registerPageAndPageBuilderResourceHandlers( //
            null, //
            PageResourceHandler.PORT_VIEW, //
            PageResourceHandler.NODE_VIEW, //
            PageResourceHandler.NODE_DIALOG //
        );
    }

    private static URL stringToURL(final String url) {
        try {
            return new URL(url);
        } catch (MalformedURLException e) {
            throw new IllegalArgumentException("Not a valid URL");
        }
    }

}
