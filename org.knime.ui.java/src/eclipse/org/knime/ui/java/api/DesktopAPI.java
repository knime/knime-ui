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
import java.util.concurrent.CompletableFuture;
import java.util.function.BiConsumer;
import java.util.function.Consumer;

import org.eclipse.swt.widgets.Display;
import org.knime.core.node.NodeLogger;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.gateway.impl.webui.AppStateUpdater;
import org.knime.gateway.impl.webui.NodeRepository;
import org.knime.gateway.impl.webui.ToastService;
import org.knime.gateway.impl.webui.UpdateStateProvider;
import org.knime.gateway.impl.webui.WorkflowMiddleware;
import org.knime.gateway.impl.webui.service.events.EventConsumer;
import org.knime.gateway.impl.webui.spaces.SpaceProviders;
import org.knime.gateway.impl.webui.spaces.local.LocalWorkspace;
import org.knime.ui.java.util.MostRecentlyUsedProjects;

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
        PortAPI.class, //
        ProjectAPI.class, //
        SpaceAPI.class, //
        ImportAPI.class, //
        ExportAPI.class, //
        EclipseUIAPI.class, //
        ChatAPI.class, //
        ComponentAPI.class, //
        EquoChromiumAPI.class, //
        HttpProxyAPI.class //
    );

    // API endpoints which are only being registered when the AP is run for testing purposes.
    private static final List<Class<?>> CONTRIBUTING_CLASSES_FOR_TESTING = List.of( //
        TestingAPI.class //
    );

    private static record APIMethod(Method method, boolean runInUIThread) {
    }

    private static final List<APIMethod> METHODS = collectMethods();

    private static Map<Class<?>, Object> dependencies;

    private static final String DESKTOP_API_FUNCTION_RESULT_EVENT_NAME = "DesktopAPIFunctionResultEvent";

    /**
     * ObjectMapper to create event objects that can be sent to the UI.
     */
    public static final ObjectMapper MAPPER = new ObjectMapper();

    private DesktopAPI() {
        // utility
    }

    /**
     * Iterates through the available desktop API functions.
     *
     * @param functionCaller a consumer that receives the function name and the function itself and takes care of
     *            calling them. The function will throw a {@link IllegalStateException} if the function-call fails for
     *            unexpected reasons.
     */
    public static void forEachAPIFunction(final BiConsumer<String, Consumer<Object[]>> functionCaller) {
        for (APIMethod apiMethod : METHODS) {
            var method = apiMethod.method;
            var name = method.getName();
            functionCaller.accept(name, args -> { // NOSONAR
                Runnable invokeMethod = () -> {
                    var event = MAPPER.createObjectNode().put("name", name);
                    try {
                        var res = invokeMethod(method, args);
                        event.set("result", MAPPER.valueToTree(res));
                    } catch (Throwable e) {
                        event.put("error", e.getMessage());
                    }
                    var eventConsumer = getDeps(EventConsumer.class);
                    if (eventConsumer != null) {
                        // eventConsumer is null in case of the 'switchToJavaUI' function
                        // because it clears all the deps when invoked
                        eventConsumer.accept(DESKTOP_API_FUNCTION_RESULT_EVENT_NAME, event);
                    }
                };
                if (apiMethod.runInUIThread) {
                    Display.getDefault().asyncExec(invokeMethod);
                } else {
                    CompletableFuture.runAsync(invokeMethod);
                }
            });
        }
    }

    @SuppressWarnings("java:S112")  // generic exception reasonable here
    private static Object invokeMethod(final Method m, final Object[] args) throws Throwable {
        var name = m.getName();
        try {
            Object res;
            if (m.getParameterCount() == 1 && m.getParameterTypes()[0].equals(Object[].class)) {
                res = m.invoke(null, new Object[]{args}); // NOSONAR
            } else {
                res = m.invoke(null, args);
            }
            LOGGER.debug("Desktop API function successfully called: " + name);
            return res;
        } catch (IllegalAccessException | IllegalArgumentException | InvocationTargetException ex) {
            throw ex instanceof InvocationTargetException invocationTargetException
                ? invocationTargetException.getTargetException() : ex;
        }
    }

    /**
     * Initializes the desktop API with dependencies for some desktop API functions.
     *
     * @param workflowProjectManager
     * @param appStateUpdater
     * @param spaceProviders
     * @param updateStateProvider optional, can be {@code null}
     * @param eventConsumer
     * @param workflowMiddleware
     * @param toastService
     * @param nodeRepo
     * @param mruProjects
     * @param localWorkspace
     * @throws IllegalStateException if the dependencies have been already injected
     */
    public static void injectDependencies(final ProjectManager workflowProjectManager,
        final AppStateUpdater appStateUpdater, final SpaceProviders spaceProviders,
        final UpdateStateProvider updateStateProvider, final EventConsumer eventConsumer,
        final WorkflowMiddleware workflowMiddleware, final ToastService toastService, final NodeRepository nodeRepo,
        final MostRecentlyUsedProjects mruProjects, final LocalWorkspace localWorkspace) {
        if (areDependenciesInjected()) {
            throw new IllegalStateException("Desktop API dependencies are already injected");
        }
        dependencies = new HashMap<>();
        dependencies.put(ProjectManager.class, workflowProjectManager);
        dependencies.put(AppStateUpdater.class, appStateUpdater);
        dependencies.put(SpaceProviders.class, spaceProviders);
        dependencies.put(EventConsumer.class, eventConsumer);
        dependencies.put(WorkflowMiddleware.class, workflowMiddleware);
        dependencies.put(ToastService.class, toastService);
        dependencies.put(NodeRepository.class, nodeRepo);
        if (updateStateProvider != null) {
            dependencies.put(UpdateStateProvider.class, updateStateProvider);
        }
        dependencies.put(MostRecentlyUsedProjects.class, mruProjects);
        dependencies.put(LocalWorkspace.class, localWorkspace);
    }

    /**
     * @return whether dependencies already have been injected via
     *         {@link #injectDependencies(ProjectManager, AppStateUpdater, SpaceProviders, UpdateStateProvider, EventConsumer)}
     */
    public static boolean areDependenciesInjected() {
        return dependencies != null && !dependencies.isEmpty();
    }

    /**
     * Cleans-up the injected dependencies in case the desktop API is not used anymore.
     */
    public static void disposeDependencies() {
        dependencies = null;
    }

    private static List<APIMethod> collectMethods() {
        var res = new ArrayList<APIMethod>();
        collectMethods(CONTRIBUTING_CLASSES, res);
        if (isRemoteDebuggingPortSet()) {
            collectMethods(CONTRIBUTING_CLASSES_FOR_TESTING, res);
        }
        return res;
    }

    private static void collectMethods(final List<Class<?>> classes, final List<APIMethod> res) {
        for (Class<?> clazz : classes) {
            for (Method m : clazz.getDeclaredMethods()) {
                if (m.isAnnotationPresent(API.class)) {
                    var apiAnno = m.getAnnotation(API.class);
                    res.add(new APIMethod(m, apiAnno.runInUIThread()));
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
        return dependencies == null ? null : (T)dependencies.get(clazz);
    }

}
