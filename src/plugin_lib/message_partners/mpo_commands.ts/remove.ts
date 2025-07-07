import { Effect } from "effect";
import { Json } from "../../../../messaging/src/base/message";
import { InternalMessage } from "../internal_communication/internal_message";
import { MessagePartnerObject } from "../message_partner_object";

declare module "../message_partner_object" {
    interface MessagePartnerObject {
        remove(): Effect.Effect<void, never, never>;
    }
}

export default function (MPC: typeof MessagePartnerObject) {
    MPC.add_command({
        command: "remove_mpo",
        on_first_request: (mp: MessagePartnerObject, im: InternalMessage, data: Json) => {
            return Effect.gen(mp, function* () {
                this.removed = true;
                return yield* im.respond("OK");
            })
        }
    });

    MPC.prototype.remove = function (): Effect.Effect<void, never, never> {
        return Effect.gen(this, function* () {
            this.removed = true;
            return yield* this._send_first_internal_message("remove_mpo").pipe(Effect.ignore);
        })
    }
}