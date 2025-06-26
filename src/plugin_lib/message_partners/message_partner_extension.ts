import { Effect } from "effect";
import { MessagePartner } from "./message_partner";
import { ProtocolError } from "../../../messaging/src/protocols/protocol";
import { EnvironmentT } from "../../../messaging/src/base/environment";
import { CreateMPO } from "./mpo_internal_communication/mpo_protocols/create_message_partner_object";

declare module "./message_partner" {
    interface MessagePartner {
        branch: () => Effect.Effect<MessagePartner, ProtocolError, EnvironmentT>;
        on_branch: (func: (mp: MessagePartner) => Effect.Effect<void, never, never>) => void;
    }
}

MessagePartner.prototype.branch = function () {
    const self = this;
    const r = CreateMPO.mpo_run(self, {
        method: "branch",
        class: self.constructor.name,
        data: {}
    }).pipe(
        Effect.andThen(mpo => Effect.gen(function* (_) {
            if (!(mpo instanceof MessagePartner)) {
                yield* Effect.die(new Error("Expected MessagePartner, got " + mpo.constructor.name))
            }
            return mpo as MessagePartner;
        }))
    )

    return r;
};

(MessagePartner.prototype as any)._on_branch = () => { };
MessagePartner.prototype.on_branch = function (func) {
    (this as any)._on_branch = func;
}