import { Effect, Schema } from "effect";
import { ProtocolErrorN, ProtocolErrorR, ProtocolMessage, ProtocolError, ProtocolMessageT, Protocol } from "../../../../messaging/src/protocols/protocol";
import { MessagePartnerObject } from "../message_partner_object";
import { Json } from "../../../../messaging/src/base/message";
import { EnvironmentT } from "../../../../messaging/src/base/environment";
import { get_message_partner_object } from "./tools";
import { InternalMessage } from "./internal_message";

export const InternalMessageProtocolDataSchema = Schema.Struct({
    mpo_ident: Schema.Struct({
        message_partner_uuid: Schema.String,
        uuid: Schema.String
    }),
    internal_message_protocol_name: Schema.String,
    protocol_data: Schema.Any
});

export const getInternalMessageProtocolData = Effect.gen(function* () {
    const msg = yield* ProtocolMessageT;
    return yield* Schema.decodeUnknown(InternalMessageProtocolDataSchema)(msg.data);
}).pipe(
    Effect.catchAll(e => Effect.gen(function* () {
        return yield* new CommunicationErrorR({
            message: "Invalid request",
            error: e,
            Message: yield* ProtocolMessageT
        })
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

export class InternalCommunicationProtocol extends Protocol<InternalMessage, InternalMessage> {
    constructor() {
        super("message_partner_object_communication", "main", "1.0.0");
    }

    run_mpo(
        mpo: MessagePartnerObject,
        internal_message_protocol_name: string,
        data?: Json,
        timeout?: number
    ): Effect.Effect<InternalMessage, CommunicationErrorN, EnvironmentT> {
        return Effect.gen(this, function* () {
            const pm = yield* this.send_first_message(
                mpo.message_partner.address,
                Schema.encodeSync(InternalMessageProtocolDataSchema)({
                    mpo_ident: mpo.ident,
                    internal_message_protocol_name,
                    protocol_data: data
                }), timeout
            )

            return yield* InternalMessage.FromProtocolMessage(pm, mpo, internal_message_protocol_name)
        }).pipe(
            Effect.mapError(e => to_internal_message_protocol_error(e))
        )
    }

    get on_first_request(): Effect.Effect<void, ProtocolError, ProtocolMessageT | EnvironmentT> {
        return Effect.gen(this, function* () {
            const msg = yield* ProtocolMessageT;
            const data = yield* getInternalMessageProtocolData;
            const mpo = yield* get_message_partner_object(data.mpo_ident);
            const im = new InternalMessage(
                msg,
                mpo,
                data.protocol_data,
                data.internal_message_protocol_name
            );

            yield* mpo._recieve_internal_message(
                data.internal_message_protocol_name,
                data.protocol_data,
                im
            ).pipe(
                Effect.ignore
            );
        })
    }
}

export const InternalCommunication = new InternalCommunicationProtocol();