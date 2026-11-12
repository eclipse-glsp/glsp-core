/********************************************************************************
 * Copyright (c) 2018-2026 TypeFox and others.
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
    findParent,
    findParentByClass,
    GCompartment,
    GEdge,
    GGraph,
    GLabel,
    GModelElement,
    GModelElementConstructor,
    GModelRoot,
    GNode,
    GPort,
    GShapeElement,
    LayoutEngine,
    LayoutOperation,
    LayoutResult,
    Logger,
    ModelState,
    applyLayoutResult
} from '@eclipse-glsp/server';
import { ELK, ElkExtendedEdge, ElkGraphElement, ElkLabel, ElkNode, ElkPort, ElkShape } from 'elkjs/lib/elk-api';
import { inject, injectable } from 'inversify';
import { ElementFilter } from './element-filter';
import { LayoutConfigurator } from './layout-configurator';

/**
 * Factory for ELK instances. Follow the elkjs package documentation on how to configure ELK
 * instances. For example, the bundled version can be used by importing the ELK constructor
 * from `"elkjs/lib/elk.bundled"`. For the webworker version, import the constructor from
 * `"elkjs/lib/elk-api"` and add the option `workerUrl: "elk/elk-worker.min.js"`.
 */
export type ElkFactory = () => ELK;
export const ElkFactory = Symbol('ElkFactory');

/**
 * An implementation of GLSP's {@link LayoutEngine} interface that retrieves the graphical model from the {@link ModelState},
 * transforms this model into an ELK graph and then invokes the underlying ELK instance for layout computation.
 */
@injectable()
export class GlspElkLayoutEngine implements LayoutEngine {
    @inject(Logger)
    protected readonly logger: Logger;

    protected readonly elk: ELK;

    protected elkEdges: ElkExtendedEdge[];
    protected idToElkElement: Map<string, ElkGraphElement>;

    constructor(
        elkFactory: ElkFactory,
        protected readonly filter: ElementFilter,
        protected readonly configurator: LayoutConfigurator,
        protected modelState: ModelState
    ) {
        this.elk = elkFactory();
    }
    /**
     * Computes the layout with {@link GlspElkLayoutEngine.computeLayout} and applies it transiently to the graphical
     * model.
     */
    async layout(operation?: LayoutOperation): Promise<GModelRoot> {
        const result = await this.computeLayout(operation);
        applyLayoutResult(result, this.modelState.index);
        return this.modelState.root;
    }

    async computeLayout(operation?: LayoutOperation): Promise<LayoutResult> {
        const result: LayoutResult = { bounds: [], routingPoints: [] };
        const root = this.modelState.root;
        if (!(root instanceof GGraph)) {
            return result;
        }

        this.elkEdges = [];
        this.idToElkElement = new Map();
        const elkGraph = await this.elk.layout(this.transformToElk(root));
        this.collectLayout(elkGraph, result);
        return result;
    }

    protected collectLayout(elkNode: ElkNode, result: LayoutResult): void {
        const element = this.modelState.index.get(elkNode.id);
        if (element instanceof GNode) {
            this.collectShape(elkNode, result);
        }
        elkNode.ports?.forEach(elkPort => this.collectShape(elkPort, result));
        elkNode.children?.forEach(child => this.collectLayout(child, result));
        elkNode.edges?.forEach(elkEdge => this.collectEdge(elkEdge, result));
    }

    /**
     * Collects the bend points of the first section as routing points and the bounds of the edge's labels. The
     * section's start and end point are left out, as they are the source and target point of the edge's route, which
     * the client computes from the anchors.
     */
    protected collectEdge(elkEdge: ElkExtendedEdge, result: LayoutResult): void {
        elkEdge.labels?.forEach(elkLabel => this.collectShape(elkLabel, result));
        const section = elkEdge.sections?.[0];
        if (!section) {
            return;
        }
        result.routingPoints.push({ elementId: elkEdge.id, newRoutingPoints: section.bendPoints ?? [] });
    }

    /**
     * Collects the bounds of the given shape and of its labels. Shapes that ELK did not place are left out.
     */
    protected collectShape(elkShape: ElkShape, result: LayoutResult): void {
        if (
            elkShape.id !== undefined &&
            elkShape.x !== undefined &&
            elkShape.y !== undefined &&
            elkShape.width !== undefined &&
            elkShape.height !== undefined
        ) {
            result.bounds.push({
                elementId: elkShape.id,
                newPosition: { x: elkShape.x, y: elkShape.y },
                newSize: { width: elkShape.width, height: elkShape.height }
            });
        }
        elkShape.labels?.forEach(elkLabel => this.collectShape(elkLabel, result));
    }

    protected transformToElk(model: GGraph): ElkNode;
    protected transformToElk(model: GNode): ElkNode;
    protected transformToElk(model: GEdge): ElkExtendedEdge;
    protected transformToElk(model: GLabel): ElkLabel;
    protected transformToElk(model: GPort): ElkPort;
    protected transformToElk(model: GModelElement): ElkGraphElement {
        if (model instanceof GGraph) {
            const graph = this.transformGraph(model);
            this.elkEdges.forEach(elkEdge => {
                const parent = this.findCommonAncestor(elkEdge);
                if (parent) {
                    parent.edges!.push(elkEdge);
                }
            });
            return graph;
        } else if (model instanceof GNode) {
            return this.transformNode(model);
        } else if (model instanceof GEdge) {
            return this.transformEdge(model);
        } else if (model instanceof GLabel) {
            return this.transformLabel(model);
        } else if (model instanceof GPort) {
            return this.transformPort(model);
        }

        throw new Error('Type not supported: ' + model.type);
    }

