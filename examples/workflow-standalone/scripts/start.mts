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
import concurrently from 'concurrently';
import * as fs from 'fs';
import * as path from 'path';

const isBrowser = process.argv.includes('--browser');
const isDev = process.argv.includes('--dev');
const isMcp = process.argv.includes('--mcp');
const noOpen = process.argv.includes('--no-open');

const hasExternalServer = process.argv.includes('--external-server');

// The Node/WebSocket server lives in the sibling workflow-server example (built straight from this
// workspace - no registry download). The browser worker is bundled by ./esbuild.js, not started here.
const WORKFLOW_SERVER_DIR = path.resolve(import.meta.dirname, '..', '..', 'workflow-server');
const WORKFLOW_SERVER_ESBUILD = path.join(WORKFLOW_SERVER_DIR, 'esbuild.js');
const NODE_SERVER_BUNDLE = path.resolve(import.meta.dirname, '..', '..', 'workflow-server-bundled', 'wf-glsp-server-node.js');

function argValue(flag: string, defaultValue: string): string {
    const index = process.argv.indexOf(flag);
    return index >= 0 && index + 1 < process.argv.length ? process.argv[index + 1] : defaultValue;
}

/**
 * Resolve the command that provides the Node/WebSocket GLSP server, or `undefined` when the caller
 * brings their own (e.g. a Java server via bare `--external-server`).
 */
function resolveServerCommand(port: string, host: string): string | undefined {
    if (hasExternalServer) {
        // `--external-server`: the user runs their own GLSP server (e.g. the Java workflow server, or
        // a Node server launched from an IDE); we start only the client and it connects over WebSocket.
        return undefined;
    }
    if (isDev) {
        // Watch + restart the server on source changes; the client reconnects automatically.
        return `node ${WORKFLOW_SERVER_ESBUILD} --watch --run-node -- -w --port ${port} --host ${host}`;
    }
    // `start` serves the pre-built bundles; unlike `dev` it does not compile. If the bundle is missing
    // the workspace has not been built - fail fast with guidance rather than a cryptic runtime error.
    if (!fs.existsSync(NODE_SERVER_BUNDLE)) {
        console.error(
            `Error: Node server bundle not found at ${NODE_SERVER_BUNDLE}.\nRun \`pnpm build\` first, or use \`pnpm dev\` to build and watch from sources.`
        );
        process.exit(1);
    }
    return `node ${NODE_SERVER_BUNDLE} -w --port ${port} --host ${host}`;
}

async function run(): Promise<void> {
    if (isBrowser && hasExternalServer) {
        console.error('Error: --external-server is only supported in Node/WebSocket mode, not in browser mode.');
        process.exit(1);
    }

    // dev rebuilds + live-reloads on change; start just serves the freshly built bundle.
    const clientMode = isDev ? '--watch' : '--serve';
    const clientCmd = `node ./esbuild.js ${clientMode}${isBrowser ? ' --browser' : ''}${isMcp ? ' --mcp' : ''}${noOpen ? ' --no-open' : ''}`;
    const commands: { command: string; name: string }[] = [];
    const prefixColors: string[] = [];

    const clientPort = argValue('--client-port', isBrowser ? '8083' : '8082');
    process.env.CLIENT_PORT = clientPort;

    if (isDev) {
        // esbuild bundles from the packages' compiled `lib/`, so source edits only reach the running
        // app if something recompiles them: nodemon runs an incremental `tsc -b` (from the workspace
        // root via `pnpm -w`) on every change. One-shot builds instead of `tsc -b --watch` because
        // TypeScript 7's watch mode re-triggers on its own emit; plain directories instead of globs
        // because nodemon's glob watching misses atomic editor saves. The ignores keep the build
        // outputs from re-triggering the loop.
        const tscBuild =
            'nodemon --watch packages --watch examples --ext ts,tsx,json ' +
            "--ignore '**/lib/**' --ignore 'examples/workflow-standalone/app/**' --delay 0.3 --exec 'tsc -b'";
        commands.push({ command: `pnpm -w exec ${tscBuild}`, name: 'tsc' });
        prefixColors.push('blue');
    }

    if (!isBrowser) {
        const serverCommand = resolveServerCommand(argValue('--port', '8081'), argValue('--host', 'localhost'));
        if (serverCommand) {
            commands.push({ command: serverCommand, name: 'server' });
            prefixColors.push('green');
        }
    }

    commands.push({ command: clientCmd, name: 'web' });
    prefixColors.push('yellow');

    // concurrently forwards SIGINT/SIGTERM to its children and tears them down itself, so no manual
    // signal handling is needed - just mirror its outcome as the process exit code.
    const { result } = concurrently(commands, {
        prefix: 'name',
        prefixColors,
        killOthersOn: ['failure', 'success']
    });

    result.then(
        () => process.exit(0),
        () => process.exit(1)
    );
}

run();
