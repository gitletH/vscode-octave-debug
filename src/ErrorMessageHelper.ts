/**
 * Helper for parsing message from debug rumtime from stderr
 */
import * as RX from './RegExp';
import { consoleErr } from './utils';
import { DebugProtocol } from 'vscode-debugprotocol';

export function isStopMessage(lines: string[]) {
    if (lines.length < 3) {
        return false;
    }
    return RX.stopMessage.firstLine.test(lines[lines.length - 3]) &&
        RX.stopMessage.secondLine.test(lines[lines.length - 2]) &&
        RX.stopMessage.thirdLine.test(lines[lines.length - 1]);
}

export function getStackFrames(lines: string[]): DebugProtocol.StackFrame[] {
    let i = lines.findIndex((s) => RX.stackFrame.start.test(s)) + 1;
    if (i < 0) {
        consoleErr('list stack frame is expected, but not found');
        return [];
    }

    let ans: DebugProtocol.StackFrame[] = [];
    let frameId = 0;
    let match;
    while(match = lines[i++].match(RX.stackFrame.frame)) {
        ans.push(<DebugProtocol.StackFrame>{
            id: frameId++,
            name: match[1],
            source: match[1] + '.m',
            line: Number(match[2]),
            column: Number(match[3])
        });
    }
    return ans;
}