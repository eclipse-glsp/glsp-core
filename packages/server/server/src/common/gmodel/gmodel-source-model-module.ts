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
import { BindingTarget } from '../di/binding-target';
import { GModelFactory, GModelFactoryNullImpl } from '../model/gmodel-factory';
import { DefaultModelState, ModelState } from '../model/model-state';
import { SourceModelModule } from '../model/source-model-module';

/**
 * {@link SourceModelModule} for diagram languages that use the GModel as source model.
 *
 * Binds:
 * - {@link ModelState} to {@link DefaultModelState}
 * - {@link GModelFactory} to {@link GModelFactoryNullImpl}
 *
 * Subclasses have to provide the diagram type, the {@link SourceModelStorage} and the {@link DiagramConfiguration}.
 * Typically used with `createGModelDiagramSetup`.
 */
export abstract class GModelSourceModelModule extends SourceModelModule {
    protected override bindGModelFactory(): BindingTarget<GModelFactory> {
        return GModelFactoryNullImpl;
    }

    protected override bindModelState(): BindingTarget<ModelState> {
        return DefaultModelState;
    }
}
