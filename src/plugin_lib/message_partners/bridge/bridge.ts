import { MessagePartnerObject, MPOInitializationError } from "../message_partner_object";
import { Json } from "../../../../messaging/src/utils/json";
import { Effect } from "effect";
import { InternalMessage } from "../internal_communication/internal_message";
import { CommunicationError } from "../internal_communication/protocol";

export class Bridge extends MessagePartnerObject {
    send(data: Json): Effect.Effect<void, CommunicationError> {
        return this._send_first_internal_message("send_bridge", data);
    }

    __on_message_cb: (data: Json) => void = () => { };
    on(cb: (data: Json) => void) {
        this.__on_message_cb = cb;
    }
}

Bridge.add_command({
    command: "send_bridge",
    on_first_request: (mp: Bridge, im: InternalMessage, data: Json) => {
        return Effect.succeed(mp.__on_message_cb(data));
    }
});