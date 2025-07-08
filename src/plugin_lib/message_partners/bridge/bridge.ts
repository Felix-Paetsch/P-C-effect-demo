import { MessagePartnerObject } from "../message_partner_object";
import { Json } from "../../../../messaging/src/utils/json";
import { Effect } from "effect";
import { CommunicationError } from "../internal_communication/protocol";
import { InternalCommunicationHandler } from "../internal_communication/internalCommunicationHandler";
import { dangerouslyRunPromise } from "../../../../messaging/src/utils/run";

export class Bridge extends MessagePartnerObject {
    send(data: Json): Effect.Effect<void, CommunicationError> {
        return this._send_first_internal_message("send_bridge", data);
    }

    __on_message_cb: (data: Json) => void = () => { };
    on(cb: (data: Json) => void) {
        this.__on_message_cb = cb;
        dangerouslyRunPromise(this._send_command("on_new_listener").pipe(Effect.ignore));
    }

    __on_listener_registered: () => void = () => { };
    on_listener_registered(cb: (b: Bridge) => void) {
        this.__on_listener_registered = () => cb(this);
    }
}

Bridge.add_command({
    command: "send_bridge",
    on_first_request: (mp: Bridge, im: InternalCommunicationHandler, data: Json) => {
        return Effect.suspend(() => Effect.succeed(mp.__on_message_cb(data)));
    }
});

Bridge.add_command({
    command: "on_new_listener",
    on_first_request: (mp: Bridge, im: InternalCommunicationHandler, data: Json) => {
        return Effect.suspend(() => Effect.succeed(mp.__on_listener_registered()));
    }
});