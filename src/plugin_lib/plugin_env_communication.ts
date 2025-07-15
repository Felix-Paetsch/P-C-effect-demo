import { Effect, Schema } from "effect";
import { Address } from "../../messaging/src/base/address";
import { ProtocolCommunicationHandler, ProtocolCommunicationHandlerT } from "../../messaging/src/protocols/base/communicationHandler";
import { ProtocolRequestHalf, ProtocolResponseHalf } from "../../messaging/src/protocols/base/protocol_half";
import { Protocol } from "../../messaging/src/protocols/protocol";
import { Json } from "../../messaging/src/utils/json";

const ident = {
    protocol_name: "plugin_to_plugin",
    protocol_ident: "main",
    protocol_version: "1.0.0"
};

export function SendToPluginEnvMessageProtocol() {
    const p = ProtocolRequestHalf(ident);

    return Object.assign(p, {
        run_command: function (this: Protocol<any, void>, target_address: Address, command: string, data: Json, timeout?: number) {
            return Effect.gen(this, function* () {
                const res = yield* yield* this.send_first_message(target_address, {
                    command,
                    data,
                    timeout: timeout || 0
                });

                return res;
            });
        }
    })
}

export function RecieveFromPluginEnvMessageProtocol() {
    return ProtocolResponseHalf(ident, function (this: Protocol<void, {
        command: string,
        data: Json,
        handler: ProtocolCommunicationHandler
    }>) {
        return Effect.gen(this, function* () {
            const handler = yield* ProtocolCommunicationHandlerT;
            const res_data = handler.data;

            const res = yield* Schema.decodeUnknown(Schema.Struct({
                command: Schema.String,
                data: Schema.Any
            }))(res_data).pipe(
                Effect.mapError(handler.asErrorR)
            );

            yield* this._on_callback({
                command: res.command,
                data: res.data,
                handler
            });
        });
    });
} 