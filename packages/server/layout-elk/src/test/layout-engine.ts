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
    DefaultModelState,
    ElementAndBounds,
    ElementAndRoutingPoints,
    GModelIndex,
    GModelRoot,
    LayoutEngine,
    LayoutResult,
    Logger,
    ModelState,
    NullLogger
} from '@eclipse-glsp/server';
import { ELK, ElkNode, LayoutOptions } from 'elkjs/lib/elk-api';
import { Container, ContainerModule } from 'inversify';
import { ElkLayoutModule, ElkModuleOptions } from '../di.config';
import { LayoutConfigurator } from '../layout-configurator';

/*
 * Runs the ELK layout engine on a graphical model without a diagram session.
 */

/** Records the messages of the warnings and debug messages logged by the layout engine. */
export class RecordingLogger extends NullLogger {
    readonly warnings: string[] = [];
    readonly debugMessages: string[] = [];

    override warn(message: string): void {
        this.warnings.push(message);
    }

    override debug(message: string): void {
        this.debugMessages.push(message);
    }
}

/** An {@link ElkLayoutModule} whose ELK instance records a copy of every graph that it is asked to lay out. */
class RecordingElkLayoutModule extends ElkLayoutModule {
    readonly elkInputs: ElkNode[] = [];

    protected override createElk(options: { algorithms: string[]; defaultLayoutOptions?: LayoutOptions }, isWebWorker?: boolean): ELK {
        const elk = super.createElk(options, isWebWorker);
        const layout = elk.layout.bind(elk);
        elk.layout = (graph, args) => {
            this.elkInputs.push(structuredClone(graph));
            return layout(graph, args);
        };
        return elk;
    }
}

export interface TestLayoutEngine {
    engine: LayoutEngine;
    modelState: ModelState;
    layoutConfigurator: LayoutConfigurator;
    logger: RecordingLogger;
    /** Copies of the graphs that the engine passed to ELK, one per layout run. */
    elkInputs: ElkNode[];
}

/**
 * Creates the layout engine of an {@link ElkLayoutModule} that lays out the given root. The module uses the `layered`
 * algorithm unless the options say otherwise.
 */
export function createEngine(root: GModelRoot, options: Partial<ElkModuleOptions> = {}): TestLayoutEngine {
    const modelState = createModelState(root);
    const logger = new RecordingLogger();
    const elkModule = new RecordingElkLayoutModule({ algorithms: ['layered'], ...options });
    const container = new Container();
    container.load(
        new ContainerModule(bind => {
            bind(ModelState).toConstantValue(modelState);
            bind(Logger).toConstantValue(logger);
        }),
        elkModule
    );
    return {
        engine: container.get<LayoutEngine>(LayoutEngine),
        modelState,
        layoutConfigurator: container.get<LayoutConfigurator>(LayoutConfigurator),
        logger,
        elkInputs: elkModule.elkInputs
    };
}

/** Creates a model state with its own index, and with the given root if there is one. */
export function createModelState(root?: GModelRoot): ModelState {
    const modelState = new DefaultModelState();
    // The index is normally injected; the model state needs it to index the root.
    Object.defineProperty(modelState, 'index', { value: new GModelIndex() });
    if (root) {
        modelState.updateRoot(root);
    }
    return modelState;
}

/** Returns the bounds that the layout result contains for the element with the given ID. */
export function boundsOf(result: LayoutResult, id: string): ElementAndBounds | undefined {
    return result.bounds.find(bounds => bounds.elementId === id);
}

/** Returns the routing points that the layout result contains for the edge with the given ID. */
export function routingPointsOf(result: LayoutResult, id: string): ElementAndRoutingPoints['newRoutingPoints'] {
    return result.routingPoints.find(points => points.elementId === id)?.newRoutingPoints;
}
