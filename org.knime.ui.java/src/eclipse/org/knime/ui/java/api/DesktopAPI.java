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
 *   Jan 30, 2023 (hornm): created
 */
package org.knime.ui.java.api;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;
import java.util.function.Function;

import org.knime.core.node.NodeLogger;
import org.knime.gateway.impl.project.WorkflowProjectManager;
import org.knime.gateway.impl.service.util.EventConsumer;
import org.knime.gateway.impl.webui.AppStateUpdater;
import org.knime.gateway.impl.webui.UpdateStateProvider;
import org.knime.gateway.impl.webui.spaces.SpaceProviders;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Utility methods for the desktop API; i.e. API that is only available within the desktop AP.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public final class DesktopAPI {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(DesktopAPI.class);

    private static final String REMOTE_DEBUGGING_PORT_PROP = "chromium.remote_debugging_port";

    private static boolean isRemoteDebuggingPortSet() {
        return System.getProperty(REMOTE_DEBUGGING_PORT_PROP) != null;
    }

    private static final List<Class<?>> CONTRIBUTING_CLASSES = List.of( //
        NodeAPI.class, //
        WorkflowAPI.class, //
        SpaceAPI.class, //
        ImportAPI.class, //
        EclipseUIAPI.class, //
        UpdateAPI.class //
    );

    // API endpoints which are only being registered when the AP is run for testing purposes.
    private static final List<Class<?>> CONTRIBUTING_CLASSES_FOR_TESTING = List.of( //
        TestingAPI.class //
    );

    private static final List<Method> METHODS = collectMethods();

    private static Map<Class<?>, Object> dependencies;

    static final ObjectMapper MAPPER = new ObjectMapper();

    private DesktopAPI() {
        // utility
    }

    /**
     * Iterates through the available desktop API functions.
     *
     * @param functionConsumer a consumer that receives the function name and the function itself. The function will
     *            throw a {@link IllegalStateException} if the function-call fails for unexpected reasons.
     */
    public static void forEachAPIFunction(final BiConsumer<String, Function<Object[], Object>> functionConsumer) {
        for (Method m : METHODS) {
            var name = m.getName();
            functionConsumer.accept(name, args -> { // NOSONAR
                try {
                    Object res;
                    if (m.getParameterCount() == 1 && m.getParameterTypes()[0].equals(Object[].class)) {
                        res = m.invoke(null, new Object[]{args}); // NOSONAR
                    } else {
                        res = m.invoke(null, args);
                    }
                    LOGGER.debug("Desktop API function successfully called: " + name);
                    return res;
                } catch (IllegalAccessException | IllegalArgumentException | InvocationTargetException e) {
                    // must never happen
                    var message = "Desktop API function '" + name
                        + "' couldn't be called. Most likely an implementation problem.";
                    LOGGER.error(message, e);
                    throw new IllegalStateException(message, e);
                }
            });
        }
    }

    /**
     * Initializes the desktop API with dependencies for some desktop API functions.
     *
     * @param appStateUpdater
     * @param spaceProviders
     * @param updateStateProvider optional, can be {@code null}
     * @param eventConsumer
     */
    public static void injectDependencies(final WorkflowProjectManager workflowProjectManager, final AppStateUpdater appStateUpdater, final SpaceProviders spaceProviders,
        final UpdateStateProvider updateStateProvider, final EventConsumer eventConsumer) {
        dependencies = new HashMap<>();
        dependencies.put(WorkflowProjectManager.class, workflowProjectManager);
        dependencies.put(AppStateUpdater.class, appStateUpdater);
        dependencies.put(SpaceProviders.class, spaceProviders);
        dependencies.put(EventConsumer.class, eventConsumer);
        if (updateStateProvider != null) {
            dependencies.put(UpdateStateProvider.class, updateStateProvider);
        }
    }

    /**
     * Cleans-up the injected dependencies in case the desktop API is not used anymore.
     */
    public static void disposeDependencies() {
        dependencies = null;
    }

    private static List<Method> collectMethods() {
        var res = new ArrayList<Method>();
        collectMethods(CONTRIBUTING_CLASSES, res);
        if (isRemoteDebuggingPortSet()) {
            collectMethods(CONTRIBUTING_CLASSES_FOR_TESTING, res);
        }
        return res;
    }

    private static void collectMethods(final List<Class<?>> classes, final List<Method> res) {
        for (Class<?> clazz : classes) {
            for (Method m : clazz.getDeclaredMethods()) {
                if (m.isAnnotationPresent(API.class)) {
                    res.add(m);
                }
            }
        }
    }

    /**
     * Gives access to registered dependency-instances (see
     * {@link #injectDependencies(AppStateUpdater, SpaceProviders, UpdateStateProvider, EventConsumer)}).
     *
     * @param <T>
     * @param clazz
     * @return the dependency-instance or {@code null} if there is none for the given class
     */
    @SuppressWarnings("unchecked")
    static <T> T getDeps(final Class<T> clazz) {
        return (T)dependencies.get(clazz);
    }

}
