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
import type { Integration } from '../../../integration';
import { hasProperty } from '../../../utils/ts.utils';

export type DiagramShortcut = 'center' | 'fitToScreen' | 'layout';

export type DiagramShortcuts = Record<DiagramShortcut, string>;

/** Key bindings of the plain GLSP-Client, used when an integration does not rebind them. */
export const defaultDiagramShortcuts: DiagramShortcuts = {
    center: 'Control+Shift+C',
    fitToScreen: 'Control+Shift+F',
    layout: 'Control+Shift+L'
};

/**
 * Key bindings used by the tool platforms, which reserve `Control+Shift+*` for their own commands.
 *
 * Theia and VS Code both rebind the diagram commands this way. Third-party integrations for
 * platforms with the same conflict can reuse the convention instead of restating it.
 */
export const hostDiagramShortcuts: DiagramShortcuts = {
    center: 'Alt+C',
    fitToScreen: 'Alt+F',
    layout: 'Alt+L'
};

/** Implemented by host integrations that rebind the GLSP diagram commands. */
export interface DiagramShortcutIntegration extends Integration {
    readonly diagramShortcuts: DiagramShortcuts;
}

export namespace DiagramShortcutIntegration {
    export function is(integration: Integration): integration is DiagramShortcutIntegration {
        return hasProperty<DiagramShortcutIntegration>(integration, 'diagramShortcuts');
    }
}

/** Returns the keyboard shortcut for a diagram command under the active integration. */
export function provideDiagramShortcut(integration: Integration, shortcut: DiagramShortcut): string {
    return DiagramShortcutIntegration.is(integration) ? integration.diagramShortcuts[shortcut] : defaultDiagramShortcuts[shortcut];
}
