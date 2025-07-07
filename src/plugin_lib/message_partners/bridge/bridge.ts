import { MessagePartnerObject } from "../message_partner_object";
import { Json } from "../../../../messaging/src/base/message";
import { Effect } from "effect";
import { InternalMessage } from "../internal_communication/internal_message";
import { CommunicationError, CommunicationErrorR } from "../internal_communication/protocol";

export class Bridge extends MessagePartnerObject {
    send(data: Json): Effect.Effect<void, CommunicationError> {
        return this._send_first_internal_message("send_bridge", data);
    }

    _recieve_internal_message(
        protocol_name: string,
        data: Json, im: InternalMessage
    ): Effect.Effect<void, CommunicationError> {
        if (protocol_name === "send_bridge") {
            return Effect.suspend(() => Effect.succeed(this.on_message_cb(data)));
        }

        return Effect.fail(new CommunicationErrorR({
            message: `Unknown protocol: ${protocol_name}`,
            data: { protocol: protocol_name },
            Message: im
        }));
    }

    private on_message_cb: (data: Json) => void = () => { };
    on(cb: (data: Json) => void) {
        this.on_message_cb = cb;
    }
}