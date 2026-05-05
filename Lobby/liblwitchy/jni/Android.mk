LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)

LOCAL_MODULE    := liblwitchy
LOCAL_SRC_FILES := src/liblwitchy.cpp \

LOCAL_C_INCLUDES := $(LOCAL_PATH)/src 
LOCAL_CFLAGS := -s -O3 -fdata-sections -ffunction-sections -fvisibility-inlines-hidden -Wl,--gc-sections -DkNO_KEYSTONE
#LOCAL_CFLAGS += -mllvm -fla -mllvm -split -mllvm -split_num=3 -mllvm -bcf -mllvm -bcf_loop=3 -mllvm -sub -mllvm -sub_loop=3
LOCAL_LDLIBS := -llog -landroid



include $(BUILD_SHARED_LIBRARY)