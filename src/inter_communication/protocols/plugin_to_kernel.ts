import { Effect, Schema } from "effect";
import { Address } from "../../../messaging/src/base/address";
import { ProtocolCommunicationHandlerT } from "../../../messaging/src/protocols/base/communicationHandler";
import { ProtocolRequestHalf, ProtocolResponseHalf } from "../../../messaging/src/protocols/base/protocol_half";
import { Protocol } from "../../../messaging/src/protocols/protocol";
import { Json } from "../../../messaging/src/utils/json";
import { KernelMessagingObject } from "../../kernel_lib/messaging_object";

const ident = {
    protocol_name: "plugin_to_kernel",
    protocol_ident: "main",
    protocol_version: "1.0.0"
};

export function SendToKernelMessageProtocol() {
    const p = ProtocolRequestHalf(ident);

    return Object.assign(p, {
        run_command: function (this: Protocol<any, void>, kernel_address: Address, command: string, data: Json, timeout?: number) {
            return Effect.gen(this, function* () {
                const handlerE = yield* this.send_first_message(kernel_address, {
                    command,
                    data,
                    timeout: timeout || 0
                });

                const handler = yield* handlerE;
                return handler.data;
            });
        }
    })
}

export function RecieveToKernelMessageProtocol(mo: KernelMessagingObject) {
    return ProtocolResponseHalf(ident, function (this: Protocol<void, void>) {
        return Effect.gen(this, function* () {
            const handler = yield* ProtocolCommunicationHandlerT;
            const res_data = handler.data;

            const {
                command,
                data
            } = yield* Schema.decodeUnknown(Schema.Struct({
                command: Schema.String,
                data: Schema.Any
            }))(res_data).pipe(
                Effect.mapError(handler.asErrorR)
            );

            yield* mo.on_command(command, data, handler).pipe(
                Effect.mapError(e => handler.asErrorR(e))
            );
        })
    });
}