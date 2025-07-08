import { MessagePartner } from "../message_partner";
import { Effect } from "effect";
import { createMpo, receiveMpo } from "../create_mpo";
import { CommunicationError } from "../../internal_communication/protocol";
import { SignalSender } from "../../signal/sender";
import { InternalMessage } from "../../internal_communication/internal_message";
import { Json } from "../../../../../messaging/src/base/message";
import { SignalReciever } from "../../signal/reciever";

declare module "../message_partner" {
    interface MessagePartner {
        signal(): Effect.Effect<SignalSender, CommunicationError>;
        on_signal(cb: (mpo: SignalReciever, data: Json) => void): void,
        __signal_cb: (mpo: SignalReciever, data: Json) => void
    }
}

export default function (MPC: typeof MessagePartner) {
    const cmd = "create_signal";
    MPC.prototype.signal = function (data: Json = null): Effect.Effect<SignalReciever, CommunicationError> {
        return createMpo<SignalReciever>(
            this,
            SignalReciever,
            cmd,
            data
        );
    }

    MPC.prototype.on_signal = function (cb: (mpo: SignalReciever, data: Json) => void): void {
        this.__signal_cb = cb;
    }

    MPC.prototype.__signal_cb = function (mpo: SignalReciever, data: Json): void {
        mpo.remove();
    }

    MPC.add_command({
        command: cmd,
        on_first_request: (mp: MessagePartner, im: InternalMessage, data: Json) => {
            return receiveMpo<SignalReciever>(mp, im, SignalReciever, (mpo) => {
                mp.__signal_cb(mpo, data);
            })
        }
    });
}