import { Context, Effect, pipe, Schema } from "effect";
import { Json } from "../../../../messaging/src/utils/json";
import { ProtocolError } from "../../../../messaging/src/protocols/base/protocol_errors";
import { ProtocolMessage, ProtocolMessageT } from "../../../../messaging/src/protocols/base/protocol_message";
import { ProtocolCommunicationHandler, ProtocolCommunicationHandlerT } from "../../../../messaging/src/protocols/base/communicationHandler";
import { EnvironmentT } from "../../../../messaging/src/base/environment";
import { MessagePartnerObject } from "../message_partner_object";
import { guard_mpo_still_active } from "./tools";
import { ProtocolError, getInternalMessageProtocolData, InternalMessageProtocolDataSchema, to_internal_message_protocol_error } from "./protocol";

export class InternalMessage {
    constructor(
        readonly pm: ProtocolMessage,
        readonly mpo: MessagePartnerObject,
        readonly data: Json,
        readonly protocol: string
    ) { }

    respond(data: Json = null, timeout?: number): Effect.Effect<
        Effect.Effect<InternalMessage, ProtocolError, never>,
        ProtocolError,
        never
    > {
        return this.pm.respond(Schema.encodeSync(InternalMessageProtocolDataSchema)({
            mpo_ident: this.mpo.ident,
            internal_message_protocol_name: this.protocol,
            protocol_data: data
        }), timeout).pipe(
            Effect.andThen(pme => Effect.succeed(InternalMessage.FromProtocolMessageEffect(
                pme, this.mpo, this.protocol
            ))),
            Effect.mapError(e => to_internal_message_protocol_error(e, this))
        )
    }

    // When processing a mpo message it is guaranteed that the mpo is still active
    static FromProtocolMessageEffect(
        pme: Effect.Effect<ProtocolMessage, ProtocolError>,
        mpo: MessagePartnerObject,
        protocol: string
    ): Effect.Effect<InternalMessage, ProtocolError> {
        return pme.pipe(
            Effect.andThen(pm => pipe(
                guard_mpo_still_active(mpo),
                Effect.andThen(_ => Effect.gen(function* () {
                    const data = yield* getInternalMessageProtocolData;
                    return new InternalMessage(
                        pm, mpo, data.protocol_data, protocol
                    );
                })),
                Effect.provideService(ProtocolCommunicationHandlerT, new ProtocolCommunicationHandler(pm)),
                Effect.provideService(EnvironmentT, pm.environment)
            )),
            Effect.mapError(e => to_internal_message_protocol_error(e))
        )
    }
}

export class InternalMessageT extends Context.Tag("InternalMessageT")<InternalMessageT, InternalMessage>() { }