import { MessagePartnerObject } from "../message_partner_object";
import { Json } from "../../../../messaging/src/utils/json";
import { Effect } from "effect";
import { CommunicationError } from "../internal_communication/protocol";
import { InternalCommunicationHandler } from "../internal_communication/internalCommunicationHandler";
import { callbackAsEffect, CallbackError, runEffectAsPromise, Result, runEffectAsPromiseFlash } from "../../../../messaging/src/utils/run";

export class Bridge extends MessagePartnerObject {
    send(data: Json): Promise<Result<null, CommunicationError>> {
        return this._send_first_internal_message("send_bridge", data).pipe(
            Effect.andThen((e) => e),
            Effect.as(null),
            runEffectAsPromiseFlash
        );
    }

    __on_message_cb: (data: Json) => Effect.Effect<void, CallbackError> = () => Effect.void;
    on(cb: (data: Json) => void) {
        this.__on_message_cb = callbackAsEffect(cb);
        this._send_command("on_new_listener").pipe(
            Effect.ignore,
            runEffectAsPromise
        );
    }

    __on_listener_registered: () => Effect.Effect<void, CallbackError> = () => Effect.void;;
    on_listener_registered(cb: (b: Bridge) => void) {
        this.__on_listener_registered = () => callbackAsEffect(cb)(this);
    }
}

Bridge.add_command({
    command: "send_bridge",
    on_first_request: (mp: Bridge, im: InternalCommunicationHandler, data: Json) => {
        return mp.__on_message_cb(data).pipe(Effect.ignore);
    }
});

Bridge.add_command({
    command: "on_new_listener",
    on_first_request: (mp: Bridge, im: InternalCommunicationHandler, data: Json) => {
        return mp.__on_listener_registered().pipe(Effect.ignore);
    }
});