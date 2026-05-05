/**
 * BitStream
 * 
 * Used in battles.
 * 
 * @param { Buffer } bytes Bytes
 */
class BitStream { // Still in beta.
    constructor(bytes = Buffer.alloc(0)) {
        if (Buffer.isBuffer(bytes)) {
            this.buffer = bytes;
        } else if (typeof bytes === 'number') {
            this.buffer = Buffer.allocUnsafe(Math.max(0, bytes));
        } else {
            this.buffer = Buffer.alloc(0);
        }
        this.offset = 0;
        this.bitOffset = 0;
    }

    reset(bytes) {
        if (Buffer.isBuffer(bytes)) {
            this.buffer = bytes;
        } else if (typeof bytes === 'number' && this.buffer.length < bytes) {
            this.buffer = Buffer.allocUnsafe(bytes);
        }

        this.offset = 0;
        this.bitOffset = 0;
        return this;
    }

    /**
     * Read bit from Bytes
     * @returns { Number } Bit
     */
    readBit() {
        if (this.offset > this.buffer.length) {
            return 0;
        }

        let value = ((this.buffer[this.offset] >> this.bitOffset) & 1);
        this.bitOffset++;
        if (this.bitOffset == 8) {
            this.bitOffset = 0;
            this.offset += 1;
        }

        return value;
    }

    /**
     * Read bytes from Bytes
     * @param { Number } length Amount of bytes to read
     * @returns { Buffer } Readed bytes
     */
    readBytes(length) {
        const data = [];
        let i = 0;

        while (i < length) {
            let value = 0;
            let p = 0;

            while (p < 8 && i < length) {
                value |= this.readBit() << p;
                i += 1;
                p += 1;
            }

            data.push(value);
        }

        return Buffer.from(data);
    }

    /**
     * Read positive int from Bytes
     * @param { Number } bitsCount Max amount of bits
     * @returns { Number } Readed int
     */
    readPositiveInt(bitsCount) {
        const data = this.readBytes(bitsCount);
        return data.readUIntLE(0, data.length);
    }

    readPositiveIntMax31() {
        const v2 = this.readPositiveInt(5);
        return this.readPositiveInt(v2);
    }

    readPositiveIntMax511() {
        const v2 = this.readPositiveInt(9);
        return this.readPositiveInt(v2);
    }

    /**
     * Read int from Bytes
     * @param { Number } bits Max amount of bits
     * @returns { Number } Readed int
     */
    readInt(bits) {
        const v2 = 2 * this.readPositiveInt(1) - 1;
        const res = v2 * this.readPositiveInt(bits);
        return res
    }

    readPositiveVIntMax255() {
        const v2 = this.readPositiveInt(3);
        return this.readPositiveInt(v2);
    }

    readPositiveVIntMax65535() {
        const v2 = this.readPositiveInt(4);
        return this.readPositiveInt(v2);
    }

    writeBit(data) {
        if (this.bitOffset == 0) {
            this.ensureCapacity(1);
            this.buffer[this.offset++] = 0x00;
        }

        const byteIndex = this.offset - 1;
        let value = this.buffer[byteIndex];
        value &= ~(1 << this.bitOffset);
        value |= ((data & 1) << this.bitOffset)
        this.buffer[byteIndex] = value;
        this.bitOffset = (this.bitOffset + 1) % 8;
    }

    writeBoolean(value) {
        this.writePositiveInt(value ? 1 : 0, 1);
    }

    writeBits(bits, count) {
        let i = 0;
        let position = 0;
        while (i < count) {
            let p = 0;
            while (p < 8 && i < count) {
                const value = ((bits[position] >> p) & 1);
                this.writeBit(value);
                i++;
                p++;
            }
            position++;
        }
    }

    writePositiveInt(value, bits) {
        let current = value >>> 0;
        for (let i = 0; i < bits; i++) {
            this.writeBit(current & 1);
            current >>>= 1;
        }
    }

    writePositiveIntMax31(value) {
        this.writePositiveInt(value, 5)
    }

    writePositiveIntMax511(value) {
        this.writePositiveInt(value, 9)
    }

    writeInt(value, bits) {
        this.writePositiveInt(value <= -1 ? 0 : 1, 1)
        value = Math.abs(value);

        this.writePositiveInt(value, bits);
    }

    writePositiveVInt(value, bits) {
        let v7 = value;
        let v3 = v7 !== 0 ? 0 : 1;

        if (v7 > 1) {
            let v8 = v7;
            while (v8 !== 0) {
                v3 += 1;
                v8 >>= 1;
            }
        }

        this.writePositiveInt(v3 - 1, bits);
        this.writePositiveInt(v7, v3);
    }

    writeByte(value) {
        this.ensureCapacity(1);
        this.buffer[this.offset - 1] = value;
    }

    writePositiveVIntMax255OftenZero(a1) {
        this.writePositiveInt(a1 == 0 ? 1 : 0, 1)

        if (a1 > 0) {
            this.writePositiveVIntMax255(a1)
        }
    }

    writePositiveVIntMax65535OftenZero(a1) {
        this.writePositiveInt(a1 == 0 ? 1 : 0, 1)

        if (a1 > 0) {
            this.writePositiveVIntMax65535(a1)
        }
    }

    writePositiveVIntMax255(a1) {
        this.writePositiveVInt(a1, 3)
    }

    writePositiveVIntMax65535(a1) {
        this.writePositiveVInt(a1, 4)
    }

    ensureCapacity(capacity) {
        const bufferLength = this.buffer.length;

        if (this.offset + capacity > bufferLength) {
            const nextLength = Math.max(bufferLength * 2, this.offset + capacity, 64);
            const nextBuffer = Buffer.allocUnsafe(nextLength);
            if (this.offset > 0) {
                this.buffer.copy(nextBuffer, 0, 0, this.offset);
            }
            this.buffer = nextBuffer;
        }
    }
}

module.exports = BitStream;
