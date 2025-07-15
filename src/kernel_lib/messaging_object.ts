import { Effect } from "effect";
import { Address } from "../../messaging/src/base/address";
import { Environment } from "../../messaging/src/base/environment";
import { KernelEnv } from "../../messaging/src/base/kernel_environment/index";
import { ProtocolCommunicationHandler } from "../../messaging/src/protocols/base/communicationHandler";
import { Json } from "../../messaging/src/utils/json";
import { Result, resultToEffect } from "../../messaging/src/utils/run";
import { RecieveToKernelMessageProtocol } from "../inter_communication/protocols/plugin_to_kernel";

export abstract class KernelMessagingObject {
    constructor(
        readonly env: Environment = KernelEnv
    ) {
        Effect.gen(this, function* () {
            const mw = yield* RecieveToKernelMessageProtocol(this).middleware(this.env);
            yield* env.useMiddleware(mw);
        }).pipe(
            Effect.ignore, // Assuming environment is active
            Effect.runSync
        )
    }

    on_command(command: string, data: Json, handler: ProtocolCommunicationHandler) {
        return Effect.gen(this, function* () {
            if (command === "get_plugin") {
                const address = yield* resultToEffect(this.get_plugin(data));
                yield* handler.close(address.serialize(), true);
            }
        })
    }

    abstract get_plugin(plugin_ident: Json): Promise<Result<Address, Error>>;
}