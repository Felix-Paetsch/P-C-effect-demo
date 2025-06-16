import { Json, Message } from "../../../messaging/src/base/message";
import { Environment } from "../environment";

type KernelMessageTypes = "default" | "plugin_request"

export class KernelMessage {
    constructor(
        readonly type: KernelMessageTypes = "default",
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