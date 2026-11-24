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
    BindingTarget,
    DiagramConfiguration,
    EdgeTypeHint,
    GGraph,
    GModelDiagramModule,
    GModelElementConstructor,
    GModelSerializer,
    ModelState,
    RequestModelAction,
    SaveModelAction,
    ServerLayoutKind,
    ShapeTypeHint,
    SourceModelStorage,
    getDefaultMapping
} from '@eclipse-glsp/server';
import { inject, injectable } from 'inversify';

/*
 * A minimal GModel language, i.e. a diagram language whose source model is the graphical model itself.
 */

export const GModelSeed = Symbol('GModelSeed');

@injectable()
export class TestGModelStorage implements SourceModelStorage {
    @inject(ModelState)
    protected modelState: ModelState;

    @inject(GModelSerializer)
    protected serializer: GModelSerializer;

    @inject(GModelSeed)
    protected seed: GGraph;

    loadSourceModel(_action: RequestModelAction): void {
        this.modelState.updateRoot(this.serializer.createRoot(this.serializer.createSchema(this.seed)));
    }

    saveSourceModel(_action: SaveModelAction): void {
        // the source model only lives in memory
    }
}

@injectable()
export class TestGModelDiagramConfiguration implements DiagramConfiguration {
    typeMapping: Map<string, GModelElementConstructor> = getDefaultMapping();
    shapeTypeHints: ShapeTypeHint[] = [];
    edgeTypeHints: EdgeTypeHint[] = [];
    layoutKind = ServerLayoutKind.MANUAL;
    needsClientLayout = false;
    animatedUpdate = false;
}

export class TestGModelDiagramModule extends GModelDiagramModule {
    readonly diagramType = 'gmodel-diagram';

    protected bindSourceModelStorage(): BindingTarget<SourceModelStorage> {
        return TestGModelStorage;
    }

    protected bindDiagramConfiguration(): BindingTarget<DiagramConfiguration> {
        return TestGModelDiagramConfiguration;
    }
}
