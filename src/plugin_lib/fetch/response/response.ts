import { Schema, Effect, Data } from "effect";
import { Message, Json } from "../../../../messaging/src/base/message";
import { RequestMessageData } from "../request";

const Error_Response_Statuses = {
    // Server error
    MalformattedResponseError: 400,
    RecievedErrorResponse: 401,

    // Library/library dev error
    MiddlewareError: 500,
    MessageSerializationError: 501,

    // Unreachable
    TimeoutError: 600,
    AddressNotFoundError: 601,
    NoValidCommunicationChannelsError: 602
} as const;

const Response_Statuses = {
    ...Error_Response_Statuses,
    Success: 200
} as const;

export type ResponseStatus = typeof Response_Statuses[keyof typeof Response_Statuses];

type response_data = {
    status: ResponseStatus;

    error: Error | null;
    body: Json | null;
    headers: Record<string, string> | null;
    meta_data: Record<string, Json> | null;

    from_custom_message: boolean;
    original_message: Message;
    response_message?: Message;
}

export class MalformattedResponseError extends Data.TaggedError("MalformattedResponseError")<{
    error_message: string;
    error: Error;
}> { }

export class RecievedErrorResponse extends Data.TaggedError("ResponseError")<{
    error_message: string;
    status: ResponseStatus;
    error: Error;
}> { }

const response_message_meta_data = (to_parse: unknown) => Schema.decodeUnknown(
    Schema.Struct({
        status: Schema.Literal(...Object.values(Response_Statuses)),
        error: Schema.optionalWith(Schema.String, {
            exact: true
        }),
        headers: Schema.Record({
            key: Schema.String,
            value: Schema.String
        })
    })
)(to_parse).pipe(
    Effect.catchAll(
        (error) => Effect.fail(new MalformattedResponseError({
            error_message: "Invalid meta data",
            error: error
        }))
    )
)

export default class Response {
    constructor(
        readonly response_data: response_data
    ) { }

    ok() {
        return this.response_data.status.toString().startsWith("2");
    }

    static from_request_message = (request_data: RequestMessageData, options: {
        from_custom_request?: boolean
    } = {}): Effect.Effect<Response, never, never> =>
        Effect.gen(function* (_) {
            const response_message = yield* _(request_data.response);
            const parsed_meta_data = yield* _(response_message_meta_data(response_message.meta_data));
            const body = yield* _(response_message.content)

            if (
                Object.values(Error_Response_Statuses).includes(parsed_meta_data.status as any)
            ) {
                yield* Effect.fail(new RecievedErrorResponse({
                    error_message: parsed_meta_data.error || "Unknown error",
                    status: parsed_meta_data.status,
                    error: new Error("Response had an error")
                }))
            }

            return new Response({
                status: parsed_meta_data.status,
                body: body,
                headers: parsed_meta_data.headers,
                meta_data: response_message.meta_data,
                from_custom_message: !!options.from_custom_request,
                original_message: request_data.message,
                error: null
            });
        }).pipe(
            Effect.catchTag(
                // Triggered by computing "body"
                "MessageDeserializationError",
                (err) => Effect.fail(new MalformattedResponseError({
                    error_message: "Invalid response message",
                    error: err
                }))
            ),
            Effect.catchAll((err) => Effect.gen(function* (_) {
                return yield* _(Effect.fail(err));
            }))
        )
}
