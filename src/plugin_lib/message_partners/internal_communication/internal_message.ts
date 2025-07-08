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
        readonly protocol: string
    ) { }

    requestRespond(data: Json = null, timeout?: number): Effect.Effect<
        InternalMessage,
        CommunicationError,
        never
    > {
        return this.pm.requestRespond(Schema.encodeSync(InternalMessageProtocolDataSchema)({
            mpo_ident: this.mpo.ident,
            internal_message_protocol_name: this.protocol,
            protocol_data: data
        }), timeout).pipe(
            Effect.andThen(pm => InternalMessage.FromProtocolMessage(
                pm, this.mpo, this.protocol
            )),
            Effect.mapError(e => to_internal_message_protocol_error(e, this))
        )
    }

    respond(data: Json = null): Effect.Effect<
        void,
        CommunicationError,
        never
    > {
        return this.pm.respond(Schema.encodeSync(InternalMessageProtocolDataSchema)({
            mpo_ident: this.mpo.ident,
            internal_message_protocol_name: this.protocol,
            protocol_data: data
        })).pipe(
            Effect.mapError(e => to_internal_message_protocol_error(e, this))
        )
    }

    // When processing a mpo message it is guaranteed that the mpo is still active
    static FromProtocolMessage(
        pm: ProtocolMessage,
        mpo: MessagePartnerObject,
        protocol: string
    ): Effect.Effect<InternalMessage, ProtocolError> {
        return pipe(
            guard_mpo_still_active(mpo),
            Effect.andThen(_ => Effect.gen(function* () {
                const data = yield* getInternalMessageProtocolData;
                return new InternalMessage(
                    pm, mpo, data.protocol_data, protocol
                );
            })),
            Effect.provideService(ProtocolMessageT, pm)
        )
    }
}

export class InternalMessageT extends Context.Tag("InternalMessageT")<InternalMessageT, InternalMessage>() { }
