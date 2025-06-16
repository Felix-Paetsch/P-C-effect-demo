import { Address } from "../../messaging/src/base/address";
import { Context } from "effect";

export type Environment = {
    address: Address,
    // Stuff about sending messages...
}

export class EnvironmentT extends Context.Tag("Environment")<EnvironmentT, Environment>() { }