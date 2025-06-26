import { Effect, Schema } from "effect";

import { Json } from "../../../../../messaging/src/base/message";
import { InternalMessage, InternalMessageT } from "../internal_message";
import { ProtocolError, ProtocolErrorN, ProtocolMessageT } from "../../../../../messaging/src/protocols/protocol";
import { MessagePartnerObject, MessagePartnerObjectIdentStruct } from "../../message_partner_object";
import { EnvironmentT } from "../../../../../messaging/src/base/environment";
import { get_mpo_protocol_data, get_message_partner_object } from "./mpo_tools";
import { Protocol } from "../../../../../messaging/src/protocols/protocol";
import { MPOProtocol } from "../mpo_protocols/mpo_protocol";

export const MPOProtocolDataSchema = Schema.Struct({
    mpo_ident: MessagePartnerObjectIdentStruct,
    mpo_protocol_name: Schema.String,
    protocol_data: Schema.Any
});

export type MessagePartnerObjectData = Schema.Schema.Type<typeof MPOProtocolDataSchema>;

class MessagePartnerObjectCommunicationProtocol extends Protocol<InternalMessage, InternalMessage> {
    constructor() {
        super("message_partner_object_communication", "main", "1.0.0");
    }

    private mpo_protocols: MPOProtocol<any, any>[] = [];
    add_mpo_protocol(mpo_protocol: MPOProtocol<any, any>) {
        this.mpo_protocols.push(mpo_protocol);
    }

    on_callback = (im: InternalMessage): Effect.Effect<void, never, never> => {
        const mpo_protocol = this.mpo_protocols.find(mpo_protocol => mpo_protocol.name === im.mpo_protocol_name);
        if (mpo_protocol) {
            return mpo_protocol.on_first_request.pipe(
                Effect.provideService(InternalMessageT, im),
                Effect.ignore
            )
        }
        return Effect.void;
    }

    mpo_run(mpo: MessagePartnerObject, mpo_protocol_name: string, protocol_data: Json) {
        return this.send_first_message(mpo.message_partner.address, Schema.encodeSync(MPOProtocolDataSchema)({
            mpo_ident: mpo.ident,
            mpo_protocol_name,
            protocol_data
        })).pipe(
            Effect.andThen(pme => Effect.gen(function* (_) {
                const env = yield* _(EnvironmentT);
                return pme.pipe(
                    Effect.provideService(EnvironmentT, env)
                );
            })),
            Effect.andThen(pme => InternalMessage.FromProtocolMessageEffect(pme, mpo, mpo_protocol_name)),
            Effect.catchAll(e => Effect.gen(function* (_) {
                return yield* Effect.fail(new ProtocolErrorN({
                    message: "Failed to create internal message",
                    error: e
                }))
            }))
        )
    }

    get on_first_request(): Effect.Effect<void, ProtocolError, ProtocolMessageT> {
        const self = this;
        return Effect.gen(function* (_) {
            const msg = yield* _(ProtocolMessageT);
            const data = yield* get_mpo_protocol_data;
            const mpo = yield* get_message_partner_object(data.mpo_ident);
            return yield* self.on_callback(
                new InternalMessage(msg, mpo, data.protocol_data, data.mpo_protocol_name)
            );
        })
    }
}

export const MessagePartnerObjectCommunication = new MessagePartnerObjectCommunicationProtocol();