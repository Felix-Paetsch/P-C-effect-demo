import { Context, Effect, ParseResult, Schema } from "effect";
import { Address } from "../../../messaging/src/base/address";
import { CommunicationChannel } from "../../../messaging/src/base/communication_channels";
import { Json, Message } from "../../../messaging/src/base/message";

export class RequestMessageT extends Context.Tag("RequestMessageT")<RequestMessageT, RequestMessage>() { }
export class RequestMessage extends Message {
    constructor(
        public target: Address,
        content: string | { [key: string]: Json },
        public meta_data: {
            headers: {
                message_type: string,
                [key: string]: string
            },
            [key: string]: Json
        },
        public prefered_communication_channel: CommunicationChannel | null = null
    ) {
        super(target, content, meta_data, prefered_communication_channel);
    }
}

export const toStringJsonRecord = <E extends Error>(err_fun: (error: ParseResult.ParseError) => E) =>
    (body: Json) => Schema.decodeUnknown(
        Schema.Record({
            key: Schema.String,
            value: Schema.Any
        })
    )(body).pipe(
        Effect.mapError(
            error => err_fun(error)
        )
    )