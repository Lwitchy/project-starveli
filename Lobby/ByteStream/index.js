const ByteArray = require('./ByteArray')
/**
  * ByteStream
  * 
  * For clear communication between client and server.
  * 
  */
class ByteStream {
    constructor(data) {
        // eslint-disable-next-line new-cap
        this.buffer = data != null ? data : Buffer.alloc(0)
        this.length = 0
        this.offset = 0
        this.bitOffset = 0
    }

    /**
     *  Reading Int from Bytes
     * @returns { Number } Int
     */
    readInt() {
        this.bitOffset = 0
        return (this.buffer[this.offset++] << 24 |
            (this.buffer[this.offset++] << 16 |
                (this.buffer[this.offset++] << 8 |
                    this.buffer[this.offset++])))
    }

    skip(len) {
        this.bitOffset += len
    }

    /**
     *  Reading Short from Bytes (`commonly isn't used.`)
     * @returns { Number } Short
     */
    readShort() {
        this.bitOffset = 0
        return (this.buffer[this.offset++] << 8 |
            this.buffer[this.offset++])
    }

    /**
     * Writing value to Bytes as Short (c`ommonly isn't used`)
     * @param {Number} value Your value to write.
     */
    writeShort(value) {
        this.bitOffset = 0
        this.ensureCapacity(2)
        this.buffer[this.offset++] = (value >> 8)
        this.buffer[this.offset++] = (value)
    }


    /**
     * Writing value to Bytes as Int
     * @param {Number} value Your value to write.
     */
    writeInt(value) {
        this.bitOffset = 0
        this.ensureCapacity(4)
        this.buffer[this.offset++] = (value >> 24)
        this.buffer[this.offset++] = (value >> 16)
        this.buffer[this.offset++] = (value >> 8)
        this.buffer[this.offset++] = (value)
    }

    /**
     * Get Bytes in String
     * @returns { String } Bytes in String form (`AA-BB-CC`)
     */
    getHex() {
        return ByteArray.bytesToHex(this.buffer)
    }

    /**
     *  Reading String from Bytes
     * @returns { String } String
     */
    readString() {
        const length = this.readInt(); // Read the length of the string
        if (length <= 0 || this.offset + length > this.buffer.length) {
            return "";
        }
        const stringBytes = this.buffer.slice(this.offset, this.offset + length);
        this.offset += length; // Move the offset forward
        try {
            const decodedString = Buffer.from(stringBytes).toString('utf8');
            return decodedString;
        } catch (err) {
            return "";
        }
    }


    /**
     * Reading VarInt from Bytes
     * @returns { Number } VarInt
     */
    readVInt() {
        this.bitOffset = 0
        let value = 0
        let byte = this.buffer[this.offset++]

        if ((byte & 0x40) !== 0) {
            // Negative number
            value |= byte & 0x3F

            if ((byte & 0x80) !== 0) {
                value |= ((byte = this.buffer[this.offset++]) & 0x7F) << 6

                if ((byte & 0x80) !== 0) {
                    value |= ((byte = this.buffer[this.offset++]) & 0x7F) << 13

                    if ((byte & 0x80) !== 0) {
                        value |= ((byte = this.buffer[this.offset++]) & 0x7F) << 20

                        if ((byte & 0x80) !== 0) {
                            value |= ((byte = this.buffer[this.offset++]) & 0x7F) << 27
                            return value | 0x80000000
                        }

                        return value | 0xF8000000
                    }

                    return value | 0xFFF00000
                }

                return value | 0xFFFFE000
            }

            return value | 0xFFFFFFC0
        }

        value |= byte & 0x3F

        if ((byte & 0x80) !== 0) {
            value |= ((byte = this.buffer[this.offset++]) & 0x7F) << 6

            if ((byte & 0x80) !== 0) {
                value |= ((byte = this.buffer[this.offset++]) & 0x7F) << 13

                if ((byte & 0x80) !== 0) {
                    value |= ((byte = this.buffer[this.offset++]) & 0x7F) << 20

                    if ((byte & 0x80) !== 0) {
                        value |= ((byte = this.buffer[this.offset++]) & 0x7F) << 27
                    }
                }
            }
        }

        return value
    }


    /**
     * Reading 2 VarInts from Bytes
     * @returns { Array<Number> } Commonly CSVID and ReferenceID
     */
    readDataReference() {
        const a1 = this.readVInt()
        return [a1, a1 == 0 ? 0 : this.readVInt()]
    }

    /**
     * Writing values to Bytes as VarInts
     * If value1 is 0, then 2nd value doesn't used
     * 
     * @param {Number} value1 Your value to write. Commonly it's a CSVID
     * @param {Number} value2 Your value to write. Commonly it's a ReferenceID
     */
    writeDataReference(value1, value2) {
        if (value1 < 1) {
            this.writeVInt(0)
        } else {
            this.writeVInt(value1)
            this.writeVInt(value2)
        }
    }

