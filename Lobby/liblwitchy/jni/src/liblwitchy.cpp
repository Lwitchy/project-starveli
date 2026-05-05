#include <jni.h>
#include <android/log.h>
#include <pthread.h>
#include <unistd.h>
#include <iostream>
#include <string>
#include <ctime>
#include <sys/socket.h>
#include <arpa/inet.h>
#include "obfuscate.h"
#include <android/asset_manager.h>      
#include <android/asset_manager_jni.h>  
#include <vector>

JavaVM* cached_vm = nullptr;
static char hash_result_buffer[41]; 

void* __attribute__((noinline)) getJNIContext(JNIEnv* env) {
    jclass activityThreadCls = env->FindClass(OBFUSCATE("android/app/ActivityThread"));
    if (!activityThreadCls) {
        if (env->ExceptionCheck()) env->ExceptionClear();
        return nullptr;
    }
    jmethodID currentActivityThread = env->GetStaticMethodID(activityThreadCls,
        OBFUSCATE("currentActivityThread"),
        OBFUSCATE("()Landroid/app/ActivityThread;"));
    if (!currentActivityThread) {
        if (env->ExceptionCheck()) env->ExceptionClear();
        return nullptr;
    }
    jobject activityThreadObj =
        env->CallStaticObjectMethod(activityThreadCls, currentActivityThread);

    if (!activityThreadObj) {
        if (env->ExceptionCheck()) env->ExceptionClear();
        return nullptr;
    }

    jmethodID getApplication =
        env->GetMethodID(activityThreadCls, OBFUSCATE("getApplication"), OBFUSCATE("()Landroid/app/Application;"));
    if (!getApplication) {
        if (env->ExceptionCheck()) env->ExceptionClear();
        return nullptr;
    }
    jobject context = env->CallObjectMethod(activityThreadObj, getApplication);
    if (env->ExceptionCheck()) env->ExceptionClear();
    return context;
}

jobject __attribute__((noinline)) Toast(JNIEnv* env, jobject thiz, const std::string& text, int length) {
    if (!thiz) return nullptr;
    jstring jstr = env->NewStringUTF(text.c_str());
    jclass toast = env->FindClass(OBFUSCATE("android/widget/Toast"));
    if (!toast) {
        if (env->ExceptionCheck()) env->ExceptionClear();
        return nullptr;
    }
    jmethodID methodMakeText = env->GetStaticMethodID(toast, OBFUSCATE("makeText"), OBFUSCATE("(Landroid/content/Context;Ljava/lang/CharSequence;I)Landroid/widget/Toast;"));
    if (!methodMakeText) {
        if (env->ExceptionCheck()) env->ExceptionClear();
        return nullptr;
    }
    jobject toastobj = env->CallStaticObjectMethod(toast, methodMakeText, thiz, jstr, length);
    if (!toastobj) {
        if (env->ExceptionCheck()) env->ExceptionClear();
        return nullptr;
    }
    jmethodID methodShow = env->GetMethodID(toast, OBFUSCATE("show"), OBFUSCATE("()V"));
    if (!methodShow) {
        if (env->ExceptionCheck()) env->ExceptionClear();
        return nullptr;
    }
    env->CallVoidMethod(toastobj, methodShow);
    if (env->ExceptionCheck()) env->ExceptionClear();
    return toastobj;
}

extern "C" __attribute__((visibility("default"))) void doHandshake(int fd) {
    uint32_t seed = std::time(nullptr) / 10;
    
    uint32_t proof = (seed ^ 0x53544152) + 0x1337;
    
    uint8_t packet[11];
    packet[0] = 0x61; packet[1] = 0xA8; // ID: 25000
    packet[2] = 0x00; packet[3] = 0x00; packet[4] = 0x04; // Length: 4
    packet[5] = 0x00; packet[6] = 0x00; // Version: 0
    packet[7] = (proof >> 24) & 0xFF;   // Payload: uint32 BE
    packet[8] = (proof >> 16) & 0xFF;
    packet[9] = (proof >> 8) & 0xFF;
    packet[10] = proof & 0xFF;
    
    send(fd, packet, 11, 0);
}

extern "C" __attribute__((visibility("default"))) void nativeInit(int unused) {
}

