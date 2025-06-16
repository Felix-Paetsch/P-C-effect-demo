import { Address } from "../../messaging/src/base/address";
import { Json, TransmittableMessage } from "../../messaging/src/base/message";
import { Recipient } from "./recipient/recipient";
import { Recipient } from "./recipient/type";

export default class Environment {
    constructor(
        public address: Address
    ) { }

    request_pluginE(plugin_ident: Json) {
        return this.kernel_messageE({
            "type": "request_plugin",
            plugin_ident
        });
    }

    kernel_messageE(body: Json) {
        return this.fetchE(
            Recipient.Kernel,
            {
                "body": body,
                "headers": {
                    "message_type": "kernel_message"
                }
            }
        )
    }

    fetchE(
        r: Recipient,
        data: {
            body: Json,
            headers: { [key: string]: Json }
        }
    ) {
        const msg = new Message()
    }
}
