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
import type { WorkflowTest } from '../workflow-test';
import { ContextMenuSuiteOptions, defineContextMenuSuite } from './context-menu.suite';
import { ConnectableElementSuiteOptions, defineConnectableElementSuite } from './core/connectable-element.suite';
import { DebugStandaloneSuiteOptions, defineDebugStandaloneSuite } from './core/debug.standalone.suite';
import { defineEdgeSuite, EdgeSuiteOptions } from './core/edge.suite';
import { defineGraphSuite, GraphSuiteOptions } from './core/graph.suite';
import { defineParentSuite, ParentSuiteOptions } from './core/parent.suite';
import { defineShortcutsSuite, ShortcutsSuiteOptions } from './core/shortcuts.suite';
import { defineResizeHandleSuite, ResizeHandleSuiteOptions } from './features/change-bounds/resize-handle.suite';
import { CommandPaletteSuiteOptions, defineCommandPaletteSuite } from './features/command-palette/command-palette.suite';
import { definePopupSuite, PopupSuiteOptions } from './features/hover/popup.suite';
import { defineLabelEditToolSuite, LabelEditToolSuiteOptions } from './features/label-edit/label-edit-tool.suite';
import { defineRoutingPointSuite, RoutingPointSuiteOptions } from './features/routing/routing-point.suite';
import {
    defineSelectKeybindingStandaloneSuite,
    SelectKeybindingStandaloneSuiteOptions
} from './features/select/select-keybinding.standalone.suite';
import { defineSelectSuite, SelectSuiteOptions } from './features/select/select.suite';
import { defineToolPaletteSuite, ToolPaletteSuiteOptions } from './features/tool-palette/tool-palette.suite';
import { defineDeletionToolSuite, DeletionToolSuiteOptions } from './features/tools/deletion/deletion-tool.suite';
import { defineEdgeCreationToolSuite, EdgeCreationToolSuiteOptions } from './features/tools/edge-creation/edge-creation-tool.suite';
import { defineEdgeEditToolSuite, EdgeEditToolSuiteOptions } from './features/tools/edge-edit/edge-edit-tool.suite';
import { defineNodeCreationToolSuite, NodeCreationToolSuiteOptions } from './features/tools/node-creation/node-creation-tool.suite';
import { defineUndoRedoSuite, UndoRedoSuiteOptions } from './features/undo-redo/undo-redo.suite';
import { defineMarkerNavigatorSuite, MarkerNavigatorSuiteOptions } from './features/validation/marker-navigator.suite';
import { defineMarkerSuite, MarkerSuiteOptions } from './features/validation/marker.suite';

/**
 * Registration options (suite and case skips, title and body overrides) for all
 * integration-independent Workflow suites.
 */
export interface WorkflowSuitesOptions {
    commandPalette?: CommandPaletteSuiteOptions;
    connectableElement?: ConnectableElementSuiteOptions;
    contextMenu?: ContextMenuSuiteOptions;
    deletionTool?: DeletionToolSuiteOptions;
    edge?: EdgeSuiteOptions;
    edgeCreationTool?: EdgeCreationToolSuiteOptions;
    edgeEditTool?: EdgeEditToolSuiteOptions;
    graph?: GraphSuiteOptions;
    labelEditTool?: LabelEditToolSuiteOptions;
    marker?: MarkerSuiteOptions;
    markerNavigator?: MarkerNavigatorSuiteOptions;
    nodeCreationTool?: NodeCreationToolSuiteOptions;
    parent?: ParentSuiteOptions;
    popup?: PopupSuiteOptions;
    resizeHandle?: ResizeHandleSuiteOptions;
    routingPoint?: RoutingPointSuiteOptions;
    select?: SelectSuiteOptions;
    shortcuts?: ShortcutsSuiteOptions;
    toolPalette?: ToolPaletteSuiteOptions;
    undoRedo?: UndoRedoSuiteOptions;
}

/** Options for suites that only apply to the standalone Workflow application. */
export interface StandaloneWorkflowSuitesOptions extends WorkflowSuitesOptions {
    debug?: DebugStandaloneSuiteOptions;
    selectKeybinding?: SelectKeybindingStandaloneSuiteOptions;
}

/** Name of a reusable Workflow suite, i.e. the key its options are registered under. */
export type WorkflowSuiteName = keyof StandaloneWorkflowSuitesOptions;

/**
 * Registers the complete Workflow contract shared by standalone, Theia and VS Code integrations.
 *
 * @param test test instance configured for the target integration
 * @param options per-suite and per-case skips and title overrides
 */
export function defineWorkflowSuites(test: WorkflowTest, options: WorkflowSuitesOptions = {}): void {
    defineConnectableElementSuite(test, options.connectableElement);
    defineEdgeSuite(test, options.edge);
    defineGraphSuite(test, options.graph);
    defineParentSuite(test, options.parent);
    defineShortcutsSuite(test, options.shortcuts);
    defineContextMenuSuite(test, options.contextMenu);
    defineResizeHandleSuite(test, options.resizeHandle);
    defineCommandPaletteSuite(test, options.commandPalette);
    definePopupSuite(test, options.popup);
    defineLabelEditToolSuite(test, options.labelEditTool);
    defineRoutingPointSuite(test, options.routingPoint);
    defineSelectSuite(test, options.select);
    defineToolPaletteSuite(test, options.toolPalette);
    defineDeletionToolSuite(test, options.deletionTool);
    defineEdgeCreationToolSuite(test, options.edgeCreationTool);
    defineEdgeEditToolSuite(test, options.edgeEditTool);
    defineNodeCreationToolSuite(test, options.nodeCreationTool);
    defineUndoRedoSuite(test, options.undoRedo);
    defineMarkerNavigatorSuite(test, options.markerNavigator);
    defineMarkerSuite(test, options.marker);
}

/**
 * Registers the full standalone contract, including suites that do not apply to editor integrations.
 *
 * @param test test instance configured for a standalone Workflow application
 * @param options per-suite and per-case skips and title overrides
 */
export function defineStandaloneWorkflowSuites(test: WorkflowTest, options: StandaloneWorkflowSuitesOptions = {}): void {
    defineWorkflowSuites(test, options);
    defineDebugStandaloneSuite(test, options.debug);
    defineSelectKeybindingStandaloneSuite(test, options.selectKeybinding);
}
