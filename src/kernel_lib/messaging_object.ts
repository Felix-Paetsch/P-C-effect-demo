import { Effect } from "effect";
import { Address } from "../../messaging/src/base/address";
import { Environment } from "../../messaging/src/base/environment";
import { KernelEnv } from "../../messaging/src/base/kernel_environment/index";
import { ProtocolError, ProtocolErrorN } from "../../messaging/src/protocols/base/protocol_errors";
import { Json } from "../../messaging/src/utils/json";
import { Result, resultToEffect } from "../../messaging/src/utils/run";
import { EnvironmentCommunicationHandler } from "../common_lib/env_communication/EnvironmentCommunicationHandler";
import { EnvironmentCommunicator } from "../common_lib/env_communication/environment_communicator";

export abstract class KernelMessagingObject extends EnvironmentCommunicator {
    constructor(
        readonly env: Environment = KernelEnv
    ) {
        super(env);
    }

    _receive_command(command: string, data: Json, handler: EnvironmentCommunicationHandler): Effect.Effect<void, ProtocolError> {
        return Effect.gen(this, function* () {
            if (command === "get_plugin") {
                return yield* resultToEffect(this.get_plugin(data)).pipe(
                    Effect.andThen(address => handler.close(address.serialize(), true)),
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
        })
    }

    abstract get_plugin(plugin_ident: Json): Promise<Result<Address, Error>>;
}