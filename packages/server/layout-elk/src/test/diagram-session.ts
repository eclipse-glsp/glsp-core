/********************************************************************************
 * Copyright (c) 2026 EclipseSource and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/
import {
    Action,
    ActionMessage,
    ClientSessionFactory,
    CommandStack,
    DiagramModule,
    EndProgressAction,
    GGraph,
    GLSPClientProxy,
    LayoutEngine,
    LogLevel,
    Logger,
    MessageAction,
    ModelState,
    RequestModelAction,
    ServerModule,
    SetDirtyStateAction,
    SetMarkersAction,
    SetModelAction,
    StartProgressAction,
    StatusAction,
    UpdateModelAction,
    UpdateProgressAction
} from '@eclipse-glsp/server';
import { createAppModule, defaultLaunchOptions } from '@eclipse-glsp/server/node';
import { Container, ContainerModule, interfaces } from 'inversify';
import { ElkLayoutModule } from '../di.config';
import { FlowDiagramModule, FlowDiagramOptions, FlowModelState, FlowSeed, FlowSourceModel } from './flow-diagram';
import { GModelSeed, TestGModelDiagramModule } from './gmodel-diagram';

/** The actions a GLSP client handles in response to a model update. */
const CLIENT_ACTION_KINDS = [
    SetModelAction.KIND,
    UpdateModelAction.KIND,
    SetDirtyStateAction.KIND,
    SetMarkersAction.KIND,
    StatusAction.KIND,
    MessageAction.KIND,
    StartProgressAction.KIND,
    UpdateProgressAction.KIND,
    EndProgressAction.KIND
];

class RecordingClientProxy implements GLSPClientProxy {
    readonly received: Action[] = [];

    process(message: ActionMessage): void {
        this.received.push(message.action);
    }
}

class RecordingLogger extends Logger {
    logLevel = LogLevel.debug;
    caller?: string;
    readonly infos: string[] = [];
    readonly warnings: string[] = [];

    info(message: string): void {
        this.infos.push(message);
    }

    warn(message: string): void {
        this.warnings.push(message);
    }

    error(): void {}

    debug(): void {}
}

/** A real client session of a diagram language with ELK as its layout engine. */
export interface DiagramSession<M extends ModelState = ModelState> {
    /** Dispatches an action through the session's action dispatcher and waits until it has been handled. */
    dispatch(action: Action): Promise<void>;
    readonly modelState: M;
    readonly commandStack: CommandStack;
    /** The messages of all infos logged in the session. */
    readonly infos: string[];
    /** The messages of all warnings logged in the session. */
    readonly warnings: string[];
}

export interface DiagramSessionOptions {
    /** Replaces the ELK layout engine of the session. */
    layoutEngine?: interfaces.Newable<LayoutEngine>;
}

/**
 * Creates a client session for the given diagram module with ELK as its layout engine and requests the model, the same
 * way a GLSP server does when a client opens a diagram.
 */
async function createDiagramSession<M extends ModelState>(
    diagramModule: DiagramModule,
    seedModule: ContainerModule,
    options: DiagramSessionOptions
): Promise<DiagramSession<M>> {
    const serverModule = new ServerModule().configureDiagramModule(
        diagramModule,
        new ElkLayoutModule({ algorithms: ['layered'] }),
        seedModule,
        new ContainerModule((_bind, _unbind, _isBound, rebind) => {
            if (options.layoutEngine) {
                rebind(LayoutEngine).to(options.layoutEngine).inSingletonScope();
            }
        })
    );
    const container = new Container();
    container.load(
        createAppModule({ ...defaultLaunchOptions, consoleLog: false }),
        serverModule,
        new ContainerModule(bind => bind(GLSPClientProxy).toConstantValue(new RecordingClientProxy()))
    );
    const logger = new RecordingLogger();
    container.rebind(Logger).toConstantValue(logger);
    const session = container.get<ClientSessionFactory>(ClientSessionFactory).create({
        clientSessionId: 'test-session',
        diagramType: diagramModule.diagramType,
        clientActionKinds: CLIENT_ACTION_KINDS
    });
    await session.actionDispatcher.dispatch(RequestModelAction.create());
    return {
        dispatch: action => session.actionDispatcher.dispatch(action),
        modelState: session.container.get<M>(ModelState),
        commandStack: session.container.get<CommandStack>(CommandStack),
        infos: logger.infos,
        warnings: logger.warnings
    };
}

/** Creates a session of the flow diagram language, whose custom source model is a copy of the given seed. */
export function createFlowDiagramSession(
    seed: FlowSourceModel,
    options: FlowDiagramOptions & DiagramSessionOptions = {}
): Promise<DiagramSession<FlowModelState>> {
    return createDiagramSession(new FlowDiagramModule(options), new ContainerModule(bind => bind(FlowSeed).toConstantValue(seed)), options);
}

/** Creates a session of a GModel language, whose source model is a copy of the given graph. */
export function createGModelDiagramSession(seed: GGraph, options: DiagramSessionOptions = {}): Promise<DiagramSession> {
    return createDiagramSession(
        new TestGModelDiagramModule(),
        new ContainerModule(bind => bind(GModelSeed).toConstantValue(seed)),
        options
    );
}
