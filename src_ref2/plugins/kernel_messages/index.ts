import { Json, Message } from "../../../messaging/src/base/message";
import { Environment } from "../environment";

export class KernelMessage {
    constructor(
        readonly type: string = "default",
        readonly data: Json = {}
    ) { }

    get message() {
        return new Message(Environment.kernel_address, {
            type: this.type,
            data: this.data
        }, {
            "message_type": "kernel_message"
        })
    }

    as_transmittable() {
        return this.message.as_transmittable()
    }
}