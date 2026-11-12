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
    ChangeBoundsOperation,
    ChangeRoutingPointsOperation,
    Command,
    DefaultModelState,
    DiagramConfiguration,
    DiagramModule,
    Dimension,
    EdgeTypeHint,
    GEdge,
    GGraph,
    GModelElementConstructor,
    GModelFactory,
    GNode,
    GPort,
    InstanceMultiBinding,
    JsonModelState,
    JsonOperationHandler,
    MaybePromise,
    ModelState,
    OperationHandlerConstructor,
    Point,
    RequestModelAction,
    SaveModelAction,
    ServerLayoutKind,
    ShapeTypeHint,
    SourceModelStorage,
    getDefaultMapping
} from '@eclipse-glsp/server';
import { inject, injectable } from 'inversify';

/*
 * A minimal diagram language with a custom source model, used to test that layouts are persisted in the source model.
 * The source model deliberately differs from the graphical model: steps are stored by name, their ports are nested in
 * the step record, and flows reference steps by name. Graphical model ids are derived from these names.
 */

export interface FlowPort {
    name: string;
    offset: Point;
    size: Dimension;
}

export interface FlowStep {
    name: string;
    shape: Point & Dimension;
    ports: FlowPort[];
}

export interface FlowConnection {
    from: string;
    to: string;
    via: Point[];
}

export interface FlowSourceModel {
    steps: FlowStep[];
    flows: FlowConnection[];
}

export const FlowSeed = Symbol('FlowSeed');

export namespace FlowIds {
    export function step(step: string): string {
        return `step:${step}`;
    }
    export function port(step: string, port: string): string {
        return `step:${step}#${port}`;
    }
    export function flow(from: string, to: string): string {
        return `flow:${from}->${to}`;
    }
}

@injectable()
export class FlowModelState extends DefaultModelState implements JsonModelState<FlowSourceModel> {
    sourceModel: FlowSourceModel;

    updateSourceModel(sourceModel: FlowSourceModel): void {
        this.sourceModel = sourceModel;
    }

    findStep(elementId: string): FlowStep | undefined {
        return this.sourceModel.steps.find(step => FlowIds.step(step.name) === elementId);
    }

    findPort(elementId: string): FlowPort | undefined {
        for (const step of this.sourceModel.steps) {
            const port = step.ports.find(candidate => FlowIds.port(step.name, candidate.name) === elementId);
            if (port) {
                return port;
            }
        }
        return undefined;
    }

    findFlow(elementId: string): FlowConnection | undefined {
        return this.sourceModel.flows.find(flow => FlowIds.flow(flow.from, flow.to) === elementId);
    }
}

@injectable()
export class FlowSourceModelStorage implements SourceModelStorage {
    @inject(ModelState)
    protected modelState: FlowModelState;

    @inject(FlowSeed)
    protected seed: FlowSourceModel;

    loadSourceModel(_action: RequestModelAction): void {
        this.modelState.updateSourceModel(structuredClone(this.seed));
    }

    saveSourceModel(_action: SaveModelAction): void {
        // the source model only lives in memory
    }
}

@injectable()
export class FlowGModelFactory implements GModelFactory {
    @inject(ModelState)
    protected modelState: FlowModelState;

    createModel(): void {
        const { steps, flows } = this.modelState.sourceModel;
        const nodes = steps.map(step =>
            GNode.builder()
                .id(FlowIds.step(step.name))
                .position(step.shape.x, step.shape.y)
                .size(step.shape.width, step.shape.height)
                .addChildren(
                    step.ports.map(port =>
                        GPort.builder().id(FlowIds.port(step.name, port.name)).position(port.offset).size(port.size).build()
                    )
                )
                .build()
        );
        const edges = flows.map(flow =>
            GEdge.builder()
                .id(FlowIds.flow(flow.from, flow.to))
                .sourceId(FlowIds.step(flow.from))
                .targetId(FlowIds.step(flow.to))
                .addRoutingPoints(flow.via)
                .build()
        );
        this.modelState.updateRoot(GGraph.builder().id('flow-graph').addChildren(nodes).addChildren(edges).build());
    }
}

@injectable()
export class FlowChangeBoundsOperationHandler extends JsonOperationHandler {
    declare modelState: FlowModelState;
    readonly operationType = ChangeBoundsOperation.KIND;

    createCommand(operation: ChangeBoundsOperation): MaybePromise<Command | undefined> {
        return this.commandOf(() => {
            for (const { elementId, newPosition, newSize } of operation.newBounds) {
                const step = this.modelState.findStep(elementId);
                if (step) {
                    step.shape = { ...(newPosition ?? step.shape), ...newSize };
                }
                const port = this.modelState.findPort(elementId);
                if (port) {
                    port.offset = newPosition ?? port.offset;
                    port.size = newSize;
                }
            }
        });
    }
}

@injectable()
export class FlowChangeRoutingPointsOperationHandler extends JsonOperationHandler {
    declare modelState: FlowModelState;
    readonly operationType = ChangeRoutingPointsOperation.KIND;

    createCommand(operation: ChangeRoutingPointsOperation): MaybePromise<Command | undefined> {
        return this.commandOf(() => {
            for (const { elementId, newRoutingPoints } of operation.newRoutingPoints) {
                const flow = this.modelState.findFlow(elementId);
                if (flow) {
                    flow.via = newRoutingPoints ?? [];
                }
            }
        });
    }
}

@injectable()
export class FlowDiagramConfiguration implements DiagramConfiguration {
    typeMapping: Map<string, GModelElementConstructor> = getDefaultMapping();
    shapeTypeHints: ShapeTypeHint[] = [];
    edgeTypeHints: EdgeTypeHint[] = [];
    layoutKind = ServerLayoutKind.MANUAL;
    needsClientLayout = false;
    animatedUpdate = false;
}

/** Configures which operation handlers the flow diagram language provides. */
export interface FlowDiagramOptions {
    /** Whether the language persists changed bounds. Defaults to `true`. */
    changeBounds?: boolean;
    /** Whether the language persists changed routing points. Defaults to `true`. */
    changeRoutingPoints?: boolean;
}

export class FlowDiagramModule extends DiagramModule {
    readonly diagramType = 'flow-diagram';

    constructor(protected readonly options: FlowDiagramOptions = {}) {
        super();
    }

    protected bindSourceModelStorage(): BindingTarget<SourceModelStorage> {
        return FlowSourceModelStorage;
    }

    protected bindModelState(): BindingTarget<ModelState> {
        return FlowModelState;
    }

    protected bindDiagramConfiguration(): BindingTarget<DiagramConfiguration> {
        return FlowDiagramConfiguration;
    }

    protected bindGModelFactory(): BindingTarget<GModelFactory> {
        return FlowGModelFactory;
    }

    protected override configureOperationHandlers(binding: InstanceMultiBinding<OperationHandlerConstructor>): void {
        super.configureOperationHandlers(binding);
        if (this.options.changeBounds ?? true) {
            binding.add(FlowChangeBoundsOperationHandler);
        }
        if (this.options.changeRoutingPoints ?? true) {
            binding.add(FlowChangeRoutingPointsOperationHandler);
        }
    }
}
