import { Effect } from "effect";
import { Bridge } from "../../bridge/bridge";
import { CommunicationError } from "../../internal_communication/protocol";
import { createMpo, receiveMpo } from "../create_mpo";
import { Json } from "../../../../../messaging/src/base/message";
import { InternalMessage } from "../../internal_communication/internal_message";
import { MessagePartner } from "../message_partner";

declare module "../message_partner" {
    interface MessagePartner {
        bridge(data?: Json): Effect.Effect<Bridge, CommunicationError>,
        on_bridge(cb: (mpo: Bridge, data: Json) => void): void,
        __bridge_cb: (mpo: Bridge, data: Json) => void
    }
}

export default function (MPC: typeof MessagePartner) {
    const cmd = "create_bridge";
    MPC.prototype.bridge = function (data: Json = null): Effect.Effect<Bridge, CommunicationError> {
        return createMpo<Bridge>(
            this,
            Bridge,
            cmd,
            data
        );
    }

    MPC.prototype.on_bridge = function (cb: (mpo: Bridge, data: Json) => void): void {
        this.__bridge_cb = cb;
    }

    MPC.prototype.__bridge_cb = function (mpo: Bridge, data: Json): void {
        mpo.remove();
    }

    MPC.add_command({
        command: cmd,
        on_first_request: (mp: MessagePartner, im: InternalMessage, data: Json) => {
            return receiveMpo<Bridge>(mp, im, Bridge, (mpo) => {
                mp.__bridge_cb(mpo, data);
            })
        }
    });
}