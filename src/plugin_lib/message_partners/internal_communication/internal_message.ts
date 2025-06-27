import { Context, Effect, pipe, Schema } from "effect";
import { Json } from "../../../../messaging/src/base/message";
import { ProtocolError, ProtocolMessage, ProtocolMessageT } from "../../../../messaging/src/protocols/protocol";
import { MessagePartnerObject } from "../message_partner_object";
import { guard_mpo_still_active } from "./tools";
import { CommunicationError, getInternalMessageProtocolData, InternalMessageProtocolDataSchema, to_internal_message_protocol_error } from "./protocol";

export class InternalMessage {
    constructor(
        readonly pm: ProtocolMessage,
        readonly mpo: MessagePartnerObject,
        readonly data: Json,
        readonly mpo_protocol_name: string
    ) { }

    respond(data: Json = null): Effect.Effect<InternalMessage, CommunicationError> {
        const self = this;
        return this.pm.respond(Schema.encodeSync(InternalMessageProtocolDataSchema)({
            mpo_ident: self.mpo.ident,
            internal_message_protocol_name: self.mpo_protocol_name,
            protocol_data: data
        })).pipe(
            Effect.andThen(pme => InternalMessage.FromProtocolMessageEffect(
                pme, self.mpo, self.mpo_protocol_name
            )),
            Effect.mapError(e => to_internal_message_protocol_error(e, self))
        )
    }

    // When processing a mpo message it is guaranteed that the mpo is still active
    static FromProtocolMessageEffect(
        pme: Effect.Effect<ProtocolMessage, ProtocolError>,
        mpo: MessagePartnerObject,
        mpo_protocol_name: string
    ): Effect.Effect<InternalMessage, ProtocolError> {
        return pme.pipe(
            Effect.andThen(pm => pipe(
                guard_mpo_still_active(mpo),
                Effect.andThen(_ => Effect.gen(function* (_) {
                    const data = yield* getInternalMessageProtocolData;
                    return new InternalMessage(
                        pm, mpo, data.protocol_data, mpo_protocol_name
                    );
                })),
                Effect.provideService(ProtocolMessageT, pm)
            ))
        )
    }
}

export class InternalMessageT extends Context.Tag("InternalMessageT")<InternalMessageT, InternalMessage>() { }
