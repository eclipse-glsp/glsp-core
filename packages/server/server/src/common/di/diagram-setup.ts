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
import { UndoRedoModule } from '../features/undo-redo/undo-redo-module';
import { BaseDiagramModule } from './base-diagram-module';
import { ContextActionsModule } from '../features/context-actions/context-actions-module';
import { LayoutModule } from '../features/layout/layout-module';
import { SourceModelModule } from '../model/source-model-module';
import { NavigationModule } from '../features/navigation/navigation-module';
import { TypeHintsModule } from '../features/type-hints/type-hints-module';
import { OperationsModule } from '../operations/operations-module';
import { ServerFeatureModule } from './server-feature-module';

/**
 * The resolved module configuration of one diagram type. Used to create the client session containers of that
 * diagram type (see `ServerModule.configureDiagram`).
 */
export interface DiagramSetup {
    readonly diagramType: string;
    readonly modules: ContainerModule[];
}

/**
 * Creates the default feature modules that are usable without diagram-language-specific code. Features that require
 * such code are abstract and therefore not part of this list: to support them, add concrete subclasses (e.g.
 * `class MyChangeBoundsModule extends ChangeBoundsModule`) to the diagram setup. This applies to
 * - features whose implementation depends on the source model (change bounds, delete, label edit, clipboard,
 *   edge edit). For GModel-based diagram languages use `createGModelDiagramModules` instead, which includes the GModel
 *   implementations of these features.
 * - features that require a diagram-language-specific service without default implementation, i.e. validation
 *   (`ModelValidator`) and popups (`PopupModelFactory`).
 *
 * Order matters: modules are loaded in array order and required modules have to be loaded first.
 */
export function createDefaultDiagramModules(): ServerFeatureModule[] {
    return [
        new OperationsModule(),
        new UndoRedoModule(),
        new NavigationModule(),
        new ContextActionsModule(),
        new TypeHintsModule(),
        new LayoutModule()
    ];
}

/**
 * Creates the {@link DiagramSetup} for a diagram type.
 *
 * The resolved module list always starts with the {@link BaseDiagramModule} and the given source model module,
 * followed by the default modules and the given configuration (see `resolveContainerConfiguration`):
 * - `add`: appends modules,
 * - `replace`: substitutes the module with the same feature id in place (e.g. a subclass of a default module or
 *   of the {@link BaseDiagramModule} to customize core session bindings),
 * - `remove`: removes modules. Feature modules are removed by feature id, so `remove: [new NavigationModule()]` also
 *   removes a configured subclass of `NavigationModule`.
 *
 * @param sourceModel The source model module that defines the diagram language.
 * @param defaults The default feature modules, e.g. {@link createDefaultDiagramModules}.
 * @param configuration Additional module configurations.
 */
export function createDiagramSetup(
    sourceModel: SourceModelModule,
    defaults: ContainerModule[],
    ...configuration: ContainerConfiguration
): DiagramSetup {
    const modules = resolveContainerConfiguration(new BaseDiagramModule(), sourceModel, ...defaults, ...configuration);
    return { diagramType: sourceModel.diagramType, modules };
}
