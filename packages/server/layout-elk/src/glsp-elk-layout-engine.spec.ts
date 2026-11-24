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
    GCompartment,
    GEdge,
    GGraph,
    GLabel,
    GModelElement,
    GModelIndex,
    GNode,
    GPort,
    LayoutEngine,
    LayoutOperation,
    LayoutResult,
    Logger,
    ModelState,
    NullLogger,
    Point
} from '@eclipse-glsp/server';
import { LayoutOptions } from 'elkjs';
import { Container, ContainerModule, injectable } from 'inversify';
import { describe, expect, it } from 'vitest';
import { ElkLayoutModule, ElkModuleOptions } from './di.config';
import { DefaultElementFilter, ElementFilter } from './element-filter';
import { AbstractLayoutConfigurator, LayoutConfigurator } from './layout-configurator';

/** Records the messages of the warnings and debug messages logged by the layout engine. */
class RecordingLogger extends NullLogger {
    readonly warnings: string[] = [];
    readonly debugMessages: string[] = [];

    override warn(message: string): void {
        this.warnings.push(message);
    }

    override debug(message: string): void {
        this.debugMessages.push(message);
    }
}

function createEngine(
    root: GGraph,
    options: Pick<ElkModuleOptions, 'layoutConfigurator' | 'elementFilter'> = {}
): { engine: LayoutEngine; modelState: ModelState; layoutConfigurator: LayoutConfigurator; logger: RecordingLogger } {
    const modelState = new DefaultModelState();
    Object.defineProperty(modelState, 'index', { value: new GModelIndex() });
    modelState.updateRoot(root);
    const logger = new RecordingLogger();
    const container = new Container();
    container.load(
        new ContainerModule(bind => {
            bind(ModelState).toConstantValue(modelState);
            bind(Logger).toConstantValue(logger);
        }),
        new ElkLayoutModule({ algorithms: ['layered'], ...options })
    );
    return {
        engine: container.get<LayoutEngine>(LayoutEngine),
        modelState,
        layoutConfigurator: container.get<LayoutConfigurator>(LayoutConfigurator),
        logger
    };
}

/** Two stacked nodes connected by an edge; the layered algorithm places the target to the right of the source. */
function createTwoNodeGraph(): GGraph {
    const source = GNode.builder().id('source').position(0, 0).size(50, 30).build();
    const target = GNode.builder().id('target').position(0, 0).size(50, 30).build();
    const edge = GEdge.builder().id('edge').source(source).target(target).build();
    return GGraph.builder().id('graph').addChildren(source, target, edge).build();
}

/**
 * A source node with edges to an upper and a lower node; the layered algorithm aligns the source with the upper node, so
 * only the edge to the lower node bends.
 */
function createForkGraph(): GGraph {
    const source = GNode.builder().id('source').size(50, 30).build();
    const upper = GNode.builder().id('upper').size(50, 30).build();
    const lower = GNode.builder().id('lower').size(50, 30).build();
    const toUpper = GEdge.builder().id('toUpper').source(source).target(upper).build();
    const toLower = GEdge.builder().id('toLower').source(source).target(lower).build();
    return GGraph.builder().id('graph').addChildren(source, upper, lower, toUpper, toLower).build();
}

/** Two connected nodes with a label on a node, on a port and on the edge; all labels start at the origin. */
function createLabeledGraph(): GGraph {
    const portLabel = GLabel.builder().id('portLabel').text('out').position(0, 0).size(20, 10).build();
    const out = GPort.builder().id('out').size(10, 10).add(portLabel).build();
    const sourceLabel = GLabel.builder().id('sourceLabel').text('Source').position(0, 0).size(40, 10).build();
    const source = GNode.builder().id('source').size(50, 30).addChildren(sourceLabel, out).build();
    const target = GNode.builder().id('target').size(50, 30).build();
    const edgeLabel = GLabel.builder().id('edgeLabel').text('flows').position(0, 0).size(30, 10).build();
    const edge = GEdge.builder().id('edge').sourceId('out').targetId('target').add(edgeLabel).build();
    return GGraph.builder().id('graph').addChildren(source, target, edge).build();
}

