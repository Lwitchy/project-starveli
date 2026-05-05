#pragma once

template <unsigned int N>
struct MetaString {
    char key;
    char buffer[N];

    constexpr MetaString(const char* str, char k) : key(k), buffer{0} {
        for (unsigned int i = 0; i < N; ++i) {
            buffer[i] = str[i] ^ key;
        }
    }

    __attribute__((noinline)) const char* decrypt(char* decryptedBuffer) const {
        for (unsigned int i = 0; i < N; ++i) {
            volatile char c = buffer[i];
            volatile char k = key;
            decryptedBuffer[i] = c ^ k;
        }
        return decryptedBuffer;
    }
};

#define OBFUSCATE(str) \
    ([]() -> const char* { \
        constexpr MetaString<sizeof(str)> meta(str, (__LINE__ % 254) + 1); \
        static thread_local char decrypted[sizeof(str)]; \
        return meta.decrypt(decrypted); \
    }())