    /**
     * Searches for all children of the given element that are an instance of the given {@link GModelElementConstructor}
     * and are included by the {@link ElementFilter}. Also considers children that are nested inside of {@link GCompartment}s.
     * @param element The element whose children should be queried.
     * @param constructor The class instance that should be matched
     * @returns A list of all matching children.
     */
    protected findChildren<G extends GModelElement>(element: GModelElement, constructor: GModelElementConstructor<G>): G[] {
        const result: G[] = [];
        element.children.forEach(child => {
            if (child instanceof constructor && this.filter.apply(element)) {
                result.push(child);
            } else if (child instanceof GCompartment) {
                result.push(...this.findChildren(child, constructor));
            }
        });

        return result;
    }

    protected findCommonAncestor(elkEdge: ElkExtendedEdge): ElkNode | undefined {
        if (elkEdge.sources.length === 0 || elkEdge.targets.length === 0) {
            this.logger.warn('Edges with multiple sources or targets are not supported by the GLSPElkLayoutEngine', elkEdge);
            return undefined;
        }
        const source = this.findEdgeEndpoint(elkEdge.sources[0]);
        const target = this.findEdgeEndpoint(elkEdge.targets[0]);
        if (!source || !target) {
            return undefined;
        }

        const sourceParent = findParent(source.parent, parent => parent instanceof GNode || parent instanceof GGraph);
        const targetParent = findParent(target.parent, parent => parent instanceof GNode || parent instanceof GGraph);

        if (!sourceParent || !targetParent) {
            return undefined;
        }

        let ancestor: ElkGraphElement | undefined;
        if (sourceParent === targetParent) {
            ancestor = this.idToElkElement.get(sourceParent.id);
        } else if (source === targetParent) {
            ancestor = this.idToElkElement.get(source.id);
        } else if (target === sourceParent) {
            ancestor = this.idToElkElement.get(target.id);
        }
        return ancestor as ElkNode | undefined;
    }

    /**
     * Returns the shape that an edge end is attached to. For an edge end at a port this is the port's node, as the
     * port itself does not contain any edges.
     */
    protected findEdgeEndpoint(id: string): GModelElement | undefined {
        const element = this.modelState.index.get(id);
        return element instanceof GPort ? findParentByClass(element, GNode) : element;
    }

    protected transformGraph(graph: GGraph): ElkGraphElement {
        const elkGraph: ElkNode = {
            id: graph.id,
            layoutOptions: this.configurator.apply(graph)
        };
        if (graph.children) {
            elkGraph.children = this.findChildren(graph, GNode).map(child => this.transformToElk(child));
            elkGraph.edges = [];
            this.elkEdges.push(...this.findChildren(graph, GEdge).map(child => this.transformToElk(child)));
        }

        this.idToElkElement.set(graph.id, elkGraph);
        return elkGraph;
    }

    protected transformNode(node: GNode): ElkNode {
        const elkNode: ElkNode = {
            id: node.id,
            layoutOptions: this.configurator.apply(node)
        };

        if (node.children) {
            elkNode.children = this.findChildren(node, GNode).map(child => this.transformToElk(child));
            elkNode.edges = [];
            this.elkEdges.push(...this.findChildren(node, GEdge).map(child => this.transformToElk(child)));

            elkNode.labels = this.findChildren(node, GLabel).map(child => this.transformToElk(child));
            elkNode.ports = this.findChildren(node, GPort).map(child => this.transformToElk(child));
        }

        this.transformShape(elkNode, node);
        this.idToElkElement.set(node.id, elkNode);

        return elkNode;
    }

    protected transformShape(elkShape: ElkShape, shape: GShapeElement): void {
        if (shape.position) {
            elkShape.x = shape.position.x;
            elkShape.y = shape.position.y;
        }
        if (shape.size) {
            elkShape.width = shape.size.width;
            elkShape.height = shape.size.height;
        }
    }

    protected transformEdge(edge: GEdge): ElkExtendedEdge {
        const elkEdge: ElkExtendedEdge = {
            id: edge.id,
            sources: [edge.sourceId],
            targets: [edge.targetId],
            layoutOptions: this.configurator.apply(edge)
        };

        if (edge.children) {
            elkEdge.labels = this.findChildren(edge, GLabel).map(child => this.transformToElk(child));
        }
        const points = edge.routingPoints;
        if (points && points.length >= 2) {
            elkEdge.sections = [
                {
                    id: edge.id + ':section',
                    startPoint: points[0],
                    bendPoints: points.slice(1, points.length - 1),
                    endPoint: points[points.length - 1]
                }
            ];
        }
        this.idToElkElement.set(edge.id, elkEdge);
        return elkEdge;
    }

    protected transformLabel(label: GLabel): ElkLabel {
        const elkLabel: ElkLabel = {
            id: label.id,
            text: label.text,
            layoutOptions: this.configurator.apply(label)
        };
        this.transformShape(elkLabel, label);
        this.idToElkElement.set(label.id, elkLabel);
        return elkLabel;
    }

    protected transformPort(port: GPort): ElkPort {
        const elkPort: ElkPort = {
            id: port.id,
            layoutOptions: this.configurator.apply(port)
        };
        if (port.children) {
            elkPort.labels = this.findChildren(port, GLabel).map(child => this.transformToElk(child));
            this.elkEdges.push(...this.findChildren(port, GEdge).map(child => this.transformToElk(child)));
        }
        this.transformShape(elkPort, port);
        this.idToElkElement.set(port.id, elkPort);
        return elkPort;
    }
}
