import { Effect } from "effect";
import { Address, LocalAddress } from "../messaging/src/base/address";
import { createLocalEnvironment } from "../messaging/src/base/environment";
import { Json } from "../messaging/src/utils/json";
import { callbackAsEffect, Result } from "../messaging/src/utils/run";
import { KernelMessagingObject } from "./kernel_lib/messaging_object";
import { Bridge } from "./plugin_lib/message_partners/bridge/bridge";
import { MessagePartner } from "./plugin_lib/message_partners/message_partner/message_partner";
import { MPOCommunication } from "./plugin_lib/message_partners/mpo_communication/protocol";
import { PluginEnvironment } from "./plugin_lib/plugin_env";

const side_plugin = async (env: PluginEnvironment) => {
    env.on_plugin_request((mp: MessagePartner) => {
        mp.on_bridge((bridge: Bridge) => {
            bridge.on((data) => {
                console.log(data + ", and I must scream SIDE");
            });
            bridge.on_listener_registered(async (bridge) => {
                await bridge.send("Here I am");
            });
        })
    });
}

const main_plugin = async (env: PluginEnvironment) => {
    const res_1 = await env.get_plugin("side", "some data");
    if (res_1.is_error) {
        throw res_1.error;
    }
    const mp = res_1.result;

    const res_2 = await mp.bridge();
    if (res_2.is_error) {
        throw res_2.error;
    }
    const bridge = res_2.result;
    await bridge.send("I have no mouth");
    bridge.on((data) => {
        console.log(data + ", and I must still scream MAIN");
    });
}

function LocalPluginEnv(address: string) {
    return Effect.gen(function* () {
        const env = yield* createLocalEnvironment(new LocalAddress(address));
        const mw = yield* MPOCommunication.middleware(env);
        yield* env.useMiddleware(mw);
        return env;
    })
}

function runLocalPlugin(plugin: (env: PluginEnvironment) => Promise<void>, address: LocalAddress) {
    return LocalPluginEnv(address.secondary_id).pipe(
        Effect.andThen(env => {
            return PluginEnvironment.build(env, kernel_address, address.secondary_id)
        }),
        Effect.andThen(env => {
            return callbackAsEffect(plugin)(env)
        }),
        Effect.runPromise
    )
}

const kernel_address = new LocalAddress("__kernel");
const main_address = new LocalAddress("main");
const side_address = new LocalAddress("side");

class KernelImpl extends KernelMessagingObject {
    async get_plugin(plugin_ident: Json) {
        if (plugin_ident === "side") {
            await runLocalPlugin(side_plugin, side_address);
            return {
                is_error: false as const,
                result: side_address
            } as Result<Address, Error>;
        }

        return {
            is_error: true as const,
            error: new Error("Plugin not found")
        } as Result<Address, Error>;
    }
}

createLocalEnvironment(kernel_address).pipe(
    Effect.andThen(env => new KernelImpl(env)),
    Effect.runSync
)
runLocalPlugin(main_plugin, main_address);