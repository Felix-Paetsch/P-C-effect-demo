import base_plugin_init from "../plugins/base";
import { create_local_importable_plugin } from "./local_importable_plugin";

export default function start() {
    const start_plugin = create_local_importable_plugin(base_plugin_init)


}