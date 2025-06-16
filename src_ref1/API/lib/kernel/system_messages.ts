import { Json } from "../../../messaging/src/base/message";

class InteropMessage {
    constructor(
        public type: string,
        public data: Json
    ) { }
}

export class SystemMessage extends InteropMessage { }
export class KernelMessage extends InteropMessage { }

export class SystemRequest extends SystemMessage {
    respond(data: Json) { }
}

export function listenSystemMessages(
    listener: (m: SystemMessage) => void
) {
}

export function sendKenerlMessage(m: KernelMessage) {

}