class SHA1 {
public:
    SHA1() { reset(); }
    void update(const uint8_t* data, size_t length) {
        for (size_t i = 0; i < length; ++i) {
            block[blockIndex++] = data[i];
            if (blockIndex == 64) {
                processBlock();
                blockIndex = 0;
                messageLength += 64;
            }
        }
    }
    void finalize(uint8_t hash[20]) {
        messageLength += blockIndex;
        uint64_t msgLenBits = messageLength * 8;
        block[blockIndex++] = 0x80;
        if (blockIndex > 56) {
            while (blockIndex < 64) block[blockIndex++] = 0;
            processBlock();
            blockIndex = 0;
        }
        while (blockIndex < 56) block[blockIndex++] = 0;
        for (int i = 7; i >= 0; --i) block[blockIndex++] = (uint8_t)((msgLenBits >> (i * 8)) & 0xFF);
        processBlock();
        for (int i = 0; i < 5; ++i) {
            hash[i * 4 + 0] = (uint8_t)((h[i] >> 24) & 0xFF);
            hash[i * 4 + 1] = (uint8_t)((h[i] >> 16) & 0xFF);
            hash[i * 4 + 2] = (uint8_t)((h[i] >> 8) & 0xFF);
            hash[i * 4 + 3] = (uint8_t)(h[i] & 0xFF);
        }
    }
private:
    uint32_t h[5];
    uint8_t block[64];
    size_t blockIndex;
    uint64_t messageLength;
    uint32_t rotl(uint32_t v, int c) { return (v << c) | (v >> (32 - c)); }
    void reset() {
        h[0] = 0x67452301; h[1] = 0xEFCDAB89; h[2] = 0x98BADCFE;
        h[3] = 0x10325476; h[4] = 0xC3D2E1F0;
        blockIndex = 0; messageLength = 0;
    }
    void processBlock() {
        uint32_t w[80];
        for (int i = 0; i < 16; ++i)
            w[i] = (block[i * 4 + 0] << 24) | (block[i * 4 + 1] << 16) | (block[i * 4 + 2] << 8) | block[i * 4 + 3];
        for (int i = 16; i < 80; ++i)
            w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
        uint32_t a = h[0], b = h[1], c = h[2], d = h[3], e = h[4];
        for (int i = 0; i < 80; ++i) {
            uint32_t f, k;
            if (i < 20)      { f = (b & c) | ((~b) & d); k = 0x5A827999; }
            else if (i < 40) { f = b ^ c ^ d;            k = 0x6ED9EBA1; }
            else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC; }
            else             { f = b ^ c ^ d;            k = 0xCA62C1D6; }
            uint32_t temp = rotl(a, 5) + f + e + k + w[i];
            e = d; d = c; c = rotl(b, 30); b = a; a = temp;
        }
        h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e;
    }
};

extern "C" __attribute__((visibility("default"))) const char* getAssetHashPure(const char* fileName) {
    if (!cached_vm) return "VM_ERR";

    JNIEnv* env = nullptr;
    bool needsDetach = false;
    
    jint envStat = cached_vm->GetEnv((void**)&env, JNI_VERSION_1_6);
    if (envStat == JNI_EDETACHED) {
#if defined(__cplusplus)
        if (cached_vm->AttachCurrentThread(&env, nullptr) != JNI_OK) {
            return "ATTACH_ERR";
        }
#else
        if ((*cached_vm)->AttachCurrentThread(cached_vm, &env, nullptr) != JNI_OK) {
            return "ATTACH_ERR";
        }
#endif
        needsDetach = true;
    } else if (envStat != JNI_OK) {
        return "ENV_ERR";
    }

    struct Detacher {
        JavaVM* vm;
        bool active;
        Detacher(JavaVM* v, bool a) : vm(v), active(a) {}
        ~Detacher() { if (active) vm->DetachCurrentThread(); }
    } detacher(cached_vm, needsDetach);

    jobject context = (jobject)getJNIContext(env);
    if (!context) return "CONTEXT_ERR";

    jclass contextClass = env->GetObjectClass(context);
    jmethodID getAssetsMethod = env->GetMethodID(contextClass, OBFUSCATE("getAssets"), OBFUSCATE("()Landroid/content/res/AssetManager;"));
    jobject assetManagerObj = env->CallObjectMethod(context, getAssetsMethod);

    AAssetManager* mgr = AAssetManager_fromJava(env, assetManagerObj);
    if (!mgr) {
        env->DeleteLocalRef(assetManagerObj);
        env->DeleteLocalRef(contextClass);
        return "MGR_ERR";
    }

    std::string fullPath = OBFUSCATE("csv_logic/") + std::string(fileName);
    AAsset* asset = AAssetManager_open(mgr, fullPath.c_str(), AASSET_MODE_BUFFER);
    
    if (!asset) {
        env->DeleteLocalRef(assetManagerObj);
        env->DeleteLocalRef(contextClass);
        return "NOT_FOUND";
    }

    size_t length = AAsset_getLength(asset);
    std::vector<uint8_t> buffer(length);
    AAsset_read(asset, buffer.data(), length);
    AAsset_close(asset);

    SHA1 sha1;
    sha1.update(buffer.data(), length);
    uint8_t hash[20];
    sha1.finalize(hash);
    
    for (int i = 0; i < 20; ++i) {
        sprintf(&hash_result_buffer[i * 2], "%02x", hash[i]);
    }
    
    env->DeleteLocalRef(assetManagerObj);
    env->DeleteLocalRef(contextClass);

    return hash_result_buffer;
}

extern "C" JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void* reserved) {
    cached_vm = vm; 
    
    JNIEnv* env;
    if (vm->GetEnv((void**)&env, JNI_VERSION_1_6) != JNI_OK) return -1;
    
    const char* hashStr = getAssetHashPure("milestones.csv");
    __android_log_print(ANDROID_LOG_DEBUG, "HAI WE GOT MILESTONES HASH", "Milestones Hash: %s", hashStr);
    
    jobject context = (jobject)getJNIContext(env);
    if (context) {
        Toast(env, context, OBFUSCATE("hello, hai, hi"), 1);
    }    
    
    return JNI_VERSION_1_6;
}
