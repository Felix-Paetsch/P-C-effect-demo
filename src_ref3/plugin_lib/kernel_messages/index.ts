import { Json } from "../../../messaging/src/base/message";
import { Environment } from "../environment";
import { RequestMessage } from "../fetch/request_message";

type KernelMessageTypes = "default" | "plugin_request"

export class KernelMessage {
    constructor(
        readonly type: KernelMessageTypes = "default",
        readonly data: Json = {}
    ) { }

    get message() {
        return new RequestMessage(Environment.kernel_address, {
            type: this.type,
            data: this.data
        }, {
            "headers": {
                "message_type": "library_message",
                "library_message_type": "kernel_message"
            }
        })
    }

    as_transmittable() {
        return this.message.as_transmittable()
    }
}