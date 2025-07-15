import { Effect, Schema } from "effect";
import { Address } from "../../messaging/src/base/address";
import { ProtocolCommunicationHandlerT } from "../../messaging/src/protocols/base/communicationHandler";
import { ProtocolRequestHalf, ProtocolResponseHalf } from "../../messaging/src/protocols/base/protocol_half";
import { Protocol } from "../../messaging/src/protocols/protocol";
import { Json } from "../../messaging/src/utils/json";
import { PluginEnvironment } from "./plugin_env";

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

export function RecieveFromPluginEnvMessageProtocol(plugin_env: PluginEnvironment) {
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

            return plugin_env.handle_plugin_command(command, data, handler);
        });
    });
} 