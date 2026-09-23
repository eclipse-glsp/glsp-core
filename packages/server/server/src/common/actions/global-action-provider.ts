/********************************************************************************
 * Copyright (c) 2022-2026 STMicroelectronics and others.
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
import { DiagramCapabilities, distinctAdd } from '@eclipse-glsp/protocol';
import { Container, ContainerModule, inject, injectable } from 'inversify';
import { SessionCapabilityProvider } from '../capabilities/session-capability-provider';
import { TEMPORARY_CLIENT_ID, createClientSessionModule } from '../di/client-session-module';
import { DiagramModules, InjectionContainer } from '../di/service-identifiers';
import { runClientSessionInitializers } from '../session/client-session-initializer';
import { ActionHandlerRegistry } from './action-handler-registry';

export const GlobalActionProvider = Symbol('GlobalActionProvider');

/**
 * Provides diagram-type-specific information that is available before any client session is created, i.e. the
 * handled action kinds and the static capabilities grouped by `diagramType`.
 */
export interface GlobalActionProvider {
    readonly actionKinds: Map<string, string[]>;

    /**
     * Resolves the static (connection-scoped) capabilities grouped by `diagramType`.
     */
    getDiagramCapabilities(): Promise<Map<string, DiagramCapabilities>>;
}

/**
 * Default {@link GlobalActionProvider} that creates a temporary client session container for each diagram type
 * (at server start). Loading the modules at server start also surfaces a misconfiguration (e.g. a missing required
 * feature module) early instead of when the first client session is created.
 */
@injectable()
export class DefaultGlobalActionProvider implements GlobalActionProvider {
    public readonly actionKinds: Map<string, string[]>;
    protected readonly diagramCapabilities: Map<string, Promise<DiagramCapabilities>>;

    constructor(
        @inject(InjectionContainer) serverContainer: Container,
        @inject(DiagramModules) diagramModules: Map<string, ContainerModule[]>
    ) {
        this.actionKinds = new Map();
        this.diagramCapabilities = new Map();
        diagramModules.forEach((modules, diagramType) => {
            const container = this.createDiagramContainer(serverContainer, modules);
            runClientSessionInitializers(container);
            this.loadActionKinds(diagramType, container);
            const capabilities = this.loadCapabilities(container).finally(() => container.unbindAll());
            // Prevent an unhandled rejection, the error is propagated by getDiagramCapabilities().
            capabilities.catch(() => {});
            this.diagramCapabilities.set(diagramType, capabilities);
        });
    }

    async getDiagramCapabilities(): Promise<Map<string, DiagramCapabilities>> {
        const result = new Map<string, DiagramCapabilities>();
        for (const [diagramType, capabilities] of this.diagramCapabilities) {
            result.set(diagramType, await capabilities);
        }
        return result;
    }

    createDiagramContainer(serverContainer: Container, modules: ContainerModule[]): Container {
        const container = serverContainer.createChild();
        const clientSessionModule = createClientSessionModule({
            clientId: TEMPORARY_CLIENT_ID,
            glspClient: { process: () => {} },
            clientActionKinds: []
        });
        container.load(...modules, clientSessionModule);
        return container;
    }

    loadActionKinds(diagramType: string, diagramContainer: Container): void {
        const handlerRegistry = diagramContainer.get<ActionHandlerRegistry>(ActionHandlerRegistry);
        const diagramServerActions = this.actionKinds.get(diagramType) ?? [];
        handlerRegistry.getAll().forEach(handler => distinctAdd(diagramServerActions, ...handler.actionKinds));
        this.actionKinds.set(diagramType, diagramServerActions);
    }

    /** Resolves the static capabilities (i.e. without session args) of the diagram type. */
    protected async loadCapabilities(diagramContainer: Container): Promise<DiagramCapabilities> {
        if (!diagramContainer.isBound(SessionCapabilityProvider)) {
            return {};
        }
        return diagramContainer.get<SessionCapabilityProvider>(SessionCapabilityProvider).getCapabilities();
    }
}
