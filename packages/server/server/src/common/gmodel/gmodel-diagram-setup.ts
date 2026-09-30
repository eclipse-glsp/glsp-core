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
import { ContainerConfiguration, resolveContainerConfiguration } from '@eclipse-glsp/protocol/lib/di';
import { ContainerModule } from 'inversify';
import { DiagramSetup, createDefaultDiagramModules, createDiagramSetup } from '../di/diagram-setup';
import { GModelChangeBoundsModule } from './change-bounds/gmodel-change-bounds-module';
import { GModelClipboardModule } from './clipboard/gmodel-clipboard-module';
import { GModelDeleteModule } from './delete/gmodel-delete-module';
import { GModelEdgeEditModule } from './edge-edit/gmodel-edge-edit-module';
import { GModelSourceModelModule } from './gmodel-source-model-module';
import { GModelLabelEditModule } from './label-edit/gmodel-label-edit-module';

/**
 * Creates the default feature modules for diagram languages that use the GModel as source model, i.e. the
 * {@link createDefaultDiagramModules} plus the GModel implementations of the source-model-dependent features.
 */
export function createGModelDiagramModules(): ContainerModule[] {
    return resolveContainerConfiguration(...createDefaultDiagramModules(), {
        add: [
            new GModelChangeBoundsModule(),
            new GModelDeleteModule(),
            new GModelLabelEditModule(),
            new GModelClipboardModule(),
            new GModelEdgeEditModule()
        ]
    });
}

/**
 * Creates the {@link DiagramSetup} for a diagram type that uses the GModel as source model, i.e. with the
 * {@link createGModelDiagramModules} as defaults. See {@link createDiagramSetup} for details.
 */
export function createGModelDiagramSetup(sourceModel: GModelSourceModelModule, ...configuration: ContainerConfiguration): DiagramSetup {
    return createDiagramSetup(sourceModel, createGModelDiagramModules(), ...configuration);
}