/** Lays out the graph top-down while elements are selected, and left-to-right otherwise. */
@injectable()
class SelectionAwareLayoutConfigurator extends AbstractLayoutConfigurator {
    protected override graphOptions(graph: GGraph, operation?: LayoutOperation): LayoutOptions {
        return { 'elk.direction': operation?.elementIds?.length ? 'DOWN' : 'RIGHT' };
    }
}

/** Records the layout operation that each element was configured with. */
@injectable()
class RecordingLayoutConfigurator implements LayoutConfigurator {
    readonly operations = new Map<string, LayoutOperation | undefined>();

    apply(element: GModelElement, operation?: LayoutOperation): LayoutOptions | undefined {
        this.operations.set(element.id, operation);
        return undefined;
    }
}

/** Creates a {@link DefaultElementFilter} that rejects the nodes, edges, labels and ports with the given IDs. */
function rejecting(...ids: string[]): ElkModuleOptions['elementFilter'] {
    @injectable()
    class RejectingElementFilter extends DefaultElementFilter {
        protected override filterNode(node: GNode): boolean {
            return !ids.includes(node.id);
        }

        protected override filterEdge(edge: GEdge): boolean {
            return !ids.includes(edge.id) && super.filterEdge(edge);
        }

        protected override filterLabel(label: GLabel): boolean {
            return !ids.includes(label.id);
        }

        protected override filterPort(port: GPort): boolean {
            return !ids.includes(port.id);
        }
    }
    return RejectingElementFilter;
}

/**
 * Creates a plain {@link ElementFilter} that rejects every element with one of the given IDs, whatever its type. Unlike the
 * {@link DefaultElementFilter}, it doesn't reject the edges connected to a rejected element.
 */
function rejectingAny(...ids: string[]): ElkModuleOptions['elementFilter'] {
    @injectable()
    class RejectingAnyElementFilter implements ElementFilter {
        apply(element: GModelElement): boolean {
            return !ids.includes(element.id);
        }
    }
    return RejectingAnyElementFilter;
}

/** The IDs of all elements that the layout result contains bounds or routing points for, sorted. */
function laidOutIds(result: LayoutResult): string[] {
    return [...result.bounds, ...result.routingPoints].map(change => change.elementId).sort();
}

