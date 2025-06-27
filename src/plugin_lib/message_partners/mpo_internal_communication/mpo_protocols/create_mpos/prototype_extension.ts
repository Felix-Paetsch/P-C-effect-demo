import { Effect } from "effect";
import { MessagePartner } from "../../../message_partner";
import { MessagePartnerObject } from "../../../message_partner_object";

type Json = any; // Simplified for this example
type EnvironmentT = any; // Simplified for this example

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

export type DynamicallyAddedMessagePartnerMembers = {
    // Call methods
    [K in MPOConfigUnion as K["create_method_name"]]:
    (data?: Json) => Effect.Effect<
        InstanceType<K["senderClass"]>,
        any,
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

declare module "../../../message_partner" {
    interface MessagePartner extends DynamicallyAddedMessagePartnerMembers { }
}

export function initCreateMPOPrototypeExtensionMethods(createMPOProtocol: any) {
    MPOs.forEach(mpoConfig => {
        const { create_method_name, command } = mpoConfig;

        (MessagePartner.prototype as any)[create_method_name] = function (data?: Json) {
            const self = this;
            return createMPOProtocol.run(self, data ? { command: command, ...(data as object) } : command);
        };

        const onMethodName = `on_${create_method_name}`;
        (MessagePartner.prototype as any)[onMethodName] = function (callback: null | ((receiverClass: MessagePartnerObject, data?: Json) => void)) {
            (this as any)[`${create_method_name}_cb`] = callback;
        };

        const callbackPropertyName = `${create_method_name}_cb`;
        (MessagePartner.prototype as any)[callbackPropertyName] = null;
    });
}