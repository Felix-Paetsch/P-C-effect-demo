import { Context, Effect, ParseResult, Schema } from "effect";
import { Address } from "../../../messaging/src/base/address";
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
        }
    ) {
        super(target, content, meta_data);
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