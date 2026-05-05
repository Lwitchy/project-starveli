const { DateTime } = require('luxon');

class Helpers {
    static calculateUntilWeekend() {
        const now = DateTime.local();
        let nextSaturday;

        if (now.weekday < 6) {
            const daysUntilSaturday = 6 - now.weekday;
            nextSaturday = now.plus({ days: daysUntilSaturday }).set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
        } else if (now.weekday === 6) {
            nextSaturday = now.plus({ days: 7 }).set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
        } else {
            nextSaturday = now.plus({ days: 6 }).set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
        }

        return nextSaturday.toFormat("yyyy/MM/dd HH:mm:ss");
    }

    static tiersToByte(input) {
        let kademeler;

        if (Array.isArray(input)) {
            kademeler = input;
        } else if (typeof input === 'string') {
            kademeler = input.trim().split(/\s+/);
        } else {
            return [0, 0, 0, 0];
        }

        const data = [0, 0, 0, 0];

        kademeler.forEach(kademe => {
            const k = parseInt(kademe);
            if (!isNaN(k)) {
                const bitIndex = k + 2; 
                const dataIndex = Math.floor(bitIndex / 32);
                if (dataIndex < data.length) {
                    const mask = 1 << (bitIndex % 32);
                    data[dataIndex] |= mask;
                }
            }
        });

        return data;
    }

    static byteToTiers(data) {
        if (!Array.isArray(data)) return [];
        let kademeler = [];
        
        for (let dataIndex = 0; dataIndex < data.length; dataIndex++) {
            let value = data[dataIndex] >>> 0; // Convert to unsigned 32-bit
            for (let bit = 0; bit < 32; bit++) {
                let bitIndex = (dataIndex * 32) + bit;
                if ((value & (1 << bit)) !== 0) {
                    let tier = bitIndex - 2;
                    if (tier >= 0) {
                        kademeler.push(tier);
                    }
                }
            }
        }
        return kademeler;
    }

    static calculateUntilMonday() {
        const now = DateTime.local();
        let nextMonday;

        if (now.weekday < 1) {
            nextMonday = now.set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
        } else if (now.weekday === 1) {
            nextMonday = now.plus({ days: 7 }).set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
        } else {
            const daysUntilMonday = 8 - now.weekday;
            nextMonday = now.plus({ days: daysUntilMonday }).set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
        }

        return nextMonday.toFormat("yyyy/MM/dd HH:mm:ss");
    }

    static isWeekend() {
        const now = DateTime.local();
        return now.weekday === 6 || now.weekday === 7;
    }

    static calculateHowMuchAgo(date) {
        const now = DateTime.local();
        const start = DateTime.fromFormat(date, 'yyyy/MM/dd HH:mm:ss');
        const end = now;
        const totalSeconds = end.diff(start, ['seconds']).seconds;
        return Math.floor(totalSeconds);
    }

    static getAfterXhours(x) {
        const now = DateTime.local();
        const time = now.plus({ hours: x });
        return time.toFormat("yyyy/MM/dd HH:mm:ss");
    }

    static getAfterXminutes(x) {
        const now = DateTime.local();
        const time = now.plus({ minutes: x });
        return time.toFormat("yyyy/MM/dd HH:mm:ss");
    }

    static getAfterXseconds(x) {
        const now = DateTime.local();
        const time = now.plus({ seconds: x });
        return time.toFormat("yyyy/MM/dd HH:mm:ss");
    }

    static calculateTime(date) {
        const now = DateTime.local();
        const start = now;
        const end = DateTime.fromFormat(date, 'yyyy/MM/dd HH:mm:ss');
        const totalSeconds = end.diff(start, ['seconds']).seconds;
        return Math.floor(totalSeconds);
    }

    static getTime() {
        const now = DateTime.local();
        return now.toFormat("yyyy/MM/dd HH:mm:ss");
    }
}
module.exports = Helpers;
