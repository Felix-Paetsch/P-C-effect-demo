import { Address as M_Address } from "../../../messaging/src/base/address"
import { Effect } from "effect"

export type Recipient = {
    address: M_Address,
    fetchE: Effect.Effect<void, never, never>
}