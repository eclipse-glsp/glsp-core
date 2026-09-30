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
import { GLSPCapability, LayoutCapabilityOptions, SessionCapabilities } from '@eclipse-glsp/protocol';
import { BindingContext } from '@eclipse-glsp/protocol/lib/di';
import { inject, injectable } from 'inversify';
import { CapabilityContribution } from '../../capabilities/capability-contribution';
import { DiagramConfiguration, ServerLayoutKind } from '../../diagram/diagram-configuration';
import { BindingTarget, applyOptionalBindingTarget } from '../../di/binding-target';
import { InstanceMultiBinding } from '../../di/multi-binding';
import { CapabilityFeatureModule } from '../../di/capability-feature-module';
import { OperationHandlerConstructor } from '../../operations/operation-handler';
import { OperationsModule } from '../../operations/operations-module';
import { LayoutEngine } from './layout-engine';
import { LayoutOperationHandler } from './layout-operation-handler';
import { SourceModelModule } from '../../model/source-model-module';

/**
 * Reports the {@link GLSPCapability.Layout} capability with the layout options of the {@link DiagramConfiguration}.
 */
@injectable()
export class LayoutCapabilityContribution implements CapabilityContribution {
    @inject(DiagramConfiguration)
    protected diagramConfiguration: DiagramConfiguration;

    contribute(): Partial<SessionCapabilities> {
        return {
            [GLSPCapability.Layout]: {
                kind: this.toLayoutKind(this.diagramConfiguration.layoutKind),
                needsClientLayout: this.diagramConfiguration.needsClientLayout,
                animatedUpdate: this.diagramConfiguration.animatedUpdate
            }
        };
    }

    protected toLayoutKind(layoutKind: ServerLayoutKind): LayoutCapabilityOptions['kind'] {
        switch (layoutKind) {
            case ServerLayoutKind.AUTOMATIC:
                return 'automatic';
            case ServerLayoutKind.MANUAL:
                return 'manual';
            default:
                return 'none';
        }
    }
}

/**
 * Feature module for layouting. Reported as {@link GLSPCapability.Layout} capability (with {@link LayoutCapabilityOptions}).
 * A layout engine (e.g. `ElkLayoutModule`) can be contributed by any module.
 *
 * The client-side layout round trip (`RequestBoundsAction`/`ComputedBoundsAction`) is part of the model loading and
 * therefore provided by the `SourceModelModule`, i.e. removing this module only disables (server-side) layout operations.
 *
 * Provides:
 * - {@link LayoutOperationHandler}
 * - {@link LayoutEngine} as optional binding
 * - {@link LayoutCapabilityContribution}
 */
export class LayoutModule extends CapabilityFeatureModule {
    static readonly KEY = GLSPCapability.Layout;

    override get featureKey(): GLSPCapability {
        return LayoutModule.KEY;
    }

    override get requiredFeatures(): string[] {
        return [OperationsModule.KEY, SourceModelModule.KEY];
    }

    protected registerBindings(context: BindingContext): void {
        applyOptionalBindingTarget(context, LayoutEngine, this.bindLayoutEngine())?.inSingletonScope();
        this.configureMultiBinding(new InstanceMultiBinding<OperationHandlerConstructor>(OperationHandlerConstructor), binding =>
            this.configureOperationHandlers(binding)
        );
        applyOptionalBindingTarget(context, CapabilityContribution, this.bindCapabilityContribution());
    }

    protected bindLayoutEngine(): BindingTarget<LayoutEngine> | undefined {
        return undefined;
    }

    protected configureOperationHandlers(binding: InstanceMultiBinding<OperationHandlerConstructor>): void {
        binding.add(LayoutOperationHandler);
    }

    protected bindCapabilityContribution(): BindingTarget<CapabilityContribution> | undefined {
        return LayoutCapabilityContribution;
    }
}
