import { Address } from "../../messaging/src/base/address";
import { Context } from "effect";

export class Environment {
    constructor(
        readonly address: Address
    ) { }

    static get kernel_address() {
        // The "main messaging/orchestrating" kernel for the program instance
        return Address.local_address
    }
}

export class EnvironmentT extends Context.Tag("Environment")<EnvironmentT, Environment>() { }