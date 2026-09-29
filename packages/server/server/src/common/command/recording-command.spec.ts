/********************************************************************************
 * Copyright (c) 2023-2026 EclipseSource and others.
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

import { AnyObject, MaybePromise } from '@eclipse-glsp/protocol';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AbstractRecordingCommand } from './recording-command';

interface TestModel {
    string: string;
    number: number;
    flag: boolean;
    maybe?: AnyObject;
}

let jsonObject: TestModel;

class TestRecordingCommand<JsonObject extends AnyObject = AnyObject> extends AbstractRecordingCommand<JsonObject> {
    constructor(
        protected jsonObject: JsonObject,
        protected doExecute: () => MaybePromise<void>
    ) {
        super();
    }

    protected getJsonObject(): MaybePromise<JsonObject> {
        return this.jsonObject;
    }
}

describe('RecordingCommand', () => {
    let beforeState: TestModel;

    beforeEach(() => {
        jsonObject = {
            string: 'foo',
            number: 0,
            flag: true
        };
        beforeState = JSON.parse(JSON.stringify(jsonObject));
    });

    it('should be undoable after execution', async () => {
        const command = new TestRecordingCommand(jsonObject, () => {});
        expect(command.canUndo()).toBe(false);
        await command.execute();
        expect(command.canUndo()).toBe(true);
    });

    it('should restore the pre execution state when undo is called', async () => {
        const command = new TestRecordingCommand(jsonObject, () => {
            jsonObject.string = 'bar';
            jsonObject.flag = false;
            jsonObject.maybe = { hello: 'world' };
        });
        await command.execute();
        expect(jsonObject).not.toEqual(beforeState);
        await command.undo();
        expect(jsonObject).toEqual(beforeState);
    });

    it('should restore the post execution state when redo is called', async () => {
        const command = new TestRecordingCommand(jsonObject, () => {
            jsonObject.string = 'bar';
            jsonObject.flag = false;
            jsonObject.maybe = { hello: 'world' };
        });
        await command.execute();
        const afterState = JSON.parse(JSON.stringify(jsonObject));
        jsonObject = JSON.parse(JSON.stringify(afterState));
        await command.redo();
        expect(jsonObject).toEqual(afterState);
    });

    it('should roll back partial changes and rethrow if the execution fails', async () => {
        const error = new Error('execution failed');
        const command = new TestRecordingCommand(jsonObject, () => {
            jsonObject.string = 'bar';
            jsonObject.maybe = { hello: 'world' };
            throw error;
        });
        await expect(command.execute()).rejects.toBe(error);
        expect(jsonObject).toEqual(beforeState);
        expect(command.canUndo()).toBe(false);
    });

    it('should rethrow the execution error if the rollback fails', async () => {
        const error = new Error('execution failed');
        const rollbackError = new Error('rollback failed');
        const command = new TestRecordingCommand(jsonObject, () => {
            throw error;
        });
        vi.spyOn(command as unknown as { rollback: () => Promise<void> }, 'rollback').mockRejectedValue(rollbackError);
        const handleRollbackError = vi
            .spyOn(command as unknown as { handleRollbackError: (error: unknown) => void }, 'handleRollbackError')
            .mockImplementation(() => {});
        await expect(command.execute()).rejects.toBe(error);
        expect(handleRollbackError).toHaveBeenCalledWith(rollbackError);
    });
});
