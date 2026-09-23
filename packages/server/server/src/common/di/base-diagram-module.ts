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
import { BindingContext } from '@eclipse-glsp/protocol/lib/di';
import { ActionDispatcher, DefaultActionDispatcher } from '../actions/action-dispatcher';
import { ActionHandlerConstructor, ActionHandlerFactory } from '../actions/action-handler';
import { ActionHandlerRegistry, ActionHandlerRegistryInitializer } from '../actions/action-handler-registry';
import { ClientActionForwarder } from '../actions/client-action-handler';
import { CapabilityContribution } from '../capabilities/capability-contribution';
import { DefaultSessionCapabilityProvider, SessionCapabilityProvider } from '../capabilities/session-capability-provider';
import { CommandStack, DefaultCommandStack } from '../command/command-stack';
import { BindingTarget, applyBindingTarget } from './binding-target';
import { InstanceMultiBinding, MultiBinding } from './multi-binding';
import { ServerFeatureModule } from './server-feature-module';
import { ClientId, DiagramType } from './service-identifiers';
import { ClientSessionInitializer } from '../session/client-session-initializer';
import { DefaultProgressService, ProgressService } from '../progress/progress-service';

/**
 * Core module of every client session container. Always loaded first (see `createDiagramSetup`).
 *
 * Provides the session infrastructure that is independent of the diagram language:
 * - {@link DiagramType}, {@link ClientId} (fallback)
 * - {@link ClientActionForwarder}, {@link ActionDispatcher}
 * - {@link ActionHandlerConstructor} contributions (empty), {@link ActionHandlerFactory}, {@link ActionHandlerRegistry}
 * - {@link ClientSessionInitializer}s ({@link ActionHandlerRegistryInitializer})
 * - {@link CommandStack}, {@link ProgressService}
 * - {@link SessionCapabilityProvider}, {@link CapabilityContribution}s (empty)
 */
export class BaseDiagramModule extends ServerFeatureModule {
    static readonly KEY = 'glsp.base';
    static readonly FALLBACK_CLIENT_ID = 'FallbackClientId';

    constructor(readonly diagramType: string) {
        super();
    }

    override get featureKey(): string {
        return BaseDiagramModule.KEY;
    }

    protected registerBindings(context: BindingContext): void {
        applyBindingTarget(context, DiagramType, this.bindDiagramType());
        applyBindingTarget(context, ClientId, this.bindClientId());
        applyBindingTarget(context, ClientActionForwarder, this.bindClientActionForwarder()).inSingletonScope();

        applyBindingTarget(context, ActionDispatcher, this.bindActionDispatcher()).inSingletonScope();
        this.configureMultiBinding(new InstanceMultiBinding<ActionHandlerConstructor>(ActionHandlerConstructor), binding =>
            this.configureActionHandlers(binding)
        );
        applyBindingTarget(context, ActionHandlerFactory, this.bindActionHandlerFactory());
        applyBindingTarget(context, ActionHandlerRegistry, this.bindActionHandlerRegistry()).inSingletonScope();
        applyBindingTarget(context, CommandStack, this.bindCommandStack()).inSingletonScope();

        this.configureMultiBinding(new MultiBinding<ClientSessionInitializer>(ClientSessionInitializer), binding =>
            this.configureClientSessionInitializers(binding)
        );
        applyBindingTarget(context, ProgressService, this.bindProgressService()).inSingletonScope();

        applyBindingTarget(context, SessionCapabilityProvider, this.bindSessionCapabilityProvider()).inSingletonScope();
        this.configureMultiBinding(new MultiBinding<CapabilityContribution>(CapabilityContribution), binding =>
            this.configureCapabilityContributions(binding)
        );
    }

    protected bindDiagramType(): BindingTarget<string> {
        return { constantValue: this.diagramType };
    }

    protected bindClientId(): BindingTarget<string> {
        return { constantValue: BaseDiagramModule.FALLBACK_CLIENT_ID };
    }

    protected bindClientActionForwarder(): BindingTarget<ClientActionForwarder> {
        return ClientActionForwarder;
    }

    protected bindActionDispatcher(): BindingTarget<ActionDispatcher> {
        return DefaultActionDispatcher;
    }

    protected configureActionHandlers(binding: InstanceMultiBinding<ActionHandlerConstructor>): void {
        // empty as default
    }

    protected bindActionHandlerFactory(): BindingTarget<ActionHandlerFactory> {
        return { dynamicValue: ctx => constructor => ctx.container.resolve(constructor) };
    }

    protected bindActionHandlerRegistry(): BindingTarget<ActionHandlerRegistry> {
        return ActionHandlerRegistry;
    }

    protected bindCommandStack(): BindingTarget<CommandStack> {
        return DefaultCommandStack;
    }

    protected configureClientSessionInitializers(binding: MultiBinding<ClientSessionInitializer>): void {
        binding.add(ActionHandlerRegistryInitializer);
    }

    protected bindProgressService(): BindingTarget<ProgressService> {
        return DefaultProgressService;
    }

    protected bindSessionCapabilityProvider(): BindingTarget<SessionCapabilityProvider> {
        return DefaultSessionCapabilityProvider;
    }

    /**
     * Hook to contribute additional (e.g. custom, dot-namespaced) capabilities.
     * Feature-specific contributions are bound by the respective feature modules.
     */
    protected configureCapabilityContributions(binding: MultiBinding<CapabilityContribution>): void {
        // empty as default
    }
}
