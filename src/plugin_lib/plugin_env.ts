import { Effect, Schema } from "effect";
import { v4 as uuidv4 } from "uuid";
import { Address } from "../../messaging/src/base/address";
import { Environment, EnvironmentInactiveError, EnvironmentT } from "../../messaging/src/base/environment";
import { ProtocolCommunicationHandler } from "../../messaging/src/protocols/base/communicationHandler";
import { ProtocolError, ProtocolErrorN } from "../../messaging/src/protocols/base/protocol_errors";
import { Json } from "../../messaging/src/utils/json";
import { callbackAsEffect, CallbackError, ResultPromise, runEffectAsPromise } from "../../messaging/src/utils/run";
import { SendToKernelMessageProtocol } from "../inter_communication/protocols/plugin_to_kernel";
import { MessagePartner } from "./message_partners/message_partner/message_partner";
import { RecieveFromPluginEnvMessageProtocol, SendToPluginEnvMessageProtocol } from "./plugin_env_communication";

export class PluginEnvironment {
    private send_to_plugin_protocol: ReturnType<typeof SendToPluginEnvMessageProtocol>;
    private send_to_kernel_protocol: ReturnType<typeof SendToKernelMessageProtocol>;
    constructor(
        readonly env: Environment,
        readonly kernel_address: Address,
        readonly instance_uuid: string, // UUID of the plugin instance
    ) {
        this.send_to_plugin_protocol = SendToPluginEnvMessageProtocol();
        this.send_to_kernel_protocol = SendToKernelMessageProtocol();
    }

    get_plugin(plugin_ident: Json, data?: Json): ResultPromise<MessagePartner, ProtocolError> {
        return runEffectAsPromise(
            Effect.gen(this, function* () {
                const responseData = yield* this.send_to_kernel_protocol.run_command(
                    this.kernel_address,
                    "get_plugin",
                    plugin_ident,
                    1000
                ).pipe(
                    Effect.provideService(EnvironmentT, this.env)
                );

                const pluginAddress = yield* Schema.decodeUnknown(Address.AddressFromString)(responseData);

                const uuid = uuidv4();
                console.log("HERE WE GO");
                yield* this._send_to_plugin_env(pluginAddress, "get_plugin", { uuid }, 1000).pipe(
                    Effect.provideService(EnvironmentT, this.env)
                );

                const messagePartner = new MessagePartner(pluginAddress, this.env, uuid);
                return messagePartner;
            }).pipe(
                Effect.mapError(e => new ProtocolErrorN({
                    message: "Failed to get plugin",
                    error: e instanceof Error ? e : new Error(String(e))
                })),
                Effect.tapError((e) => Effect.gen(this, function* () {
                    console.log("ERROR", e)
                }))
            )
        );
    }

    private _on_plugin_request: (mp: MessagePartner, data?: Json) => Effect.Effect<void, CallbackError> = () => Effect.void;
    on_plugin_request(cb: (mp: MessagePartner, data?: Json) => void) {
        this._on_plugin_request = callbackAsEffect(cb);
    }

    protected _send_to_plugin_env(target_address: Address, command: string, data: Json, timeout?: number) {
        return this.send_to_plugin_protocol.run_command(target_address, command, data, timeout);
    }

    protected _recieve_plugin_command(command: string, data: Json, handler: ProtocolCommunicationHandler): Effect.Effect<void, ProtocolError> {
        return Effect.gen(this, function* () {
            console.log("RECIEVE");
            if (command === "get_plugin") {
                const message_partner = new MessagePartner(handler.message.target, this.env);
                yield* this._on_plugin_request(message_partner, data).pipe(
                    Effect.mapError(e => handler.asErrorR(e))
                );
                yield* handler.close({ success: true, partner_created: true }, true);
            }
        });
    }

    static build(
        env: Environment,
        kernel_address: Address,
        instance_uuid: string
    ): Effect.Effect<PluginEnvironment, EnvironmentInactiveError, never> {
        return SendToKernelMessageProtocol().middleware(env).pipe(
            Effect.andThen(mw => env.useMiddleware(mw)),
            Effect.andThen(() => {
                const pluginEnv = new PluginEnvironment(
                    env,
                    kernel_address,
                    instance_uuid
                );

                const pluginProtocol = RecieveFromPluginEnvMessageProtocol(pluginEnv);
                return pluginProtocol.middleware(env).pipe(
                    Effect.andThen(mw => env.useMiddleware(mw)),
                    Effect.andThen(() => pluginEnv)
                );
            })
        );
    }
}
