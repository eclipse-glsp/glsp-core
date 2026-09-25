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
import { GLSPCapability } from '@eclipse-glsp/protocol';
import { BindingContext } from '@eclipse-glsp/protocol/lib/di';
import { ActionHandlerConstructor } from '../../actions/action-handler';
import { InstanceMultiBinding } from '../../di/multi-binding';
import { CapabilityFeatureModule } from '../../di/capability-feature-module';
import { OperationHandlerConstructor } from '../../operations/operation-handler';
import { OperationsModule } from '../../operations/operations-module';
import { RequestClipboardDataActionHandler } from './request-clipboard-data-action-handler';

/**
 * Feature module for cut, copy & paste. Reported as {@link GLSPCapability.Clipboard} capability.
 *
 * Abstract because the operation handlers depend on the source model: to support this feature, add a subclass that
 * implements the `bindXxxOperationHandler()` methods (e.g. the GModel variant `GModelClipboardModule`).
 *
 * Provides:
 * - {@link RequestClipboardDataActionHandler}
 */
export abstract class ClipboardModule extends CapabilityFeatureModule {
    static readonly KEY = GLSPCapability.Clipboard;

    override get featureKey(): GLSPCapability {
        return ClipboardModule.KEY;
    }

    override get requiredFeatures(): string[] {
        return [OperationsModule.KEY];
    }

    protected registerBindings(context: BindingContext): void {
        this.configureMultiBinding(new InstanceMultiBinding<ActionHandlerConstructor>(ActionHandlerConstructor), binding =>
            this.configureActionHandlers(binding)
        );
        this.configureMultiBinding(new InstanceMultiBinding<OperationHandlerConstructor>(OperationHandlerConstructor), binding =>
            this.configureOperationHandlers(binding)
        );
    }

    protected configureActionHandlers(binding: InstanceMultiBinding<ActionHandlerConstructor>): void {
        binding.add(RequestClipboardDataActionHandler);
    }

    protected configureOperationHandlers(binding: InstanceMultiBinding<OperationHandlerConstructor>): void {
        binding.add(this.bindCutOperationHandler());
        binding.add(this.bindPasteOperationHandler());
    }

    /** Returns the source-model-specific handler for `CutOperation`s. */
    protected abstract bindCutOperationHandler(): OperationHandlerConstructor;

    /** Returns the source-model-specific handler for `PasteOperation`s. */
    protected abstract bindPasteOperationHandler(): OperationHandlerConstructor;
}
