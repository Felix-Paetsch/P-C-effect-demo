import { CommandProtocol } from "../../internal_communication/command_protocol";
import { MessagePartner } from "../message_partner";
import { Effect, Schema } from "effect";
import { CommunicationError, CommunicationErrorN, CommunicationErrorR } from "../../internal_communication/internal_messages/protocol";
import { EnvironmentT } from "../../../../../messaging/src/base/environment";
import { create__cb, MPOCommand, MPOs } from "./prototype_extension";
import { Json } from "../../../../../messaging/src/base/message";
import { InternalMessage } from "../../internal_communication/internal_messages/internal_message";
import { v4 as uuidv4 } from 'uuid';
import { MessagePartnerObject } from "../../message_partner_object";

class CreateMPOCommandProtocol extends CommandProtocol<MessagePartnerObject> {
    constructor() {
        super("create_mpo");
    }

    run(mpo: MessagePartner, data: {
        obj_cmd: MPOCommand,
        data: Json
    }): Effect.Effect<MessagePartnerObject, CommunicationError, EnvironmentT> {
        const self = this;

        return Effect.gen(function* (_) {
            const resE = yield* self.send_first_internal_message(mpo, data);
            const im = yield* resE;
            const uuid = im.data;
            if (!(typeof uuid == "string")) {
                yield* Effect.fail(new CommunicationErrorR({
                    message: "Expected uuid",
                    Message: im
                }))
            }

            const mpoClass = MPOs.find(mpo => mpo.command == data.obj_cmd);
            if (!mpoClass) {
                return yield* Effect.fail(new CommunicationErrorN({
                    message: "Unknown creation command",
                    Message: im
                }))
            }

            return mpoClass.senderClass.fromExistingMessagePartnerObject(mpo, uuid as string);
        })
    }

    recieve(mpo: MessagePartner, recieve_data: Json, im: InternalMessage): Effect.Effect<void, CommunicationError, EnvironmentT> {
        return Effect.gen(function* (_) {
            const {
                obj_cmd,
                data
            } = yield* Schema.decodeUnknown(
                Schema.Struct({
                    obj_cmd: Schema.String,
                    data: Schema.Any
                })
            )(recieve_data).pipe(
                Effect.mapError(e => new CommunicationErrorR({
                    message: "Invalid message format",
                    Message: im
                }))
            );

            const mpoClass = MPOs.find(mpo => mpo.command == obj_cmd);
            if (!mpoClass) {
                return yield* Effect.fail(new CommunicationErrorR({
                    message: "Unknown creation command",
                    Message: im
                }))
            }

            const cb = (mpo as any)[`${mpoClass?.create_method_name}_cb`] as create__cb<any>;
            if (!cb) {
                return yield* Effect.fail(new CommunicationErrorR({
                    message: "No callback found",
                    Message: im
                }))
            }

            const uuid = uuidv4();
            yield* im.respond(uuid);

            const mpo_object = mpoClass?.receiverClass.fromExistingMessagePartnerObject(mpo, uuid as string);
            if (cb) {
                cb(mpo_object, data);
            } else {
                mpo_object.remove();
            }
            return;
        })
    }
}

export const CreateMPOCommand = new CreateMPOCommandProtocol();