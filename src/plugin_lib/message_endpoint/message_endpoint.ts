import { Data, Effect, ParseResult, pipe, Schema } from "effect"
import { Json } from "../../../messaging/src/base/message"
import { Address, SerializedAddress } from "../../../messaging/src/base/address"
import { OutgoingMessageEndpoint } from "./outgoing_message_endpoint";
import { Environment, EnvironmentT } from "../environment";
import { incomingMessageEndpoint } from "./incoming_message_endpoint";

class MessageEndpointDeserializationError extends Data.TaggedError("MessageEndpointDeserializationError")<{
    error: Error;
}> { }

/**
 * 
 * How to initializa a message partner on the other side?
 * 
 * - Establish bidirectional connection // should be a custom message
 * - Send message
 * - Receive message
 * - Custom Messages like closing connection
 * - Backend logic to connect a message partner
 * - Ping Message Partner
 * - Message Partner sink
 * - Many to many message partners
 * - Signals probably extend message partners
 */


export class MessageEndpoint {
    constructor(
        readonly address: Address,
        readonly id: string
    ) { }

    to_json = () =>
        Schema.encodeSync(MessageEndpoint.MessageEndpointFromJson)(this) as Json


    get to_outgoing_message_endpoint() {
        return Effect.succeed(new OutgoingMessageEndpoint(this.address, this.id))
    }

    get to_incoming_message_endpoint() {
        return EnvironmentT.pipe(
            Effect.andThen(env => Effect.succeed(new incomingMessageEndpoint(env, this.id)))
        )
    }

    static from_json = (data: Json) =>
        Schema.decodeUnknown(MessageEndpoint.MessageEndpointFromJson)(data).pipe(
            Effect.catchAll(
                error => new MessageEndpointDeserializationError({ error })
            )
        )

    static schema = Schema.Struct({
        type: Schema.Literal("MessageEndpointIdent"),
        address: Schema.String,
        id: Schema.String
    })

    static MessageEndpointFromJson = Schema.transformOrFail(
        Schema.Unknown, Schema.instanceOf(MessageEndpoint), {
        strict: true,
        decode: (json: unknown, _, ast) =>
            pipe(
                Schema.decodeUnknown(MessageEndpoint.schema)(json),
                Effect.andThen(mp => Effect.all([
                    Address.deserialize(mp.address as SerializedAddress),
                    Effect.succeed(mp.id)
                ])),
                Effect.andThen(([address, id]) => new MessageEndpoint(address, id)),
                Effect.catchAll(error => ParseResult.fail(
                    new ParseResult.Type(ast, json, error.message)
                ))
            ),
        encode: (mp: MessageEndpoint) =>
            ParseResult.succeed({
                type: "MessageEndpointIdent",
                address: mp.address.serialize(),
                id: mp.id
            })
    })
}