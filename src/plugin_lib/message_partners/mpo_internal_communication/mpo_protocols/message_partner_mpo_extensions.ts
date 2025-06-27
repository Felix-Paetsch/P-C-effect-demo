import { Effect } from "effect";
import { MessagePartner } from "../../message_partner";
import { MessagePartnerObject } from "../../message_partner_object";
import { MPOProtocolError } from "./mpo_protocol";
import { EnvironmentT } from "../../../../../messaging/src/base/environment";
import { Json } from "../../../../../messaging/src/base/message";

// Define the MPOs array that configures all available MPO protocols
export const MPOs = [
    {
        senderClass: MessagePartner,
        receiverClass: MessagePartnerObject,
        create_method_name: "branch",
        command: "create_message_partner"
    }
] as const satisfies readonly {
    senderClass: new (...args: any[]) => MessagePartnerObject;
    receiverClass: new (...args: any[]) => MessagePartnerObject;
    create_method_name: string;
    command: string;
}[];

export type MPOCommand = typeof MPOs[number]["command"];
export type MPOSenderClassMap = {
    [K in typeof MPOs[number]as K["command"]]: InstanceType<K["senderClass"]>
};
export type MPOReceiverClassMap = {
    [K in typeof MPOs[number]as K["command"]]: InstanceType<K["receiverClass"]>
};

// Generate interface declarations for each MPO entry
declare module "../../message_partner" {
    interface MessagePartner {
        // Dynamic methods and properties based on MPOs array
        branch: (data?: Json) => Effect.Effect<MessagePartner, MPOProtocolError, EnvironmentT>;
        on_branch: (callback: (receiverClass: MessagePartnerObject, data?: Json) => void) => void;
        branch_cb: null | ((receiverClass: MessagePartnerObject, data?: Json) => void);
    }
}

// Generate implementations for each MPO entry
// Note: CreateMPO import is deferred to avoid circular dependency
MPOs.forEach(mpoConfig => {
    const { create_method_name, command, senderClass, receiverClass } = mpoConfig;

    // Add the main method: [create_method_name](data?: Json) => senderClass
    (MessagePartner.prototype as any)[create_method_name] = function (data?: Json) {
        const self = this;
        // Import CreateMPO dynamically to avoid circular dependency
        const { CreateMPO } = require("./create_mpo");
        return CreateMPO.run(self, data ? { command: command, ...(data as object) } : command);
    };

    // Add the on_[create_method_name] method
    const onMethodName = `on_${create_method_name}`;
    (MessagePartner.prototype as any)[onMethodName] = function (callback: (receiverClass: MessagePartnerObject, data?: Json) => void) {
        (this as any)[`${create_method_name}_cb`] = callback;
    };

    // Initialize the callback property to null
    const callbackPropertyName = `${create_method_name}_cb`;
    (MessagePartner.prototype as any)[callbackPropertyName] = null;
}); 