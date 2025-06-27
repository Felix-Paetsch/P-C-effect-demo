import { Effect, Schema } from "effect";
import { MessagePartnerObject } from "../message_partner_object";
import { MPOProtocol, MPOProtocolError, MPOProtocolErrorR } from "./mpo_protocol";
import { EnvironmentT } from "../../../../messaging/src/base/environment";
import { MPOMessageT } from "../mpo_internal_communication/mpo_message";
import { MessagePartner } from "./message_partner";
import { v4 as uuidv4 } from "uuid";
import { Json } from "../../../../messaging/src/base/message";
import { MPOs, MPOCommand, MPOSenderClassMap } from "./prototype_extension";

const firstRequestDataSchema = Schema.Struct(
    { command: Schema.String },
    { key: Schema.String, value: Schema.Any }
)

class CreateMPOProtocol extends MPOProtocol<MessagePartnerObject, MessagePartnerObject> {
    constructor() {
        super("create_mpo", "1.0.0");
    }

    run<T extends MPOCommand>(mpo: MessagePartner, data: T | {
        command: T;
        [key: string]: Json;
    }): Effect.Effect<MPOSenderClassMap[T], MPOProtocolError, EnvironmentT> {
        const self = this;
        return Effect.gen(function* (_) {
            data = typeof data === "string" ? { command: data } : data;
            const command = data.command;

            const res1 = yield* self.send_first_message(mpo, data);
            const uuid = res1.data;
            if (typeof uuid !== "string") {
                return yield* Effect.fail(new MPOProtocolErrorR({
                    message: "Invalid UUID",
                    data: {},
                    internal_message: res1
                }));
            }

            const mpo_config = MPOs.find(mpo => mpo.command === command)!;
            const mpo_obj = mpo_config.senderClass.fromExistingMessagePartnerObject(
                mpo, uuid
            );
            return mpo_obj as MPOSenderClassMap[T];
        });
    }

    get on_first_request(): Effect.Effect<void, MPOProtocolError, MPOMessageT> {
        return Effect.gen(function* (_) {
            const im = yield* _(MPOMessageT);
            const data = yield* Schema.decodeUnknown(firstRequestDataSchema)(im.data).pipe(
                Effect.mapError(e => new MPOProtocolErrorR({
                    message: "Invalid first request data",
                    data: {},
                    internal_message: im
                }))
            );

            const command = data.command;
            const mpo_config = MPOs.find(mpo => mpo.command === command);
            if (!mpo_config) {
                return yield* Effect.fail(new MPOProtocolErrorR({
                    message: "Invalid command",
                    data: {},
                    internal_message: im
                }));
            }

            const cb_name = mpo_config.create_method_name + "_cb";
            if (!((im.mpo as any)[cb_name] instanceof Function)) {
                return yield* Effect.fail(new MPOProtocolErrorR({
                    message: "Message partner doesn't have callback registered",
                    data: {},
                    internal_message: im
                }));
            }

            const uuid = uuidv4();
            yield* im.respond(uuid); // Also to make sure I can answer

            const mpo_obj = mpo_config.receiverClass.fromExistingMessagePartnerObject(
                im.mpo, uuid
            );

            if ((im.mpo as any)[cb_name] instanceof Function) {
                (im.mpo as any)[cb_name](mpo_obj, data);
            } else {
                mpo_obj.remove();
            }
        });
    }
}

export const CreateMPO = new CreateMPOProtocol();