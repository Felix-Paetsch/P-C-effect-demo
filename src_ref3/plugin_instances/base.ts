import { Effect } from "effect";
import { plugin_request } from "../plugin_lib/kernel_messages/plugin_request";
import { PluginEffect } from "../plugin_lib/plugin_effect";
/* 
*  Each plugin should have all its logic inside
*  a event listener that is run after the communication is initialized
*  The environment als all relevant data to the env of the plugin
*  If Plugins were all encapsulated (which we don't necc. want)
*  this would be hidden inside a global object
*/

const main: PluginEffect = Effect.gen(function* (_) {
    const res = yield* plugin_request("Plugin2");
    console.log(res);

    /*
    const other_plugin = yield* _(env.request_plugin("Plugin2"));
    if (!res.is_ok()) {
        env.unhandable_error({
            "close_plugin": true
        });
    }

    const other_side = res.communicator();
    const ping_res = await env.ping(other_side);
    console.log(ping_res);

    const fetch_res = await env.fetch(other_side, {
        "body": {
            "lala": "whawha"
        }
    });
    console.log(fetch_res);
    */
})

export default main;