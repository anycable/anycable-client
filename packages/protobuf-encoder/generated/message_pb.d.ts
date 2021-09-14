import $protobuf from "protobufjs";
/** Namespace action_cable. */
export namespace action_cable {

    /** Type enum. */
    enum Type {
        no_type = 0,
        welcome = 1,
        disconnect = 2,
        ping = 3,
        confirm_subscription = 4,
        reject_subscription = 5
    }

    /** Command enum. */
    enum Command {
        unknown_command = 0,
        subscribe = 1,
        unsubscribe = 2,
        message = 3
    }

    /** Properties of a Message. */
    interface IMessage {

        /** Message type */
        type?: (action_cable.Type|null);

        /** Message command */
        command?: (action_cable.Command|null);

        /** Message identifier */
        identifier?: (string|null);

        /** Message data */
        data?: (string|null);

        /** Message message */
        message?: (Uint8Array|null);

        /** Message reason */
        reason?: (string|null);

        /** Message reconnect */
        reconnect?: (boolean|null);
    }

    /** Represents a Message. */
    class Message implements IMessage {

        /**
         * Constructs a new Message.
         * @param [properties] Properties to set
         */
        constructor(properties?: action_cable.IMessage);

        /** Message type. */
        public type: action_cable.Type;

        /** Message command. */
        public command: action_cable.Command;

        /** Message identifier. */
        public identifier: string;

        /** Message data. */
        public data: string;

        /** Message message. */
        public message: Uint8Array;

        /** Message reason. */
        public reason: string;

        /** Message reconnect. */
        public reconnect: boolean;

        /**
         * Creates a new Message instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Message instance
         */
        public static create(properties?: action_cable.IMessage): action_cable.Message;

        /**
         * Encodes the specified Message message. Does not implicitly {@link action_cable.Message.verify|verify} messages.
         * @param message Message message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: action_cable.IMessage, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Message message, length delimited. Does not implicitly {@link action_cable.Message.verify|verify} messages.
         * @param message Message message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: action_cable.IMessage, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Message message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Message
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): action_cable.Message;

        /**
         * Decodes a Message message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Message
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): action_cable.Message;

        /**
         * Verifies a Message message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Message message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Message
         */
        public static fromObject(object: { [k: string]: any }): action_cable.Message;

        /**
         * Creates a plain object from a Message message. Also converts values to other types if specified.
         * @param message Message
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: action_cable.Message, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Message to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };
    }
}
