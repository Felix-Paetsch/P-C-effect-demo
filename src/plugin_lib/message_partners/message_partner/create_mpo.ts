import { MessagePartnerObject } from "../message_partner_object";
import { Bridge } from "../bridge/bridge";
import { Effect } from "effect";
import { CommunicationError, CommunicationErrorR } from "../internal_communication/protocol";
import { Json } from "../../../../messaging/src/base/message";
import { EnvironmentT } from "../../../../messaging/src/base/environment";
import { InternalMessage } from "../internal_communication/internal_message";
import { v4 as uuidv4 } from 'uuid';

export const MPO_CONFIGS = [
    {
        command: "create_message_partner",
        senderClass: MessagePartnerObject,
        receiverClass: MessagePartnerObject,
        create_method_name: "branch"
    },
    {
        command: "create_bridge",
        senderClass: Bridge,
        receiverClass: Bridge,
        create_method_name: "bridge"
    }
] as const;

export type MPOCommand = typeof MPO_CONFIGS[number]["command"];

export function getClassForCommand(command: MPOCommand) {
    return MPO_CONFIGS.find(config => config.command === command) || null;
}

export function createMpo<T extends MessagePartnerObject>(
    messagePartner: T,
    command: MPOCommand,
    data: Json = null
): Effect.Effect<any, CommunicationError, EnvironmentT> {
    return Effect.gen(function* () {
        const imE = yield* messagePartner._send_first_internal_message("create_mpo", { obj_cmd: command, data });
        const im = yield* imE;

        const uuid = im.data as string;
        if (!uuid) return yield* new CommunicationErrorR({ message: "Expected uuid", Message: im });

        const mpoClass = getClassForCommand(command);
        if (!mpoClass) {
            return yield* new CommunicationErrorR({ message: "Unknown command", Message: im });
        }

        yield* im.respond("OK", 50000);
        return mpoClass.senderClass.fromExistingMessagePartnerObject(messagePartner, uuid);
    });
}

export function receiveMpo(
    messagePartner: any,
    data: Json,
    im: InternalMessage
): Effect.Effect<void, CommunicationError, EnvironmentT> {
    return Effect.gen(function* () {

        const parsed = data as any;
        const obj_cmd = parsed?.obj_cmd;

        // Loop over configs to find matching command and callback
        const config = MPO_CONFIGS.find(c => c.command === obj_cmd);
        if (!config) {
            return yield* new CommunicationErrorR({
                message: "Unknown creation command",
                Message: im
            });
        }

        const callbackName = `${config.create_method_name}_cb`;
        const cb = messagePartner[callbackName];
        if (!cb) {
            return yield* new CommunicationErrorR({
                message: "No callback found",
                Message: im
            });
        }

        const uuid = uuidv4();
        yield* im.respond(uuid, 50000);
        const mpo_object = config.receiverClass.fromExistingMessagePartnerObject(messagePartner, uuid);
        cb(mpo_object, parsed.data);
    });
} 