    /**
     * Writing value to Bytes as VarInt
     * @param {Number} value Your value to write.
     */
    writeVInt(value) {
        this.bitOffset = 0
        let temp = (value >> 25) & 0x40

        let flipped = value ^ (value >> 31)

        temp |= value & 0x3F

        value >>= 6
        flipped >>= 6

        if (flipped === 0) {
            this.writeByte(temp)
            return 0
        }

        this.writeByte(temp | 0x80)

        flipped >>= 7
        let r = 0

        if (flipped) { r = 0x80 }

        this.writeByte((value & 0x7F) | r)

        value >>= 7

        while (flipped !== 0) {
            flipped >>= 7
            r = 0
            if (flipped) { r = 0x80 }
            this.writeByte((value & 0x7F) | r)
            value >>= 7
        }
    }

    /**
     * Writing value to Bytes as Boolean
     * @param {Boolean} value Your value to write.
     */
    writeBoolean(value) {
        if (this.bitOffset === 0) {
            this.ensureCapacity(1)
            this.buffer[this.offset++] = 0
        }

        if (value) { this.buffer[this.offset - 1] |= (1 << this.bitOffset) }

        this.bitOffset = (this.bitOffset + 1) & 7
    }

    /**
     * Reading Boolean from Bytes
     * @returns { Boolean } Boolean (`true|false`)
     */
    readBoolean() {
        if (this.bitOffset === 0) {
            this.offset++;
        }
        const value = (this.buffer[this.offset - 1] & (1 << this.bitOffset)) !== 0;
        this.bitOffset = (this.bitOffset + 1) & 7;
        return value;
    }

    /**
     * Writing value to Bytes as String
     * @param {String} value Your value to write.
     */
    writeString(value) {
        if (value == null || value === undefined) {
            this.writeInt(-1)
            return
        }

        // Safety cast to string to prevent Node Buffer utf8Write crash
        const strValue = String(value);

        if (strValue.length > 90000) {
            this.writeInt(-1)
            return
        }

        const buf = Buffer.from(strValue, 'utf8')
        this.writeInt(buf.length)
        this.buffer = Buffer.concat([this.buffer, buf])
        this.offset += buf.length
    }

    /**
     * Writing value to Bytes as String (`You can just use writeString()`)
     * @param {String} value Your value to write.
     */
    writeStringReference = this.writeString

    /**
     * Writing value to Bytes as LongLong (`commonly isn't used`)
     * @param {Number} value Your value to write.
     */
    writeLongLong(value) {
        this.writeInt(value >> 32)
        this.writeInt(value)
    }

    /**
     * Writing values to Bytes as VarInts
     * 
     * @param {Number} value1 Your value to write.
     * @param {Number} value2 Your value to write.
     */
    writeLogicLong(value1, value2) {
        this.writeVInt(value1)
        this.writeVInt(value2)
    }

    /**
     * Reading 2 VarInts from Bytes
     * @returns { Array<Number> } LogicLong VarInts
     */
    readLogicLong() {
        return [this.readVInt(), this.readVInt()]
    }

    /**
     * Writing values to Bytes as Ints
     * 
     * @param {Number} value1 Your value to write.
     * @param {Number} value2 Your value to write.
     */
    writeLong(value1, value2) {
        this.writeInt(value1)
        this.writeInt(value2)
    }

    /**
     * Reading 2 Ints from Bytes
     * @returns { Array<Number> } Long Ints
     */
    readLong() {
        return [this.readInt(), this.readInt()]
    }

    /**
     * Writing value to Bytes as Byte
     * @param {Number} value Your value to write.
     */
    writeByte(value) {
        this.bitOffset = 0
        this.ensureCapacity(1)
        this.buffer[this.offset++] = value
    }

    /**
     * Reading Byte from Bytes
     * @returns { Number } Byte
     */
    readByte() {
        this.bitOffset = 0
        return this.buffer[this.offset++]
    }

    /**
     * Writing value to Bytes as ByteArray
     * @param {Buffer} buffer Your buffer to write.
     */
    writeBytes(buffer) {
        const length = buffer.length

        if (buffer != null) {
            this.writeInt(length)
            this.buffer = Buffer.concat([this.buffer, buffer])
            this.offset += length
            return
        }

        this.writeInt(-1)
    }

    /**
     * Adding more space to Buffer
     * @param {Number} capacity Amount of new space
     */
    ensureCapacity(capacity) {
        const bufferLength = this.buffer.length

        if (this.offset + capacity > bufferLength) {
            // eslint-disable-next-line new-cap
            const tmpBuffer = new Buffer.alloc(capacity)
            this.buffer = Buffer.concat([this.buffer, tmpBuffer])
        }
    }

    /**
     * Send a packet to the server.
     */

    writeHeader(id, length, version) {
        const header = Buffer.alloc(7)

        header.writeUInt16BE(id, 0)
        header.writeUIntBE(length, 2, 3)
        header.writeUInt16BE(version, 5)

        return header
    }

    send() {
        if (this.id < 20000) return;

        this.encode();
        let encryptedbuffer = this.client.crypto.encrypt(this.id, this.buffer)

        const header = this.writeHeader(this.id, encryptedbuffer.length, this.version)
    
        this.client.write(Buffer.concat([header, encryptedbuffer]));

        this.client.log(`Packet ${this.id} (${this.constructor.name}) was sent.`);
    }

}

module.exports = ByteStream
