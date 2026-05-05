const PiranhaMessage = require('../../PiranhaMessage');


class ClientInputMessage extends PiranhaMessage {
    constructor(bytes) {
        super(bytes);
        this.id = 10555;
        this.inputs = [];
    }

    decode() {
        const BitStream = require('../../../ByteStream/BitStream');
        const bitBuffer = this.buffer.slice(this.offset);
        const bit = new BitStream(bitBuffer);

        bit.readPositiveInt(14);
        bit.readPositiveInt(10);
        bit.readPositiveInt(13);
        bit.readPositiveInt(10);
        bit.readPositiveInt(10);

        const count = bit.readPositiveInt(5);
        for (let i = 0; i < count; i++) {
            const index = bit.readPositiveInt(15);
            const type = bit.readPositiveInt(4);
            const x = bit.readInt(15);
            const y = bit.readInt(15);

            // ReadBoolean helper
            const autoAim = bit.readPositiveInt(1) === 1;

            let pinId = 0;
            if (type === 9) {
                pinId = bit.readPositiveInt(3);
            }

            if (autoAim) {
                const dude = bit.readPositiveInt(1) === 1;
                if (dude) bit.readPositiveInt(14);
            }

            this.inputs.push({
                index: index,
                type: type,
                x: x,
                y: y,
                pinId: pinId,
                autoAim: autoAim
            });
        }
    }
}

module.exports = ClientInputMessage;
