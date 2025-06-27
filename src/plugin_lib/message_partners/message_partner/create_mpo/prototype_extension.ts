import { Effect } from "effect";
import { MessagePartner } from "../message_partner";
import { MessagePartnerObject } from "../../message_partner_object";
import { CommunicationError } from "../../internal_communication/internal_messages/protocol";
import { Json } from "../../../../../messaging/src/base/message";
import { EnvironmentT } from "../../../../../messaging/src/base/environment";

export const MPOs = [
    {
        senderClass: MessagePartnerObject,
        receiverClass: MessagePartnerObject,
        create_method_name: "branch",
        command: "create_message_partner"
    },
    /*{
        senderClass: Bridge,
        receiverClass: Bridge,
        create_method_name: "bridge",
        command: "create_bridge"
    }*/
] as const;

type MPOConfigUnion = typeof MPOs[number];
export type MPOCommand = MPOConfigUnion["command"];

export type MPOSenderClassMap = {
    [K in MPOConfigUnion as K["command"]]: InstanceType<K["senderClass"]>;
};
export type MPOReceiverClassMap = {
    [K in MPOConfigUnion as K["command"]]: InstanceType<K["receiverClass"]>;
};

type DynamicallyAddedMessagePartnerMembers = {
    // Call methods
    [K in MPOConfigUnion as K["create_method_name"]]:
    (data?: Json) => Effect.Effect<
        InstanceType<K["senderClass"]>,
        CommunicationError,
        EnvironmentT
    >;
} & {
    // 'on_' methods
    [K in MPOConfigUnion as `on_${K["create_method_name"]}`]:
    (callback: null | ((receiverClass: InstanceType<K["receiverClass"]>, data?: Json) => void)) => void;
} & {
    // Callback properties
    [K in MPOConfigUnion as `${K["create_method_name"]}_cb`]:
    null | ((receiverClass: InstanceType<K["receiverClass"]>, data?: Json) => void);
};

declare module "../message_partner" {
    interface MessagePartner extends DynamicallyAddedMessagePartnerMembers { }
}

export type on__create<R extends MPOConfigUnion["receiverClass"]> = (callback: null | ((receiverClass: R, data?: Json) => void)) => void;
export type create__cb<R extends MPOConfigUnion["receiverClass"]> = null | ((receiverClass: R, data?: Json) => void);
export type _call__create_<S extends MPOConfigUnion["senderClass"]> = (data?: Json) => Effect.Effect<
    InstanceType<S>,
    CommunicationError,
    EnvironmentT
>

MPOs.forEach(mpoConfig => {
    const { create_method_name } = mpoConfig;
    const create__fun: _call__create_<any> = function (this: MessagePartner, data: Json = null) {
        return this._run_protocol("create_mpo", {
            obj_cmd: mpoConfig.command,
            data
        }).pipe(Effect.map(res => res as MessagePartner));
    };

    const on__fun: on__create<any> = function (this: MessagePartner, callback: null | ((receiverClass: MessagePartnerObject, data?: Json) => void)) {
        (this as any)[`${create_method_name}_cb`] = callback;
    };

    (MessagePartner.prototype as any)[create_method_name] = create__fun;

    const onMethodName = `on_${create_method_name}`;
    (MessagePartner.prototype as any)[onMethodName] = on__fun;

    const callbackPropertyName = `${create_method_name}_cb`;
    (MessagePartner.prototype as any)[callbackPropertyName] = null;
});