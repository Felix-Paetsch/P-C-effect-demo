import { Address } from "../../messaging/src/base/address";
import { Environment } from "../../messaging/src/base/environment";
import { Json } from "./utils/json";
import { ResultPromise } from "../../messaging/src/utils/run";
import { ProtocolError } from "./message_partners/internal_communication/protocol";
import { MessagePartner } from "./message_partners/message_partner/message_partner";

export class PluginEnvironment {
    constructor(
        readonly env: Environment,
        readonly kernel_address: Address,
        readonly instance_uuid: string
    ) { }

    get_plugin(plugin_ident: Json, data?: Json): ResultPromise<MessagePartner, ProtocolError> {
        throw new Error("Method not implemented.");
    }

    on_plugin_request(mp: MessagePartner, data?: Json): void {
        throw new Error("Method not implemented.");
    }
}