describe('GlspElkLayoutEngine', () => {
    describe('computeLayout', () => {
        it('computes new bounds for nodes without changing the graphical model', async () => {
            const { engine, modelState } = createEngine(createTwoNodeGraph());

            const result = await engine.computeLayout!();

            const source = result.bounds.find(bounds => bounds.elementId === 'source')!;
            const target = result.bounds.find(bounds => bounds.elementId === 'target')!;
            expect(source.newSize).toEqual({ width: 50, height: 30 });
            expect(target.newSize).toEqual({ width: 50, height: 30 });
            expect(target.newPosition!.x).toBeGreaterThanOrEqual(source.newPosition!.x + 50);
            expect(modelState.index.findByClass('source', GNode)!.position).toEqual({ x: 0, y: 0 });
            expect(modelState.index.findByClass('target', GNode)!.position).toEqual({ x: 0, y: 0 });
        });

        it('computes new bounds for ports', async () => {
            const port = GPort.builder().id('port').position(0, 0).size(10, 10).build();
            const node = GNode.builder().id('node').position(0, 0).size(50, 30).add(port).build();
            const { engine } = createEngine(GGraph.builder().id('graph').add(node).build());

            const result = await engine.computeLayout!();

            const portBounds = result.bounds.find(bounds => bounds.elementId === 'port');
            expect(portBounds?.newSize).toEqual({ width: 10, height: 10 });
            expect(portBounds?.newPosition).toBeDefined();
        });

        it('computes empty routing points for a straight edge', async () => {
            const { engine } = createEngine(createTwoNodeGraph());

            const result = await engine.computeLayout!();

            expect(result.routingPoints).toEqual([{ elementId: 'edge', newRoutingPoints: [] }]);
        });

        it('computes only the bend points of a bent edge as routing points', async () => {
            const { engine } = createEngine(createForkGraph());

            const result = await engine.computeLayout!();

            // The source point lies on the source's right border and the target point on the target's left border,
            // so every bend point of the orthogonal route lies strictly between them.
            const sourceBounds = result.bounds.find(bounds => bounds.elementId === 'source')!;
            const lowerBounds = result.bounds.find(bounds => bounds.elementId === 'lower')!;
            const routingPoints = result.routingPoints.find(points => points.elementId === 'toLower')!.newRoutingPoints!;
            expect(routingPoints.length).toBeGreaterThan(0);
            for (const point of routingPoints) {
                expect(point.x).toBeGreaterThan(sourceBounds.newPosition!.x + 50);
                expect(point.x).toBeLessThan(lowerBounds.newPosition!.x);
            }
        });
    });

    describe('computeLayout with labels', () => {
        it('computes new bounds for node, port and edge labels without changing the graphical model', async () => {
            const { engine, modelState } = createEngine(createLabeledGraph());

            const result = await engine.computeLayout!();

            for (const [id, size] of [
                ['sourceLabel', { width: 40, height: 10 }],
                ['portLabel', { width: 20, height: 10 }],
                ['edgeLabel', { width: 30, height: 10 }]
            ] as const) {
                const labelBounds = result.bounds.find(bounds => bounds.elementId === id);
                expect(labelBounds?.newSize, id).toEqual(size);
                expect(labelBounds?.newPosition, id).toBeDefined();
                expect(modelState.index.findByClass(id, GLabel)!.position, id).toEqual({ x: 0, y: 0 });
            }
        });
    });

    describe('computeLayout with a layout operation', () => {
        it('lets the layout configurator use the selected elements of the layout operation', async () => {
            const { engine } = createEngine(createTwoNodeGraph(), { layoutConfigurator: SelectionAwareLayoutConfigurator });

            const unselected = await engine.computeLayout!();
            const selected = await engine.computeLayout!(LayoutOperation.create(['target']));

            const position = (result: LayoutResult, id: string): Point =>
                result.bounds.find(bounds => bounds.elementId === id)!.newPosition!;
            expect(position(unselected, 'target').x).toBeGreaterThanOrEqual(position(unselected, 'source').x + 50);
            expect(position(selected, 'target').y).toBeGreaterThanOrEqual(position(selected, 'source').y + 30);
        });

        it('passes the layout operation to the layout configurator for every element', async () => {
            const label = GLabel.builder().id('label').text('label').size(20, 10).build();
            const port = GPort.builder().id('port').size(10, 10).build();
            const node = GNode.builder().id('node').size(50, 30).add(label).add(port).build();
            const other = GNode.builder().id('other').size(50, 30).build();
            const edge = GEdge.builder().id('edge').source(node).target(other).build();
            const { engine, layoutConfigurator } = createEngine(GGraph.builder().id('graph').addChildren(node, other, edge).build(), {
                layoutConfigurator: RecordingLayoutConfigurator
            });
            const operation = LayoutOperation.create(['node']);

            await engine.computeLayout!(operation);

            const { operations } = layoutConfigurator as RecordingLayoutConfigurator;
            expect([...operations.keys()].sort()).toEqual(['edge', 'graph', 'label', 'node', 'other', 'port']);
            for (const recorded of operations.values()) {
                expect(recorded?.elementIds).toEqual(['node']);
            }
        });
    });

    describe('computeLayout with ports', () => {
        it('routes an edge that starts at a port', async () => {
            const out = GPort.builder().id('out').size(10, 10).build();
            const source = GNode.builder().id('source').size(50, 30).add(out).build();
            const target = GNode.builder().id('target').size(50, 30).build();
            const edge = GEdge.builder().id('edge').sourceId('out').targetId('target').build();
            const { engine } = createEngine(GGraph.builder().id('graph').addChildren(source, target, edge).build());

            const result = await engine.computeLayout!();

            expect(result.routingPoints.map(points => points.elementId)).toEqual(['edge']);
        });
    });

    describe('layout', () => {
        it('applies the same label bounds that computeLayout computes', async () => {
            const { engine, modelState } = createEngine(createLabeledGraph());
            const result = await engine.computeLayout!();

            await engine.layout();

            for (const id of ['sourceLabel', 'portLabel', 'edgeLabel']) {
                const labelBounds = result.bounds.find(bounds => bounds.elementId === id)!;
                const label = modelState.index.findByClass(id, GLabel)!;
                expect(label.position, id).toEqual(labelBounds.newPosition);
                expect(label.size, id).toEqual(labelBounds.newSize);
            }
        });

        it('applies only the bend points of a bent edge as routing points to the graphical model', async () => {
            const { engine, modelState } = createEngine(createForkGraph());

            await engine.layout();

            const source = modelState.index.findByClass('source', GNode)!;
            const lower = modelState.index.findByClass('lower', GNode)!;
            const routingPoints = modelState.index.findByClass('toLower', GEdge)!.routingPoints;
            expect(routingPoints.length).toBeGreaterThan(0);
            for (const point of routingPoints) {
                expect(point.x).toBeGreaterThan(source.position.x + 50);
                expect(point.x).toBeLessThan(lower.position.x);
            }
        });
    });

    describe('computeLayout with an element filter', () => {
        it('leaves a rejected child node out of the layout', async () => {
            const child = GNode.builder().id('child').size(20, 20).build();
            const sibling = GNode.builder().id('sibling').size(20, 20).build();
            const parent = GNode.builder().id('parent').size(100, 60).addChildren(child, sibling).build();
            const { engine } = createEngine(GGraph.builder().id('graph').add(parent).build(), { elementFilter: rejecting('child') });

            const result = await engine.computeLayout!();

            expect(laidOutIds(result)).toEqual(['parent', 'sibling']);
        });

        it('leaves a rejected container out of the layout together with its children', async () => {
            const child = GNode.builder().id('child').size(20, 20).build();
            const label = GLabel.builder().id('label').text('container').size(40, 10).build();
            const container = GNode.builder().id('container').size(100, 60).addChildren(label, child).build();
            const other = GNode.builder().id('other').size(20, 20).build();
            const { engine } = createEngine(GGraph.builder().id('graph').addChildren(container, other).build(), {
                elementFilter: rejecting('container')
            });

            const result = await engine.computeLayout!();

            expect(laidOutIds(result)).toEqual(['other']);
        });

        it('leaves rejected top-level nodes and edges, and the edges connected to them, out of the layout', async () => {
            const a = GNode.builder().id('a').size(20, 20).build();
            const b = GNode.builder().id('b').size(20, 20).build();
            const c = GNode.builder().id('c').size(20, 20).build();
            const ab = GEdge.builder().id('ab').source(a).target(b).build();
            const ba = GEdge.builder().id('ba').source(b).target(a).build();
            const bc = GEdge.builder().id('bc').source(b).target(c).build();
            const { engine } = createEngine(GGraph.builder().id('graph').addChildren(a, b, c, ab, ba, bc).build(), {
                elementFilter: rejecting('c', 'ab')
            });

            const result = await engine.computeLayout!();

            expect(laidOutIds(result)).toEqual(['a', 'b', 'ba']);
        });

        it('applies the filter to the children of a compartment, but not to the compartment itself', async () => {
            const kept = GNode.builder().id('kept').size(20, 20).build();
            const rejected = GNode.builder().id('rejected').size(20, 20).build();
            const compartment = GCompartment.builder().id('compartment').addChildren(kept, rejected).build();
            const parent = GNode.builder().id('parent').size(100, 60).add(compartment).build();
            const { engine } = createEngine(GGraph.builder().id('graph').add(parent).build(), {
                elementFilter: rejectingAny('compartment', 'rejected')
            });

            const result = await engine.computeLayout!();

            expect(laidOutIds(result)).toEqual(['kept', 'parent']);
        });

        it('leaves rejected labels and ports out of the layout', async () => {
            const keptLabel = GLabel.builder().id('keptLabel').text('kept').size(30, 10).build();
            const rejectedLabel = GLabel.builder().id('rejectedLabel').text('rejected').size(30, 10).build();
            const keptPort = GPort.builder().id('keptPort').size(10, 10).build();
            const rejectedPort = GPort.builder().id('rejectedPort').size(10, 10).build();
            const node = GNode.builder().id('node').size(50, 30).addChildren(keptLabel, rejectedLabel, keptPort, rejectedPort).build();
            const { engine } = createEngine(GGraph.builder().id('graph').add(node).build(), {
                elementFilter: rejecting('rejectedLabel', 'rejectedPort')
            });

            const result = await engine.computeLayout!();

            expect(laidOutIds(result)).toEqual(['keptLabel', 'keptPort', 'node']);
        });

        it('leaves an edge to a rejected node out of the layout, even if the filter does not reject the edge', async () => {
            const a = GNode.builder().id('a').size(20, 20).build();
            const b = GNode.builder().id('b').size(20, 20).build();
            const ab = GEdge.builder().id('ab').source(a).target(b).build();
            const { engine } = createEngine(GGraph.builder().id('graph').addChildren(a, b, ab).build(), {
                elementFilter: rejectingAny('b')
            });

            const result = await engine.computeLayout!();

            expect(laidOutIds(result)).toEqual(['a']);
        });

        it('warns about an edge whose end does not exist in the model and leaves it out of the layout', async () => {
            const a = GNode.builder().id('a').size(20, 20).build();
            const dangling = GEdge.builder().id('dangling').sourceId('a').targetId('missing').build();
            const { engine, logger } = createEngine(GGraph.builder().id('graph').addChildren(a, dangling).build(), {
                elementFilter: rejectingAny()
            });

            const result = await engine.computeLayout!();

            expect(laidOutIds(result)).toEqual(['a']);
            expect(logger.warnings).toEqual(["Edge 'dangling' is not laid out, because its end 'missing' does not exist in the model"]);
        });

        it('leaves an edge to a port of a rejected node out of the layout', async () => {
            const port = GPort.builder().id('port').size(10, 10).build();
            const rejected = GNode.builder().id('rejected').size(50, 30).add(port).build();
            const kept = GNode.builder().id('kept').size(50, 30).build();
            const toPort = GEdge.builder().id('toPort').sourceId('kept').targetId('port').build();
            const { engine } = createEngine(GGraph.builder().id('graph').addChildren(rejected, kept, toPort).build(), {
                elementFilter: rejecting('rejected')
            });

            const result = await engine.computeLayout!();

            expect(laidOutIds(result)).toEqual(['kept']);
        });

        it('leaves an edge to a port of a rejected node out of the layout, even if the filter does not reject the edge', async () => {
            const port = GPort.builder().id('port').size(10, 10).build();
            const rejected = GNode.builder().id('rejected').size(50, 30).add(port).build();
            const kept = GNode.builder().id('kept').size(50, 30).build();
            const toPort = GEdge.builder().id('toPort').sourceId('kept').targetId('port').build();
            const { engine } = createEngine(GGraph.builder().id('graph').addChildren(rejected, kept, toPort).build(), {
                elementFilter: rejectingAny('rejected')
            });

            const result = await engine.computeLayout!();

            expect(laidOutIds(result)).toEqual(['kept']);
        });

        it('leaves an edge to a node inside a rejected node out of the layout, even if the filter does not reject the edge', async () => {
            const inner = GNode.builder().id('inner').size(20, 20).build();
            const rejected = GNode.builder().id('rejected').size(50, 30).add(inner).build();
            const kept = GNode.builder().id('kept').size(50, 30).build();
            const toInner = GEdge.builder().id('toInner').sourceId('kept').targetId('inner').build();
            const { engine } = createEngine(GGraph.builder().id('graph').addChildren(rejected, kept, toInner).build(), {
                elementFilter: rejectingAny('rejected')
            });

            const result = await engine.computeLayout!();

            expect(laidOutIds(result)).toEqual(['kept']);
        });

        it('logs a debug message about an edge whose end is left out of the layout', async () => {
            const a = GNode.builder().id('a').size(20, 20).build();
            const b = GNode.builder().id('b').size(20, 20).build();
            const ab = GEdge.builder().id('ab').source(a).target(b).build();
            const { engine, logger } = createEngine(GGraph.builder().id('graph').addChildren(a, b, ab).build(), {
                elementFilter: rejectingAny('b')
            });

            await engine.computeLayout!();

            expect(logger.debugMessages).toEqual(["Edge 'ab' is not laid out, because its end 'b' is excluded from the layout"]);
            expect(logger.warnings).toEqual([]);
        });
    });
});
