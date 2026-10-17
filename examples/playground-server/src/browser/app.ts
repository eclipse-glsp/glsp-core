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
import 'reflect-metadata';

import { GModelDemoDiagramModule } from '@eclipse-glsp-examples/gmodel-demo-server';
import {
    WorkflowDiagramModule,
    WorkflowLayoutConfigurator,
    WorkflowMcpDiagramModule,
    WorkflowServerModule
} from '@eclipse-glsp-examples/workflow-server/browser';
import { configureELKLayoutModule } from '@eclipse-glsp/layout-elk';
import { createAppModule, LogLevel, WorkerServerLauncher } from '@eclipse-glsp/server/browser';
import { McpWorkerBridge } from '@eclipse-glsp/server-mcp/browser';
import { Container } from 'inversify';
import { FetchModelStorage } from './fetch-model-storage';

export async function launch(_argv?: string[]): Promise<void> {
    // Bridge must be created before any await so postMessages that arrive on the next event-loop tick aren't dropped.
    const bridge = new McpWorkerBridge();

    const appContainer = new Container();
    appContainer.load(createAppModule({ logLevel: LogLevel.info }));

    const launcher = appContainer.resolve(WorkerServerLauncher);
    const elkLayoutModule = configureELKLayoutModule({
        algorithms: ['layered'],
        layoutConfigurator: WorkflowLayoutConfigurator,
        isWebWorker: true
    });

    const serverModule = new WorkflowServerModule()
        .configureDiagramModule(new WorkflowDiagramModule(() => FetchModelStorage), elkLayoutModule, new WorkflowMcpDiagramModule())
        .configureDiagramModule(new GModelDemoDiagramModule(() => FetchModelStorage));

    launcher.configure(serverModule, bridge.createServerModule());

    // Resolves only on connection close — must be the last await.
    await launcher.start({});
}

launch().catch(error => console.error('Error in playground server launcher:', error));
