import { Effect, Schema } from "effect";
import { v4 as uuidv4 } from "uuid";
import { Address } from "../../messaging/src/base/address";
import { Environment, EnvironmentT } from "../../messaging/src/base/environment";
import { ProtocolError, ProtocolErrorN } from "../../messaging/src/protocols/base/protocol_errors";
import { Json } from "../../messaging/src/utils/json";
import { callbackAsEffect, CallbackError, ResultPromise, runEffectAsPromise } from "../../messaging/src/utils/run";
import { EnvironmentCommunicationHandler } from "../common_lib/env_communication/EnvironmentCommunicationHandler";
import { EnvironmentCommunicator } from "../common_lib/env_communication/environment_communicator";
import { MessagePartner } from "./message_partners/message_partner/message_partner";

export class PluginEnvironment extends EnvironmentCommunicator {
    constructor(
        readonly env: Environment,
        readonly kernel_address: Address,
        readonly instance_uuid: string, // UUID of the plugin instance
    ) {
        super(env);
    }

    get_plugin(plugin_ident: Json, data?: Json): ResultPromise<MessagePartner, ProtocolError> {
        return runEffectAsPromise(
            Effect.gen(this, function* () {
                const handlerE = yield* this._send_command(
                    this.kernel_address,
                    "get_plugin",
                    plugin_ident,
                    1000
                ).pipe(
                    Effect.provideService(EnvironmentT, this.env)
                );

                const handler = yield* handlerE;
                const responseData = handler.protocol_data;
                const pluginAddress = yield* Schema.decodeUnknown(Address.AddressFromString)(responseData);

                const uuid = uuidv4();
                const pluginHandlerE = yield* this._send_command(
                    pluginAddress,
                    "get_plugin",
                    { uuid },
                    1000
                ).pipe(
                    Effect.provideService(EnvironmentT, this.env)
                );

                yield* pluginHandlerE;
                const messagePartner = new MessagePartner(pluginAddress, this.env, uuid);
                return messagePartner;
            }).pipe(
                Effect.mapError(e => new ProtocolErrorN({
                    message: "Failed to get plugin",
                    error: e instanceof Error ? e : new Error(String(e))
                }))
            )
        );
    }

    private _on_plugin_request: (mp: MessagePartner, data?: Json) => Effect.Effect<void, CallbackError> = () => Effect.void;
    on_plugin_request(cb: (mp: MessagePartner, data?: Json) => void) {
        this._on_plugin_request = callbackAsEffect(cb);
    }

    _receive_command(command: string, data: Json, handler: EnvironmentCommunicationHandler): Effect.Effect<void, ProtocolError> {
        return Effect.gen(this, function* () {
            if (command === "get_plugin") {
                const requestData = data as { uuid?: string } | null;
                const uuid = requestData?.uuid;
                const message_partner = new MessagePartner(handler.communication_target, this.env, uuid);
                yield* this._on_plugin_request(message_partner, data).pipe(
                    Effect.mapError(e => new ProtocolErrorN({
                        message: "Error in plugin request callback",
                        error: e instanceof Error ? e : new Error(String(e))
                    }))
                );
                yield* handler.close({ success: true, partner_created: true }, true).pipe(
                    Effect.mapError(e => new ProtocolErrorN({
                        message: "Failed to close handler",
                        error: new Error(String(e))
                    }))
                );
            } else {
                return yield* Effect.fail(new ProtocolErrorN({
                    message: `Unknown command: ${command}`,
                    data: { command, data }
                }));
            }
        });
    }
}
