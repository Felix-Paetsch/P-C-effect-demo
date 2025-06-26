import { Schema, Effect, Data, Option, pipe, Either } from "effect";
import { Message, Json } from "../../../messaging/src/base/message";
import { RequestMessageData } from "./request";
import { StdMessagingErrorI } from "../../../messaging/src/base/errors/common";

const Error_Response_Statuses = {
    // Server error
    MalformattedResponseError: 400,
    ReceivedErrorResponse: 401,

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
export type PossibleResponseError = Error & {
    _tag: keyof typeof Error_Response_Statuses;
};

type response_data = {
    status: ResponseStatus;

    error: Option.Some<PossibleResponseError>;
    body: Option.Option<Json>;
    headers: Option.Option<Record<string, string>>;
    meta_data: Option.Option<Record<string, Json>>;

    original_message: Message;
    response_message: Option.Option<Message>;
} | {
    status: ResponseStatus;

    error: Option.None<PossibleResponseError>;
    body: Option.Some<Json>;
    headers: Option.Some<Record<string, string>>;
    meta_data: Option.Some<Record<string, Json>>;

    original_message: Message;
    response_message: Option.Some<Message>;
}

export class MalformattedResponseError extends Data.TaggedError("MalformattedResponseError")<{
    message: string;
    error: Error;
    Message?: Message
}> { }

export class ReceivedErrorResponse extends Data.TaggedError("ReceivedErrorResponse")<{
    message: string;
    data: {
        response_status: ResponseStatus;
    };
    error: Error;
}> { }

const minimal_response_message_meta_data = (to_parse: unknown) => Schema.decodeUnknown(
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
    Effect.mapError(
        (error) => new MalformattedResponseError({
            message: "Invalid meta data",
            error: error
        })
    )
)

export default class Response {
    constructor(
        private response_data: response_data
    ) { }

    get status() {
        return this.response_data.status
    }

    get body(): Option.Option<Json> {
        return this.response_data.body
    }

    get err(): Option.Option<PossibleResponseError> {
        return this.ok() ? Option.none() : this.response_data.error;
    }

    ok() {
        return !Object.values(Error_Response_Statuses).includes(this.response_data.status as any);
    }

    static from_request_message = (request_data: RequestMessageData, options: {
        from_custom_message?: boolean
    } = {}): Effect.Effect<Response, never, never> =>
        Effect.gen(function* (_) {
            const response_message = yield* _(request_data.response);
            const parsed_meta_data = yield* _(minimal_response_message_meta_data(response_message.meta_data));
            const body = yield* _(response_message.content)

            if (
                Object.values(Error_Response_Statuses).includes(parsed_meta_data.status as any)
            ) {
                yield* Effect.fail(new ReceivedErrorResponse({
                    message: parsed_meta_data.error || "Unknown error",
                    data: { response_status: parsed_meta_data.status },
                    error: new Error("Response had an error")
                }))
            }

            return new Response({
                status: parsed_meta_data.status,
                body: Option.some(body),
                headers: Option.some(parsed_meta_data.headers),
                meta_data: Option.some(response_message.meta_data),
                original_message: request_data.message,
                response_message: Option.some(response_message),
                error: Option.none()
            } as response_data);
        }).pipe(
            Effect.catchTag(
                // Triggered by computing "body"
                "MessageDeserializationError",
                (err) => new MalformattedResponseError({
                    message: "Invalid response message body",
                    error: err
                })
            ),
            Effect.catchAll(
                (err) => error_to_response(request_data, err, options)
            )
        )
}

const error_to_response = (request_data: RequestMessageData, err: PossibleResponseError, options: {
    from_custom_message?: boolean
}) => Effect.gen(function* (_) {
    return {
        response_message: yield* request_data.response.pipe(Effect.option),
        meta_data: (yield* request_data.response.pipe(Effect.option)).pipe(
            Option.map((m) => m.meta_data)
        ),
        body: yield* request_data.response.pipe(
            Effect.andThen(m => m.content),
            Effect.option
        ),
        headers: yield* request_data.response.pipe(
            Effect.andThen(m => m.meta_data.headers),
            Effect.andThen(Schema.decodeUnknown(
                Schema.Record({ key: Schema.String, value: Schema.String })
            )),
            Effect.option
        )
    }
}).pipe(
    Effect.andThen((res_msg_data) => new Response(
        {
            status: Error_Response_Statuses[err._tag],
            error: Option.some(err),
            ...res_msg_data,
            original_message: request_data.message
        } as response_data
    ))
)