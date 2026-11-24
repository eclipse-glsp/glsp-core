/********************************************************************************
 * Copyright (c) 2018-2026 TypeFox and others.
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
import { GEdge, GLabel, GModelElement, GNode, GPort, Logger, ModelState } from '@eclipse-glsp/server';
import { inject, injectable } from 'inversify';

export const ElementFilter = Symbol('ElementFilter');
/**
 * Filter used to determine which model elements should be included in the automatic layout.
 *
 * The {@link GlspElkLayoutEngine} applies the filter to each node, edge, label and port before passing it to ELK. A
 * filtered element is left out together with its whole content, e.g. a filtered node with its child nodes, labels and
 * ports. Compartments are not passed to the filter, as ELK doesn't know them: their content is filtered as if it were
 * part of the compartment's node.
 *
 * Filtered elements keep their bounds and routing points. As ELK doesn't know them, they are no obstacles for the laid
 * out elements: filtering a child out of a node that is laid out can make it overlap the other children or exceed the
 * node's new bounds. An edge whose source or target is filtered out is left out of the layout as well, even if the
 * filter includes the edge.
 */
export interface ElementFilter {
    /**
     * Applies the element filter on the given element.
     * @param element The element on which the filter should be applied.
     * @returns `true` if the element should be included in the automatic layout, `false` otherwise.
     */
    apply(element: GModelElement): boolean;
}

/**
 * Default implementation of {@link ElementFilter}.
 * Without further configuration this filter includes all basic model elements (nodes, edges, labels, ports) that are
 * part of the graphical model. For each basic type a custom filter behavior is in place.
 * Edges whose source or target doesn't exist in the model are filtered out. In addition, edges that are connected to a
 * filtered element, or to an element inside a filtered node, are filtered out as well (see
 * {@link DefaultElementFilter.filterEdgeEnd}). The filter behavior for each of the basic types can be customized by
 * overriding the corresponding `filter` method (e.g. {@link DefaultElementFilter.filterNode}).
 */
@injectable()
export class DefaultElementFilter implements ElementFilter {
    @inject(ModelState)
    protected modelState: ModelState;

    @inject(Logger)
    protected logger: Logger;

    apply(element: GModelElement): boolean {
        if (element instanceof GNode) {
            return this.filterNode(element);
        } else if (element instanceof GEdge) {
            return this.filterEdge(element);
        } else if (element instanceof GLabel) {
            return this.filterLabel(element);
        } else if (element instanceof GPort) {
            return this.filterPort(element);
        }
        return true;
    }

    protected filterNode(node: GNode): boolean {
        return true;
    }

    protected filterEdge(edge: GEdge): boolean {
        return this.filterEdgeEnd(edge, edge.sourceId) && this.filterEdgeEnd(edge, edge.targetId);
    }

    /**
     * Checks whether the end of an edge is part of the layout. The end has to exist in the model, and neither the end nor
     * one of its containers, e.g. the node of a port, may be filtered out, as the layout leaves out the whole content of a
     * filtered node. An end that doesn't exist in the model is logged as a warning, as it points to a broken model.
     * @param edge The edge whose end should be checked.
     * @param elementId The ID of the edge's source or target.
     * @returns `true` if the end is part of the layout, `false` otherwise.
     */
    protected filterEdgeEnd(edge: GEdge, elementId: string): boolean {
        const end = this.modelState.index.find(elementId);
        if (!end) {
            this.logger.warn(`Edge '${edge.id}' is not laid out, because its end '${elementId}' does not exist in the model`);
            return false;
        }
        for (let element: GModelElement | undefined = end; element; element = element.parent) {
            if ((element instanceof GNode && !this.filterNode(element)) || (element instanceof GPort && !this.filterPort(element))) {
                return false;
            }
        }
        return true;
    }

    protected filterLabel(label: GLabel): boolean {
        return true;
    }

    protected filterPort(port: GPort): boolean {
        return true;
    }
}
