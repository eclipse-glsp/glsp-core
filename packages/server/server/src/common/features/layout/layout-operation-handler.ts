/********************************************************************************
 * Copyright (c) 2022-2026 STMicroelectronics and others.
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
import { ChangeBoundsOperation, ChangeRoutingPointsOperation, LayoutOperation, MaybePromise, Operation } from '@eclipse-glsp/protocol';
import { inject, injectable, optional } from 'inversify';
import { Command, CompoundCommand } from '../../command/command';
import { GModelRecordingCommand } from '../../command/recording-command';
import { DiagramConfiguration, ServerLayoutKind } from '../../diagram/diagram-configuration';
import { OperationHandler } from '../../operations/operation-handler';
import { OperationHandlerRegistry } from '../../operations/operation-handler-registry';
import { Logger } from '../../utils/logger';
import { GModelSerializer } from '../model/gmodel-serializer';
import { LayoutEngine, LayoutResult } from './layout-engine';

/**
 * The default handler for {@link LayoutOperation}s. Invokes the (optional) layout engine if the server is configured
 * for manual layouting.
 *
 * If the layout engine implements {@link LayoutEngine.computeLayout}, the computed {@link LayoutResult} is persisted
 * through the diagram language's handlers for {@link ChangeBoundsOperation}s and {@link ChangeRoutingPointsOperation}s,
 * i.e. the same way a manual move or reroute is persisted. All changes are combined into one command, so a layout is
 * undone in a single step. This also works for diagram languages with a custom source model, where changes made only
 * to the graphical model are lost as soon as it is derived again.
 *
 * Otherwise, the layout engine modifies the graphical model directly and the changes are not persisted in a custom
 * source model.
 */
@injectable()
export class LayoutOperationHandler extends OperationHandler {
    @inject(Logger)
    protected logger: Logger;

    @inject(LayoutEngine)
    @optional()
    protected layoutEngine?: LayoutEngine;

    @inject(DiagramConfiguration)
    protected diagramConfiguration: DiagramConfiguration;

    @inject(GModelSerializer)
    protected serializer: GModelSerializer;

    @inject(OperationHandlerRegistry)
    protected operationHandlerRegistry: OperationHandlerRegistry;

    readonly operationType = LayoutOperation.KIND;

    async createCommand(operation: LayoutOperation): Promise<Command | undefined> {
        if (this.diagramConfiguration.layoutKind !== ServerLayoutKind.MANUAL) {
            return undefined;
        }
        if (!this.layoutEngine) {
            this.logger.warn('Could not execute layout operation. No `LayoutEngine` is bound!');
            return undefined;
        }
        if (!this.layoutEngine.computeLayout) {
            this.logger.info(
                'The bound `LayoutEngine` does not implement `computeLayout`. ' +
                    'The layout is applied to the graphical model only and is not persisted in a custom source model.'
            );
            return new GModelRecordingCommand(this.modelState, this.serializer, () => this.executeOperation(operation));
        }
        const result = await this.layoutEngine.computeLayout(operation);
        return this.createLayoutCommand(result, operation);
    }

    /**
     * Creates the command that persists the given layout result. Override to persist a layout differently, e.g. in a
     * single source model transaction.
     *
     * Without a handler for {@link ChangeBoundsOperation}s the layout is not persisted at all, as moving the shapes is
     * the core of a layout and rerouting edges between shapes that did not move would leave the diagram inconsistent.
     * @param result the layout result computed by the layout engine
     * @param operation the operation that triggered the layout
     * @returns the command, or `undefined` if there is nothing to persist.
     */
    protected async createLayoutCommand(result: LayoutResult, operation: LayoutOperation): Promise<Command | undefined> {
        if (!this.operationHandlerRegistry.getOperationHandler(ChangeBoundsOperation.create([]))) {
            this.logger.warn('Could not persist the layout. No handler for `ChangeBoundsOperation`s is registered!');
            return undefined;
        }
        const commands: Command[] = [];
        const boundsCommand = await this.createChangeBoundsCommand(result, operation);
        if (boundsCommand) {
            commands.push(boundsCommand);
        }
        const routingPointsCommand = await this.createChangeRoutingPointsCommand(result, operation);
        if (routingPointsCommand) {
            commands.push(routingPointsCommand);
        }
        return commands.length > 0 ? new CompoundCommand(commands) : undefined;
    }

    /**
     * Creates the command that persists the new bounds of the given layout result, using the diagram language's handler
     * for {@link ChangeBoundsOperation}s.
     */
    protected createChangeBoundsCommand(result: LayoutResult, _operation: LayoutOperation): MaybePromise<Command | undefined> {
        return this.createDelegateCommand(ChangeBoundsOperation.create(result.bounds));
    }

    /**
     * Creates the command that persists the new routing points of the given layout result, using the diagram language's
     * handler for {@link ChangeRoutingPointsOperation}s.
     */
    protected createChangeRoutingPointsCommand(result: LayoutResult, _operation: LayoutOperation): MaybePromise<Command | undefined> {
        return this.createDelegateCommand(ChangeRoutingPointsOperation.create(result.routingPoints));
    }

    protected createDelegateCommand(operation: Operation): MaybePromise<Command | undefined> {
        return this.operationHandlerRegistry.getOperationHandler(operation)?.execute(operation);
    }

    protected async executeOperation(operation: LayoutOperation): Promise<void> {
        await this.layoutEngine?.layout(operation);
    }
}
