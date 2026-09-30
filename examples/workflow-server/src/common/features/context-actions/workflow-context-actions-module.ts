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
import { BindingTarget, CommandPaletteActionProvider, ContextActionsModule, ContextMenuItemProvider } from '@eclipse-glsp/server';
import { WorkflowCommandPaletteActionProvider } from '../../provider/workflow-command-palette-action-provider';
import { WorkflowContextMenuItemProvider } from '../../provider/workflow-context-menu-item-provider';

/**
 * Context actions feature with the workflow context menu and command palette providers.
 * Replaces the corresponding GLSP default module in the workflow diagram setup.
 */
export class WorkflowContextActionsModule extends ContextActionsModule {
    protected override bindContextMenuItemProvider(): BindingTarget<ContextMenuItemProvider> | undefined {
        return WorkflowContextMenuItemProvider;
    }

    protected override bindCommandPaletteActionProvider(): BindingTarget<CommandPaletteActionProvider> | undefined {
        return WorkflowCommandPaletteActionProvider;
    }
}
