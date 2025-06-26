import Environment from "../plugin_lib/env";

export default async function on_initialized(env: Environment) {
    env.listen((req, res) => {
        res.send({
            ...req.body,
            "note": "response"
        })
    });
}