import { Context, Effect, pipe, Schema } from "effect";
import { Json } from "../../../../messaging/src/base/message";
import { ProtocolError, ProtocolMessage, ProtocolMessageT } from "../../../../messaging/src/protocols/protocol";
import { MessagePartnerObject } from "../message_partner_object";
import { guard_mpo_still_active, get_mpo_protocol_data } from "./messaging_protocol/mpo_tools";
import { MPOProtocolDataSchema } from "./messaging_protocol/message_partner_object_communication";
import { MPOProtocolError, to_mpo_protocol_error } from "./mpo_protocols/mpo_protocol";

export class MPOMessage {
    constructor(
        readonly pm: ProtocolMessage,
        readonly mpo: MessagePartnerObject,
        readonly data: Json,
        readonly mpo_protocol_name: string
    ) { }

    respond(data: Json = null): Effect.Effect<MPOMessage, MPOProtocolError> {
        const self = this;
        return this.pm.respond(Schema.encodeSync(MPOProtocolDataSchema)({
            mpo_ident: self.mpo.ident,
            mpo_protocol_name: self.mpo_protocol_name,
            protocol_data: data
        })).pipe(
            Effect.andThen(pme => MPOMessage.FromProtocolMessageEffect(
                pme, self.mpo, self.mpo_protocol_name
            )),
            Effect.mapError(e => to_mpo_protocol_error(e, self))
        )
    }

    // When processing a mpo message it is guaranteed that the mpo is still active
    static FromProtocolMessageEffect(
        pme: Effect.Effect<ProtocolMessage, ProtocolError>,
        mpo: MessagePartnerObject,
        mpo_protocol_name: string
    ): Effect.Effect<MPOMessage, ProtocolError> {
        return pme.pipe(
            Effect.andThen(pm => pipe(
                guard_mpo_still_active(mpo),
                Effect.andThen(_ => Effect.gen(function* (_) {
                    const data = yield* get_mpo_protocol_data;
                    return new MPOMessage(
                        pm, mpo, data.protocol_data, mpo_protocol_name
                    );
                })),
                Effect.provideService(ProtocolMessageT, pm)
            ))
        )
    }
}

export class MPOMessageT extends Context.Tag("MPOMessageT")<MPOMessageT, MPOMessage>() { }
