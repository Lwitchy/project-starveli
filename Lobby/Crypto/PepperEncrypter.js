const Nacl = require("./Nacl"),
    Nonce = require("./Nonce"),
    {
        randomBytes
    } = require("crypto");



class PepperEncrypter {
    constructor () {
        this.client_secret_key = new Uint8Array(Buffer.from("3ECD938D8ABFA79AED892C1263D10ED08DC94F1A7ECEE4FF508EBF2361726265", "hex"));
        this.client_public_key = new Uint8Array(32);
        Nacl.lowlevel.crypto_scalarmult_base(this.client_public_key, this.client_secret_key);
        this.server_public_key = new Uint8Array(Buffer.from("0C60170E51746626A27683BF1619467A3C8BBCF9785C4899358EF71A3384CD74", "hex"));
        this.client_nonce = new Nonce();
    }

    decrypt (type, bytes) {
        if (type == 10100) {
            return bytes;
        } else if (type == 10101) {
            bytes = bytes.slice(32);
            this.key = Nacl.box.before(this.server_public_key, this.client_secret_key);
            const nonce = new Nonce({
                Keys: [
                    this.client_public_key,
                    this.server_public_key
                ]
            });

            const decrypted = Nacl.box.open.after(bytes, nonce.bytes(), this.key);
            const session_token = decrypted.slice(0, 24);
            for (let i = 0; i < 24; i++) {
                if (session_token[i] != this.session_token[i]) throw new Error("Invalid session token!");
            }
            this.client_nonce = new Nonce({
                nonce: decrypted.slice(24, 48)
            });
            return decrypted.slice(48);
        } else {
            this.client_nonce.increment();
            return Nacl.box.open.after(bytes, this.client_nonce.bytes(), this.key);
        }
    }

    test(){
        console.log("TEST CRYPTO")
    }

    encrypt (type, bytes) {

        if (type == 20100) {
            this.session_token = bytes.slice(4, 28);
            return bytes;
        } else if ([20104, 20103].includes(type) && this.session_token != undefined) {
            let nonce = new Nonce({
                nonce: this.client_nonce.bytes(),
                Keys: [
                    this.client_public_key,
                    this.server_public_key
                ]
            });
            this.server_nonce = new Nonce();
            const key = new Uint8Array(randomBytes(32));
            const buffer = new Uint8Array(56 + bytes.length);
            buffer.set(this.server_nonce.bytes());
            buffer.set(key, 24);
            buffer.set(bytes, 56);
            let encrypted = Nacl.box.after(buffer, nonce.bytes(), this.key);
            this.key = key;
            return encrypted;
        } else {
            this.server_nonce.increment();
            return Nacl.box.after(bytes, this.server_nonce.bytes(), this.key);
        }
    }
}

module.exports = PepperEncrypter