import { Effect } from "effect";
import { CommunicationError } from "../../internal_communication/protocol";
import { createMpo, receiveMpo } from "../create_mpo";
import { Json } from "../../../../../messaging/src/base/message";
import { InternalMessage } from "../../internal_communication/internal_message";
import { MessagePartner } from "../message_partner";

declare module "../message_partner" {
    interface MessagePartner {
        branch(data: Json): Effect.Effect<MessagePartner, CommunicationError>,
        on_branch(cb: (mpo: MessagePartner, data: Json) => void): void,
        __branch_cb: (mpo: MessagePartner, data: Json) => void
    }
}

export default function (MPC: typeof MessagePartner) {
    const cmd = "create_message_partner";
    MPC.prototype.branch = function (data: Json = null): Effect.Effect<MessagePartner, CommunicationError> {
        return createMpo<MessagePartner>(
            this,
            MessagePartner,
            cmd,
            data
        );
    }

    MPC.prototype.on_branch = function (cb: (mpo: MessagePartner, data: Json) => void): void {
        this.__branch_cb = cb;
    }

    MPC.prototype.__branch_cb = function (mpo: MessagePartner, data: Json): void {
        mpo.remove();
    }

    MPC.add_command({
        command: cmd,
        on_first_request: (mp: MessagePartner, im: InternalMessage, data: Json) => {
            return receiveMpo<MessagePartner>(mp, im, MessagePartner, (mpo) => {
                mp.__branch_cb(mpo, data);
            })
        }
    });
}