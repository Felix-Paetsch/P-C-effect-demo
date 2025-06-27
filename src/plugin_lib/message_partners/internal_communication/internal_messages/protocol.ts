import { Effect, Schema } from "effect";
import { ProtocolErrorN, ProtocolErrorR, ProtocolMessage, ProtocolError, ProtocolMessageT, Protocol } from "../../../../../messaging/src/protocols/protocol";
import { MessagePartnerObject, MessagePartnerObjectIdentStruct } from "../../message_partner_object";
import { Json } from "../../../../../messaging/src/base/message";
import { EnvironmentT } from "../../../../../messaging/src/base/environment";
import { get_message_partner_object } from "./tools";
import { InternalMessage } from "./internal_message";
import { MessageTransmissionError } from "../../../../../messaging/src/base/errors/message_errors";
import { EnvironmentInactiveError } from "../../../../../messaging/src/base/environment";

export const InternalMessageProtocolDataSchema = Schema.Struct({
    mpo_ident: MessagePartnerObjectIdentStruct,
    internal_message_protocol_name: Schema.String,
    protocol_data: Schema.Any
});

export const getInternalMessageProtocolData = Effect.gen(function* (_) {
    const msg = yield* _(ProtocolMessageT);
    return yield* Schema.decodeUnknown(InternalMessageProtocolDataSchema)(msg.data);
}).pipe(
    Effect.catchAll(e => Effect.gen(function* (_) {
        return yield* Effect.fail(new CommunicationErrorR({
            message: "Invalid request",
            error: e,
            Message: yield* _(ProtocolMessageT)
        }))
    }))
)

export type MessagePartnerObjectData = Schema.Schema.Type<typeof InternalMessageProtocolDataSchema>;

export class CommunicationErrorN extends ProtocolErrorN {
    constructor(args: {
        message: string,
        data?: Json,
        error?: Error,
        readonly Message?: InternalMessage | ProtocolMessage
    }) {
        super({
            message: args.message,
            data: args.data,
            error: args.error,
            Message: (args.Message as any)?.pm || args.Message
        });
    }
}

export class CommunicationErrorR extends ProtocolErrorR {
    constructor(args: {
        message: string,
        data?: Json,
        error?: Error,
        readonly Message: InternalMessage | ProtocolMessage
    }) {
        super({
            message: args.message,
            data: args.data,
            error: args.error,
            Message: (args.Message as any)?.pm || args.Message
        });
    }
}

export type CommunicationError = CommunicationErrorN | CommunicationErrorR;

export function to_internal_message_protocol_error(e: Error, msg?: InternalMessage): CommunicationErrorN {
    if (e instanceof ProtocolErrorR && msg) {
        return new CommunicationErrorR({
            message: e.message,
            error: e,
            data: (e as any).data,
            Message: msg
        })
    }

    return new CommunicationErrorN({
        message: e.message,
        error: e,
        data: (e as any).data || undefined,
        Message: msg
    })
}

type InternalMessageResult = Effect.Effect<InternalMessage, CommunicationError>;

export class InternalCommunicationProtocol extends Protocol<InternalMessageResult, InternalMessage> {
    constructor() {
        super("message_partner_object_communication", "main", "1.0.0");
    }

    run_mpo(
        mpo: MessagePartnerObject,
        internal_message_protocol_name: string,
        data?: Json,
        timeout?: number
    ): Effect.Effect<InternalMessageResult, CommunicationErrorN, EnvironmentT> {
        const self = this;
        return Effect.gen(function* (_) {
            const env = yield* _(EnvironmentT);

            return self.send_first_message(
                mpo.message_partner.address,
                Schema.encodeSync(InternalMessageProtocolDataSchema)({
                    mpo_ident: mpo.ident,
                    internal_message_protocol_name,
                    protocol_data: data
                }), timeout
            ).pipe(
                Effect.andThen(pme => Effect.gen(function* (_) {
                    const env = yield* _(EnvironmentT);
                    return pme.pipe(
                        Effect.provideService(EnvironmentT, env)
                    );
                })),
                Effect.andThen(pme => InternalMessage.FromProtocolMessageEffect(pme, mpo, internal_message_protocol_name)),
                Effect.mapError(e => to_internal_message_protocol_error(e)),
                Effect.provideService(EnvironmentT, env)
            )
        })
    }

    get on_first_request(): Effect.Effect<void, ProtocolError, ProtocolMessageT> {
        const self = this;
        return Effect.gen(function* (_) {
            const msg = yield* _(ProtocolMessageT);
            const data = yield* getInternalMessageProtocolData;
            const mpo = yield* get_message_partner_object(data.mpo_ident);
            return yield* self.on_callback(
                new InternalMessage(
                    msg,
                    mpo,
                    data.protocol_data,
                    data.internal_message_protocol_name
                )
            );
        })
    }
}

export const InternalCommunication = new InternalCommunicationProtocol();