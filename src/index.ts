import { Effect } from "effect";
import { LocalAddress } from "../messaging/src/base/address";
import { createLocalEnvironment } from "../messaging/src/base/environment";
import { callbackAsEffect } from "../messaging/src/utils/run";
import { InternalCommunication } from "./plugin_lib/message_partners/internal_communication/protocol";
import { MessagePartner } from "./plugin_lib/message_partners/message_partner/message_partner";
import { PluginEnvironment } from "./plugin_lib/plugin_env";

function LocalPluginEnv(address: string) {
    return Effect.gen(function* () {
        const env = yield* createLocalEnvironment(new LocalAddress(address));
        const mw = yield* InternalCommunication.middleware(env);
        yield* env.useMiddleware(mw);
        return env;
    })
}

const env1 = LocalPluginEnv("plugin1").pipe(Effect.runSync);
const env2 = LocalPluginEnv("plugin2").pipe(Effect.runSync);

const [mp1, mp2] = MessagePartner.makeLocalPair(env1, env2).pipe(Effect.runSync);
(mp1 as any).customProp = "I AM MP1";
(mp2 as any).customProp = "MP2 AM I";

const plugin1 = async (env: PluginEnvironment) => {
    mp1.on_bridge((bridge) => {
        console.log("HERE IS MY BRIDGE");
        bridge.on((data) => {
            console.log(data + ", and I must scream");
        });
        bridge.on_listener_registered(async (bridge) => {
            console.log("REGISTERED");
            await bridge.send("Here I am");
        });
    })
}

const plugin2 = async (env: PluginEnvironment) => {
    const res_1 = await env.get_plugin("plugin1", "some data");
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
        console.log(data + ", and I must still scream");
    });
}

Effect.all([
    callbackAsEffect(plugin1)(new PluginEnvironment(env1, new LocalAddress("kernel"), "plugin1")),
    callbackAsEffect(plugin2)(new PluginEnvironment(env2, new LocalAddress("kernel"), "plugin2"))
], {
    concurrency: "unbounded"
}).pipe(
    Effect.runPromise
);