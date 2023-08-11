/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
import $protobuf from "protobufjs/minimal.js"
$protobuf.util.Long = undefined;
$protobuf.configure();

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const action_cable = $root.action_cable = (() => {

    /**
     * Namespace action_cable.
     * @exports action_cable
     * @namespace
     */
    const action_cable = {};

    /**
     * Type enum.
     * @name action_cable.Type
     * @enum {number}
     * @property {number} no_type=0 no_type value
     * @property {number} welcome=1 welcome value
     * @property {number} disconnect=2 disconnect value
     * @property {number} ping=3 ping value
     * @property {number} confirm_subscription=4 confirm_subscription value
     * @property {number} reject_subscription=5 reject_subscription value
     * @property {number} confirm_history=6 confirm_history value
     * @property {number} reject_history=7 reject_history value
     */
    action_cable.Type = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "no_type"] = 0;
        values[valuesById[1] = "welcome"] = 1;
        values[valuesById[2] = "disconnect"] = 2;
        values[valuesById[3] = "ping"] = 3;
        values[valuesById[4] = "confirm_subscription"] = 4;
        values[valuesById[5] = "reject_subscription"] = 5;
        values[valuesById[6] = "confirm_history"] = 6;
        values[valuesById[7] = "reject_history"] = 7;
        return values;
    })();

    /**
     * Command enum.
     * @name action_cable.Command
     * @enum {number}
     * @property {number} unknown_command=0 unknown_command value
     * @property {number} subscribe=1 subscribe value
     * @property {number} unsubscribe=2 unsubscribe value
     * @property {number} message=3 message value
     * @property {number} history=4 history value
     * @property {number} pong=5 pong value
     */
    action_cable.Command = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "unknown_command"] = 0;
        values[valuesById[1] = "subscribe"] = 1;
        values[valuesById[2] = "unsubscribe"] = 2;
        values[valuesById[3] = "message"] = 3;
        values[valuesById[4] = "history"] = 4;
        values[valuesById[5] = "pong"] = 5;
        return values;
    })();

    action_cable.StreamHistoryRequest = (function() {

        /**
         * Properties of a StreamHistoryRequest.
         * @memberof action_cable
         * @interface IStreamHistoryRequest
         * @property {string|null} [epoch] StreamHistoryRequest epoch
         * @property {number|null} [offset] StreamHistoryRequest offset
         */

        /**
         * Constructs a new StreamHistoryRequest.
         * @memberof action_cable
         * @classdesc Represents a StreamHistoryRequest.
         * @implements IStreamHistoryRequest
         * @constructor
         * @param {action_cable.IStreamHistoryRequest=} [properties] Properties to set
         */
        function StreamHistoryRequest(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * StreamHistoryRequest epoch.
         * @member {string} epoch
         * @memberof action_cable.StreamHistoryRequest
         * @instance
         */
        StreamHistoryRequest.prototype.epoch = "";

        /**
         * StreamHistoryRequest offset.
         * @member {number} offset
         * @memberof action_cable.StreamHistoryRequest
         * @instance
         */
        StreamHistoryRequest.prototype.offset = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Creates a new StreamHistoryRequest instance using the specified properties.
         * @function create
         * @memberof action_cable.StreamHistoryRequest
         * @static
         * @param {action_cable.IStreamHistoryRequest=} [properties] Properties to set
         * @returns {action_cable.StreamHistoryRequest} StreamHistoryRequest instance
         */
        StreamHistoryRequest.create = function create(properties) {
            return new StreamHistoryRequest(properties);
        };

        /**
         * Encodes the specified StreamHistoryRequest message. Does not implicitly {@link action_cable.StreamHistoryRequest.verify|verify} messages.
         * @function encode
         * @memberof action_cable.StreamHistoryRequest
         * @static
         * @param {action_cable.IStreamHistoryRequest} message StreamHistoryRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        StreamHistoryRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.epoch != null && Object.hasOwnProperty.call(message, "epoch"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.epoch);
            if (message.offset != null && Object.hasOwnProperty.call(message, "offset"))
                writer.uint32(/* id 3, wireType 0 =*/24).int64(message.offset);
            return writer;
        };

        /**
         * Encodes the specified StreamHistoryRequest message, length delimited. Does not implicitly {@link action_cable.StreamHistoryRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof action_cable.StreamHistoryRequest
         * @static
         * @param {action_cable.IStreamHistoryRequest} message StreamHistoryRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        StreamHistoryRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a StreamHistoryRequest message from the specified reader or buffer.
         * @function decode
         * @memberof action_cable.StreamHistoryRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {action_cable.StreamHistoryRequest} StreamHistoryRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        StreamHistoryRequest.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.action_cable.StreamHistoryRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 2: {
                        message.epoch = reader.string();
                        break;
                    }
                case 3: {
                        message.offset = reader.int64();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a StreamHistoryRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof action_cable.StreamHistoryRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {action_cable.StreamHistoryRequest} StreamHistoryRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        StreamHistoryRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a StreamHistoryRequest message.
         * @function verify
         * @memberof action_cable.StreamHistoryRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        StreamHistoryRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.epoch != null && message.hasOwnProperty("epoch"))
                if (!$util.isString(message.epoch))
                    return "epoch: string expected";
            if (message.offset != null && message.hasOwnProperty("offset"))
                if (!$util.isInteger(message.offset) && !(message.offset && $util.isInteger(message.offset.low) && $util.isInteger(message.offset.high)))
                    return "offset: integer|Long expected";
            return null;
        };

        /**
         * Creates a StreamHistoryRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof action_cable.StreamHistoryRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {action_cable.StreamHistoryRequest} StreamHistoryRequest
         */
        StreamHistoryRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.action_cable.StreamHistoryRequest)
                return object;
            let message = new $root.action_cable.StreamHistoryRequest();
            if (object.epoch != null)
                message.epoch = String(object.epoch);
            if (object.offset != null)
                if ($util.Long)
                    (message.offset = $util.Long.fromValue(object.offset)).unsigned = false;
                else if (typeof object.offset === "string")
                    message.offset = parseInt(object.offset, 10);
                else if (typeof object.offset === "number")
                    message.offset = object.offset;
                else if (typeof object.offset === "object")
                    message.offset = new $util.LongBits(object.offset.low >>> 0, object.offset.high >>> 0).toNumber();
            return message;
        };

        /**
         * Creates a plain object from a StreamHistoryRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof action_cable.StreamHistoryRequest
         * @static
         * @param {action_cable.StreamHistoryRequest} message StreamHistoryRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        StreamHistoryRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.epoch = "";
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.offset = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.offset = options.longs === String ? "0" : 0;
            }
            if (message.epoch != null && message.hasOwnProperty("epoch"))
                object.epoch = message.epoch;
            if (message.offset != null && message.hasOwnProperty("offset"))
                if (typeof message.offset === "number")
                    object.offset = options.longs === String ? String(message.offset) : message.offset;
                else
                    object.offset = options.longs === String ? $util.Long.prototype.toString.call(message.offset) : options.longs === Number ? new $util.LongBits(message.offset.low >>> 0, message.offset.high >>> 0).toNumber() : message.offset;
            return object;
        };

        /**
         * Converts this StreamHistoryRequest to JSON.
         * @function toJSON
         * @memberof action_cable.StreamHistoryRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        StreamHistoryRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for StreamHistoryRequest
         * @function getTypeUrl
         * @memberof action_cable.StreamHistoryRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        StreamHistoryRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/action_cable.StreamHistoryRequest";
        };

        return StreamHistoryRequest;
    })();

    action_cable.HistoryRequest = (function() {

        /**
         * Properties of a HistoryRequest.
         * @memberof action_cable
         * @interface IHistoryRequest
         * @property {number|null} [since] HistoryRequest since
         * @property {Object.<string,action_cable.IStreamHistoryRequest>|null} [streams] HistoryRequest streams
         */

        /**
         * Constructs a new HistoryRequest.
         * @memberof action_cable
         * @classdesc Represents a HistoryRequest.
         * @implements IHistoryRequest
         * @constructor
         * @param {action_cable.IHistoryRequest=} [properties] Properties to set
         */
        function HistoryRequest(properties) {
            this.streams = {};
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * HistoryRequest since.
         * @member {number} since
         * @memberof action_cable.HistoryRequest
         * @instance
         */
        HistoryRequest.prototype.since = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * HistoryRequest streams.
         * @member {Object.<string,action_cable.IStreamHistoryRequest>} streams
         * @memberof action_cable.HistoryRequest
         * @instance
         */
        HistoryRequest.prototype.streams = $util.emptyObject;

        /**
         * Creates a new HistoryRequest instance using the specified properties.
         * @function create
         * @memberof action_cable.HistoryRequest
         * @static
         * @param {action_cable.IHistoryRequest=} [properties] Properties to set
         * @returns {action_cable.HistoryRequest} HistoryRequest instance
         */
        HistoryRequest.create = function create(properties) {
            return new HistoryRequest(properties);
        };

        /**
         * Encodes the specified HistoryRequest message. Does not implicitly {@link action_cable.HistoryRequest.verify|verify} messages.
         * @function encode
         * @memberof action_cable.HistoryRequest
         * @static
         * @param {action_cable.IHistoryRequest} message HistoryRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        HistoryRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.since != null && Object.hasOwnProperty.call(message, "since"))
                writer.uint32(/* id 1, wireType 0 =*/8).int64(message.since);
            if (message.streams != null && Object.hasOwnProperty.call(message, "streams"))
                for (let keys = Object.keys(message.streams), i = 0; i < keys.length; ++i) {
                    writer.uint32(/* id 2, wireType 2 =*/18).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]);
                    $root.action_cable.StreamHistoryRequest.encode(message.streams[keys[i]], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim().ldelim();
                }
            return writer;
        };

        /**
         * Encodes the specified HistoryRequest message, length delimited. Does not implicitly {@link action_cable.HistoryRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof action_cable.HistoryRequest
         * @static
         * @param {action_cable.IHistoryRequest} message HistoryRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        HistoryRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a HistoryRequest message from the specified reader or buffer.
         * @function decode
         * @memberof action_cable.HistoryRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {action_cable.HistoryRequest} HistoryRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        HistoryRequest.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.action_cable.HistoryRequest(), key, value;
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.since = reader.int64();
                        break;
                    }
                case 2: {
                        if (message.streams === $util.emptyObject)
                            message.streams = {};
                        let end2 = reader.uint32() + reader.pos;
                        key = "";
                        value = null;
                        while (reader.pos < end2) {
                            let tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.string();
                                break;
                            case 2:
                                value = $root.action_cable.StreamHistoryRequest.decode(reader, reader.uint32());
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.streams[key] = value;
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a HistoryRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof action_cable.HistoryRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {action_cable.HistoryRequest} HistoryRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        HistoryRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a HistoryRequest message.
         * @function verify
         * @memberof action_cable.HistoryRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        HistoryRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.since != null && message.hasOwnProperty("since"))
                if (!$util.isInteger(message.since) && !(message.since && $util.isInteger(message.since.low) && $util.isInteger(message.since.high)))
                    return "since: integer|Long expected";
            if (message.streams != null && message.hasOwnProperty("streams")) {
                if (!$util.isObject(message.streams))
                    return "streams: object expected";
                let key = Object.keys(message.streams);
                for (let i = 0; i < key.length; ++i) {
                    let error = $root.action_cable.StreamHistoryRequest.verify(message.streams[key[i]]);
                    if (error)
                        return "streams." + error;
                }
            }
            return null;
        };

        /**
         * Creates a HistoryRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof action_cable.HistoryRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {action_cable.HistoryRequest} HistoryRequest
         */
        HistoryRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.action_cable.HistoryRequest)
                return object;
            let message = new $root.action_cable.HistoryRequest();
            if (object.since != null)
                if ($util.Long)
                    (message.since = $util.Long.fromValue(object.since)).unsigned = false;
                else if (typeof object.since === "string")
                    message.since = parseInt(object.since, 10);
                else if (typeof object.since === "number")
                    message.since = object.since;
                else if (typeof object.since === "object")
                    message.since = new $util.LongBits(object.since.low >>> 0, object.since.high >>> 0).toNumber();
            if (object.streams) {
                if (typeof object.streams !== "object")
                    throw TypeError(".action_cable.HistoryRequest.streams: object expected");
                message.streams = {};
                for (let keys = Object.keys(object.streams), i = 0; i < keys.length; ++i) {
                    if (typeof object.streams[keys[i]] !== "object")
                        throw TypeError(".action_cable.HistoryRequest.streams: object expected");
                    message.streams[keys[i]] = $root.action_cable.StreamHistoryRequest.fromObject(object.streams[keys[i]]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a HistoryRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof action_cable.HistoryRequest
         * @static
         * @param {action_cable.HistoryRequest} message HistoryRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        HistoryRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.objects || options.defaults)
                object.streams = {};
            if (options.defaults)
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.since = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.since = options.longs === String ? "0" : 0;
            if (message.since != null && message.hasOwnProperty("since"))
                if (typeof message.since === "number")
                    object.since = options.longs === String ? String(message.since) : message.since;
                else
                    object.since = options.longs === String ? $util.Long.prototype.toString.call(message.since) : options.longs === Number ? new $util.LongBits(message.since.low >>> 0, message.since.high >>> 0).toNumber() : message.since;
            let keys2;
            if (message.streams && (keys2 = Object.keys(message.streams)).length) {
                object.streams = {};
                for (let j = 0; j < keys2.length; ++j)
                    object.streams[keys2[j]] = $root.action_cable.StreamHistoryRequest.toObject(message.streams[keys2[j]], options);
            }
            return object;
        };

        /**
         * Converts this HistoryRequest to JSON.
         * @function toJSON
         * @memberof action_cable.HistoryRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        HistoryRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for HistoryRequest
         * @function getTypeUrl
         * @memberof action_cable.HistoryRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        HistoryRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/action_cable.HistoryRequest";
        };

        return HistoryRequest;
    })();

    action_cable.Message = (function() {

        /**
         * Properties of a Message.
         * @memberof action_cable
         * @interface IMessage
         * @property {action_cable.Type|null} [type] Message type
         * @property {action_cable.Command|null} [command] Message command
         * @property {string|null} [identifier] Message identifier
         * @property {string|null} [data] Message data
         * @property {Uint8Array|null} [message] Message message
         * @property {string|null} [reason] Message reason
         * @property {boolean|null} [reconnect] Message reconnect
         * @property {action_cable.IHistoryRequest|null} [history] Message history
         */

        /**
         * Constructs a new Message.
         * @memberof action_cable
         * @classdesc Represents a Message.
         * @implements IMessage
         * @constructor
         * @param {action_cable.IMessage=} [properties] Properties to set
         */
        function Message(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Message type.
         * @member {action_cable.Type} type
         * @memberof action_cable.Message
         * @instance
         */
        Message.prototype.type = 0;

        /**
         * Message command.
         * @member {action_cable.Command} command
         * @memberof action_cable.Message
         * @instance
         */
        Message.prototype.command = 0;

        /**
         * Message identifier.
         * @member {string} identifier
         * @memberof action_cable.Message
         * @instance
         */
        Message.prototype.identifier = "";

        /**
         * Message data.
         * @member {string} data
         * @memberof action_cable.Message
         * @instance
         */
        Message.prototype.data = "";

        /**
         * Message message.
         * @member {Uint8Array} message
         * @memberof action_cable.Message
         * @instance
         */
        Message.prototype.message = $util.newBuffer([]);

        /**
         * Message reason.
         * @member {string} reason
         * @memberof action_cable.Message
         * @instance
         */
        Message.prototype.reason = "";

        /**
         * Message reconnect.
         * @member {boolean} reconnect
         * @memberof action_cable.Message
         * @instance
         */
        Message.prototype.reconnect = false;

        /**
         * Message history.
         * @member {action_cable.IHistoryRequest|null|undefined} history
         * @memberof action_cable.Message
         * @instance
         */
        Message.prototype.history = null;

        /**
         * Creates a new Message instance using the specified properties.
         * @function create
         * @memberof action_cable.Message
         * @static
         * @param {action_cable.IMessage=} [properties] Properties to set
         * @returns {action_cable.Message} Message instance
         */
        Message.create = function create(properties) {
            return new Message(properties);
        };

        /**
         * Encodes the specified Message message. Does not implicitly {@link action_cable.Message.verify|verify} messages.
         * @function encode
         * @memberof action_cable.Message
         * @static
         * @param {action_cable.IMessage} message Message message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Message.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.type != null && Object.hasOwnProperty.call(message, "type"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.type);
            if (message.command != null && Object.hasOwnProperty.call(message, "command"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.command);
            if (message.identifier != null && Object.hasOwnProperty.call(message, "identifier"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.identifier);
            if (message.data != null && Object.hasOwnProperty.call(message, "data"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.data);
            if (message.message != null && Object.hasOwnProperty.call(message, "message"))
                writer.uint32(/* id 5, wireType 2 =*/42).bytes(message.message);
            if (message.reason != null && Object.hasOwnProperty.call(message, "reason"))
                writer.uint32(/* id 6, wireType 2 =*/50).string(message.reason);
            if (message.reconnect != null && Object.hasOwnProperty.call(message, "reconnect"))
                writer.uint32(/* id 7, wireType 0 =*/56).bool(message.reconnect);
            if (message.history != null && Object.hasOwnProperty.call(message, "history"))
                $root.action_cable.HistoryRequest.encode(message.history, writer.uint32(/* id 8, wireType 2 =*/66).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified Message message, length delimited. Does not implicitly {@link action_cable.Message.verify|verify} messages.
         * @function encodeDelimited
         * @memberof action_cable.Message
         * @static
         * @param {action_cable.IMessage} message Message message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Message.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Message message from the specified reader or buffer.
         * @function decode
         * @memberof action_cable.Message
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {action_cable.Message} Message
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Message.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.action_cable.Message();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.type = reader.int32();
                        break;
                    }
                case 2: {
                        message.command = reader.int32();
                        break;
                    }
                case 3: {
                        message.identifier = reader.string();
                        break;
                    }
                case 4: {
                        message.data = reader.string();
                        break;
                    }
                case 5: {
                        message.message = reader.bytes();
                        break;
                    }
                case 6: {
                        message.reason = reader.string();
                        break;
                    }
                case 7: {
                        message.reconnect = reader.bool();
                        break;
                    }
                case 8: {
                        message.history = $root.action_cable.HistoryRequest.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a Message message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof action_cable.Message
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {action_cable.Message} Message
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Message.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Message message.
         * @function verify
         * @memberof action_cable.Message
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Message.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.type != null && message.hasOwnProperty("type"))
                switch (message.type) {
                default:
                    return "type: enum value expected";
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                case 7:
                    break;
                }
            if (message.command != null && message.hasOwnProperty("command"))
                switch (message.command) {
                default:
                    return "command: enum value expected";
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                    break;
                }
            if (message.identifier != null && message.hasOwnProperty("identifier"))
                if (!$util.isString(message.identifier))
                    return "identifier: string expected";
            if (message.data != null && message.hasOwnProperty("data"))
                if (!$util.isString(message.data))
                    return "data: string expected";
            if (message.message != null && message.hasOwnProperty("message"))
                if (!(message.message && typeof message.message.length === "number" || $util.isString(message.message)))
                    return "message: buffer expected";
            if (message.reason != null && message.hasOwnProperty("reason"))
                if (!$util.isString(message.reason))
                    return "reason: string expected";
            if (message.reconnect != null && message.hasOwnProperty("reconnect"))
                if (typeof message.reconnect !== "boolean")
                    return "reconnect: boolean expected";
            if (message.history != null && message.hasOwnProperty("history")) {
                let error = $root.action_cable.HistoryRequest.verify(message.history);
                if (error)
                    return "history." + error;
            }
            return null;
        };

        /**
         * Creates a Message message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof action_cable.Message
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {action_cable.Message} Message
         */
        Message.fromObject = function fromObject(object) {
            if (object instanceof $root.action_cable.Message)
                return object;
            let message = new $root.action_cable.Message();
            switch (object.type) {
            default:
                if (typeof object.type === "number") {
                    message.type = object.type;
                    break;
                }
                break;
            case "no_type":
            case 0:
                message.type = 0;
                break;
            case "welcome":
            case 1:
                message.type = 1;
                break;
            case "disconnect":
            case 2:
                message.type = 2;
                break;
            case "ping":
            case 3:
                message.type = 3;
                break;
            case "confirm_subscription":
            case 4:
                message.type = 4;
                break;
            case "reject_subscription":
            case 5:
                message.type = 5;
                break;
            case "confirm_history":
            case 6:
                message.type = 6;
                break;
            case "reject_history":
            case 7:
                message.type = 7;
                break;
            }
            switch (object.command) {
            default:
                if (typeof object.command === "number") {
                    message.command = object.command;
                    break;
                }
                break;
            case "unknown_command":
            case 0:
                message.command = 0;
                break;
            case "subscribe":
            case 1:
                message.command = 1;
                break;
            case "unsubscribe":
            case 2:
                message.command = 2;
                break;
            case "message":
            case 3:
                message.command = 3;
                break;
            case "history":
            case 4:
                message.command = 4;
                break;
            case "pong":
            case 5:
                message.command = 5;
                break;
            }
            if (object.identifier != null)
                message.identifier = String(object.identifier);
            if (object.data != null)
                message.data = String(object.data);
            if (object.message != null)
                if (typeof object.message === "string")
                    $util.base64.decode(object.message, message.message = $util.newBuffer($util.base64.length(object.message)), 0);
                else if (object.message.length >= 0)
                    message.message = object.message;
            if (object.reason != null)
                message.reason = String(object.reason);
            if (object.reconnect != null)
                message.reconnect = Boolean(object.reconnect);
            if (object.history != null) {
                if (typeof object.history !== "object")
                    throw TypeError(".action_cable.Message.history: object expected");
                message.history = $root.action_cable.HistoryRequest.fromObject(object.history);
            }
            return message;
        };

        /**
         * Creates a plain object from a Message message. Also converts values to other types if specified.
         * @function toObject
         * @memberof action_cable.Message
         * @static
         * @param {action_cable.Message} message Message
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Message.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.type = options.enums === String ? "no_type" : 0;
                object.command = options.enums === String ? "unknown_command" : 0;
                object.identifier = "";
                object.data = "";
                if (options.bytes === String)
                    object.message = "";
                else {
                    object.message = [];
                    if (options.bytes !== Array)
                        object.message = $util.newBuffer(object.message);
                }
                object.reason = "";
                object.reconnect = false;
                object.history = null;
            }
            if (message.type != null && message.hasOwnProperty("type"))
                object.type = options.enums === String ? $root.action_cable.Type[message.type] === undefined ? message.type : $root.action_cable.Type[message.type] : message.type;
            if (message.command != null && message.hasOwnProperty("command"))
                object.command = options.enums === String ? $root.action_cable.Command[message.command] === undefined ? message.command : $root.action_cable.Command[message.command] : message.command;
            if (message.identifier != null && message.hasOwnProperty("identifier"))
                object.identifier = message.identifier;
            if (message.data != null && message.hasOwnProperty("data"))
                object.data = message.data;
            if (message.message != null && message.hasOwnProperty("message"))
                object.message = options.bytes === String ? $util.base64.encode(message.message, 0, message.message.length) : options.bytes === Array ? Array.prototype.slice.call(message.message) : message.message;
            if (message.reason != null && message.hasOwnProperty("reason"))
                object.reason = message.reason;
            if (message.reconnect != null && message.hasOwnProperty("reconnect"))
                object.reconnect = message.reconnect;
            if (message.history != null && message.hasOwnProperty("history"))
                object.history = $root.action_cable.HistoryRequest.toObject(message.history, options);
            return object;
        };

        /**
         * Converts this Message to JSON.
         * @function toJSON
         * @memberof action_cable.Message
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Message.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Message
         * @function getTypeUrl
         * @memberof action_cable.Message
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Message.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/action_cable.Message";
        };

        return Message;
    })();

    action_cable.Reply = (function() {

        /**
         * Properties of a Reply.
         * @memberof action_cable
         * @interface IReply
         * @property {action_cable.Type|null} [type] Reply type
         * @property {string|null} [identifier] Reply identifier
         * @property {Uint8Array|null} [message] Reply message
         * @property {string|null} [reason] Reply reason
         * @property {boolean|null} [reconnect] Reply reconnect
         * @property {string|null} [stream_id] Reply stream_id
         * @property {string|null} [epoch] Reply epoch
         * @property {number|null} [offset] Reply offset
         * @property {string|null} [sid] Reply sid
         * @property {boolean|null} [restored] Reply restored
         * @property {Array.<string>|null} [restored_ids] Reply restored_ids
         */

        /**
         * Constructs a new Reply.
         * @memberof action_cable
         * @classdesc Represents a Reply.
         * @implements IReply
         * @constructor
         * @param {action_cable.IReply=} [properties] Properties to set
         */
        function Reply(properties) {
            this.restored_ids = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Reply type.
         * @member {action_cable.Type} type
         * @memberof action_cable.Reply
         * @instance
         */
        Reply.prototype.type = 0;

        /**
         * Reply identifier.
         * @member {string} identifier
         * @memberof action_cable.Reply
         * @instance
         */
        Reply.prototype.identifier = "";

        /**
         * Reply message.
         * @member {Uint8Array} message
         * @memberof action_cable.Reply
         * @instance
         */
        Reply.prototype.message = $util.newBuffer([]);

        /**
         * Reply reason.
         * @member {string} reason
         * @memberof action_cable.Reply
         * @instance
         */
        Reply.prototype.reason = "";

        /**
         * Reply reconnect.
         * @member {boolean} reconnect
         * @memberof action_cable.Reply
         * @instance
         */
        Reply.prototype.reconnect = false;

        /**
         * Reply stream_id.
         * @member {string} stream_id
         * @memberof action_cable.Reply
         * @instance
         */
        Reply.prototype.stream_id = "";

        /**
         * Reply epoch.
         * @member {string} epoch
         * @memberof action_cable.Reply
         * @instance
         */
        Reply.prototype.epoch = "";

        /**
         * Reply offset.
         * @member {number} offset
         * @memberof action_cable.Reply
         * @instance
         */
        Reply.prototype.offset = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Reply sid.
         * @member {string} sid
         * @memberof action_cable.Reply
         * @instance
         */
        Reply.prototype.sid = "";

        /**
         * Reply restored.
         * @member {boolean} restored
         * @memberof action_cable.Reply
         * @instance
         */
        Reply.prototype.restored = false;

        /**
         * Reply restored_ids.
         * @member {Array.<string>} restored_ids
         * @memberof action_cable.Reply
         * @instance
         */
        Reply.prototype.restored_ids = $util.emptyArray;

        /**
         * Creates a new Reply instance using the specified properties.
         * @function create
         * @memberof action_cable.Reply
         * @static
         * @param {action_cable.IReply=} [properties] Properties to set
         * @returns {action_cable.Reply} Reply instance
         */
        Reply.create = function create(properties) {
            return new Reply(properties);
        };

        /**
         * Encodes the specified Reply message. Does not implicitly {@link action_cable.Reply.verify|verify} messages.
         * @function encode
         * @memberof action_cable.Reply
         * @static
         * @param {action_cable.IReply} message Reply message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Reply.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.type != null && Object.hasOwnProperty.call(message, "type"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.type);
            if (message.identifier != null && Object.hasOwnProperty.call(message, "identifier"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.identifier);
            if (message.message != null && Object.hasOwnProperty.call(message, "message"))
                writer.uint32(/* id 3, wireType 2 =*/26).bytes(message.message);
            if (message.reason != null && Object.hasOwnProperty.call(message, "reason"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.reason);
            if (message.reconnect != null && Object.hasOwnProperty.call(message, "reconnect"))
                writer.uint32(/* id 5, wireType 0 =*/40).bool(message.reconnect);
            if (message.stream_id != null && Object.hasOwnProperty.call(message, "stream_id"))
                writer.uint32(/* id 6, wireType 2 =*/50).string(message.stream_id);
            if (message.epoch != null && Object.hasOwnProperty.call(message, "epoch"))
                writer.uint32(/* id 7, wireType 2 =*/58).string(message.epoch);
            if (message.offset != null && Object.hasOwnProperty.call(message, "offset"))
                writer.uint32(/* id 8, wireType 0 =*/64).int64(message.offset);
            if (message.sid != null && Object.hasOwnProperty.call(message, "sid"))
                writer.uint32(/* id 9, wireType 2 =*/74).string(message.sid);
            if (message.restored != null && Object.hasOwnProperty.call(message, "restored"))
                writer.uint32(/* id 10, wireType 0 =*/80).bool(message.restored);
            if (message.restored_ids != null && message.restored_ids.length)
                for (let i = 0; i < message.restored_ids.length; ++i)
                    writer.uint32(/* id 11, wireType 2 =*/90).string(message.restored_ids[i]);
            return writer;
        };

        /**
         * Encodes the specified Reply message, length delimited. Does not implicitly {@link action_cable.Reply.verify|verify} messages.
         * @function encodeDelimited
         * @memberof action_cable.Reply
         * @static
         * @param {action_cable.IReply} message Reply message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Reply.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Reply message from the specified reader or buffer.
         * @function decode
         * @memberof action_cable.Reply
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {action_cable.Reply} Reply
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Reply.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.action_cable.Reply();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.type = reader.int32();
                        break;
                    }
                case 2: {
                        message.identifier = reader.string();
                        break;
                    }
                case 3: {
                        message.message = reader.bytes();
                        break;
                    }
                case 4: {
                        message.reason = reader.string();
                        break;
                    }
                case 5: {
                        message.reconnect = reader.bool();
                        break;
                    }
                case 6: {
                        message.stream_id = reader.string();
                        break;
                    }
                case 7: {
                        message.epoch = reader.string();
                        break;
                    }
                case 8: {
                        message.offset = reader.int64();
                        break;
                    }
                case 9: {
                        message.sid = reader.string();
                        break;
                    }
                case 10: {
                        message.restored = reader.bool();
                        break;
                    }
                case 11: {
                        if (!(message.restored_ids && message.restored_ids.length))
                            message.restored_ids = [];
                        message.restored_ids.push(reader.string());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a Reply message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof action_cable.Reply
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {action_cable.Reply} Reply
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Reply.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Reply message.
         * @function verify
         * @memberof action_cable.Reply
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Reply.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.type != null && message.hasOwnProperty("type"))
                switch (message.type) {
                default:
                    return "type: enum value expected";
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                case 7:
                    break;
                }
            if (message.identifier != null && message.hasOwnProperty("identifier"))
                if (!$util.isString(message.identifier))
                    return "identifier: string expected";
            if (message.message != null && message.hasOwnProperty("message"))
                if (!(message.message && typeof message.message.length === "number" || $util.isString(message.message)))
                    return "message: buffer expected";
            if (message.reason != null && message.hasOwnProperty("reason"))
                if (!$util.isString(message.reason))
                    return "reason: string expected";
            if (message.reconnect != null && message.hasOwnProperty("reconnect"))
                if (typeof message.reconnect !== "boolean")
                    return "reconnect: boolean expected";
            if (message.stream_id != null && message.hasOwnProperty("stream_id"))
                if (!$util.isString(message.stream_id))
                    return "stream_id: string expected";
            if (message.epoch != null && message.hasOwnProperty("epoch"))
                if (!$util.isString(message.epoch))
                    return "epoch: string expected";
            if (message.offset != null && message.hasOwnProperty("offset"))
                if (!$util.isInteger(message.offset) && !(message.offset && $util.isInteger(message.offset.low) && $util.isInteger(message.offset.high)))
                    return "offset: integer|Long expected";
            if (message.sid != null && message.hasOwnProperty("sid"))
                if (!$util.isString(message.sid))
                    return "sid: string expected";
            if (message.restored != null && message.hasOwnProperty("restored"))
                if (typeof message.restored !== "boolean")
                    return "restored: boolean expected";
            if (message.restored_ids != null && message.hasOwnProperty("restored_ids")) {
                if (!Array.isArray(message.restored_ids))
                    return "restored_ids: array expected";
                for (let i = 0; i < message.restored_ids.length; ++i)
                    if (!$util.isString(message.restored_ids[i]))
                        return "restored_ids: string[] expected";
            }
            return null;
        };

        /**
         * Creates a Reply message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof action_cable.Reply
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {action_cable.Reply} Reply
         */
        Reply.fromObject = function fromObject(object) {
            if (object instanceof $root.action_cable.Reply)
                return object;
            let message = new $root.action_cable.Reply();
            switch (object.type) {
            default:
                if (typeof object.type === "number") {
                    message.type = object.type;
                    break;
                }
                break;
            case "no_type":
            case 0:
                message.type = 0;
                break;
            case "welcome":
            case 1:
                message.type = 1;
                break;
            case "disconnect":
            case 2:
                message.type = 2;
                break;
            case "ping":
            case 3:
                message.type = 3;
                break;
            case "confirm_subscription":
            case 4:
                message.type = 4;
                break;
            case "reject_subscription":
            case 5:
                message.type = 5;
                break;
            case "confirm_history":
            case 6:
                message.type = 6;
                break;
            case "reject_history":
            case 7:
                message.type = 7;
                break;
            }
            if (object.identifier != null)
                message.identifier = String(object.identifier);
            if (object.message != null)
                if (typeof object.message === "string")
                    $util.base64.decode(object.message, message.message = $util.newBuffer($util.base64.length(object.message)), 0);
                else if (object.message.length >= 0)
                    message.message = object.message;
            if (object.reason != null)
                message.reason = String(object.reason);
            if (object.reconnect != null)
                message.reconnect = Boolean(object.reconnect);
            if (object.stream_id != null)
                message.stream_id = String(object.stream_id);
            if (object.epoch != null)
                message.epoch = String(object.epoch);
            if (object.offset != null)
                if ($util.Long)
                    (message.offset = $util.Long.fromValue(object.offset)).unsigned = false;
                else if (typeof object.offset === "string")
                    message.offset = parseInt(object.offset, 10);
                else if (typeof object.offset === "number")
                    message.offset = object.offset;
                else if (typeof object.offset === "object")
                    message.offset = new $util.LongBits(object.offset.low >>> 0, object.offset.high >>> 0).toNumber();
            if (object.sid != null)
                message.sid = String(object.sid);
            if (object.restored != null)
                message.restored = Boolean(object.restored);
            if (object.restored_ids) {
                if (!Array.isArray(object.restored_ids))
                    throw TypeError(".action_cable.Reply.restored_ids: array expected");
                message.restored_ids = [];
                for (let i = 0; i < object.restored_ids.length; ++i)
                    message.restored_ids[i] = String(object.restored_ids[i]);
            }
            return message;
        };

        /**
         * Creates a plain object from a Reply message. Also converts values to other types if specified.
         * @function toObject
         * @memberof action_cable.Reply
         * @static
         * @param {action_cable.Reply} message Reply
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Reply.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.restored_ids = [];
            if (options.defaults) {
                object.type = options.enums === String ? "no_type" : 0;
                object.identifier = "";
                if (options.bytes === String)
                    object.message = "";
                else {
                    object.message = [];
                    if (options.bytes !== Array)
                        object.message = $util.newBuffer(object.message);
                }
                object.reason = "";
                object.reconnect = false;
                object.stream_id = "";
                object.epoch = "";
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.offset = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.offset = options.longs === String ? "0" : 0;
                object.sid = "";
                object.restored = false;
            }
            if (message.type != null && message.hasOwnProperty("type"))
                object.type = options.enums === String ? $root.action_cable.Type[message.type] === undefined ? message.type : $root.action_cable.Type[message.type] : message.type;
            if (message.identifier != null && message.hasOwnProperty("identifier"))
                object.identifier = message.identifier;
            if (message.message != null && message.hasOwnProperty("message"))
                object.message = options.bytes === String ? $util.base64.encode(message.message, 0, message.message.length) : options.bytes === Array ? Array.prototype.slice.call(message.message) : message.message;
            if (message.reason != null && message.hasOwnProperty("reason"))
                object.reason = message.reason;
            if (message.reconnect != null && message.hasOwnProperty("reconnect"))
                object.reconnect = message.reconnect;
            if (message.stream_id != null && message.hasOwnProperty("stream_id"))
                object.stream_id = message.stream_id;
            if (message.epoch != null && message.hasOwnProperty("epoch"))
                object.epoch = message.epoch;
            if (message.offset != null && message.hasOwnProperty("offset"))
                if (typeof message.offset === "number")
                    object.offset = options.longs === String ? String(message.offset) : message.offset;
                else
                    object.offset = options.longs === String ? $util.Long.prototype.toString.call(message.offset) : options.longs === Number ? new $util.LongBits(message.offset.low >>> 0, message.offset.high >>> 0).toNumber() : message.offset;
            if (message.sid != null && message.hasOwnProperty("sid"))
                object.sid = message.sid;
            if (message.restored != null && message.hasOwnProperty("restored"))
                object.restored = message.restored;
            if (message.restored_ids && message.restored_ids.length) {
                object.restored_ids = [];
                for (let j = 0; j < message.restored_ids.length; ++j)
                    object.restored_ids[j] = message.restored_ids[j];
            }
            return object;
        };

        /**
         * Converts this Reply to JSON.
         * @function toJSON
         * @memberof action_cable.Reply
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Reply.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Reply
         * @function getTypeUrl
         * @memberof action_cable.Reply
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Reply.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/action_cable.Reply";
        };

        return Reply;
    })();

    return action_cable;
})();

export { $root as default };
