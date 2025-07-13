import { Effect, pipe, Schema } from "effect";
import { EnvironmentT } from "../../../../messaging/src/base/environment";
import { ProtocolCommunicationHandlerT } from "../../../../messaging/src/protocols/base/communicationHandler";
import { fail_as_protocol_error, ProtocolError, ProtocolErrorN } from "../../../../messaging/src/protocols/base/protocol_errors";
import { Protocol } from "../../../../messaging/src/protocols/protocol";
import { Json } from "../../../../messaging/src/utils/json";
import { MessagePartnerObject } from "../message_partner_object";
import { InternalCommunicationHandler, InternalMessageProtocolDataSchema } from "./internalCommunicationHandler";
import { get_message_partner_object } from "./tools";



export class InternalCommunicationProtocol extends Protocol<Effect.Effect<InternalCommunicationHandler, ProtocolErrorN>, InternalCommunicationHandler> {
    constructor() {
        super("message_partner_object_communication", "main", "1.0.0");
    }

    run(): Effect.Effect<Effect.Effect<InternalCommunicationHandler, ProtocolErrorN>, ProtocolError> {
        return Effect.fail(new ProtocolErrorN({
            message: "Use run_mpo method instead for internal communication"
        }));
    }

    run_mpo(
        mpo: MessagePartnerObject,
        internal_message_protocol_name: string,
        data?: Json,
        timeout?: number
    ): Effect.Effect<
        Effect.Effect<InternalCommunicationHandler, ProtocolErrorN>,
        ProtocolErrorN,
        EnvironmentT
    > {
        return Effect.gen(this, function* () {
            const handlerE = yield* this.send_first_message(
                mpo.message_partner.address,
                Schema.encodeSync(InternalMessageProtocolDataSchema)({
                    mpo_ident: mpo.ident,
                    internal_message_protocol_name,
                    protocol_data: data
                }), timeout
            )

            const env = yield* EnvironmentT;
            return handlerE.pipe(
                Effect.andThen(handler => InternalCommunicationHandler.fromInternalMessage(handler.__current_pm)),
                Effect.provideService(EnvironmentT, env)
            )
        }).pipe(fail_as_protocol_error)
    }

    get on_first_request(): Effect.Effect<void, ProtocolError, ProtocolCommunicationHandlerT> {
        return pipe(
            ProtocolCommunicationHandlerT,
            Effect.andThen(pch => InternalCommunicationHandler.fromInternalMessage(pch.__current_pm)),
            Effect.andThen(ich => this.on_callback(ich))
        );
    }

    on_callback = (ch: InternalCommunicationHandler): Effect.Effect<void, never, never> => {
        return Effect.gen(function* () {
            const data = ch.data;
            const mpo = yield* get_message_partner_object(data.mpo_ident).pipe(
                Effect.provideService(ProtocolCommunicationHandlerT, ch)
            );

            yield* mpo._recieve_internal_message(
                data.internal_message_protocol_name,
                data.protocol_data,
                ch
            );
        }).pipe(Effect.ignore)
    }
}

export const InternalCommunication = new InternalCommunicationProtocol();