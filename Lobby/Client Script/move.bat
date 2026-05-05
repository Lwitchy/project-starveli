
@echo off

:update

adb push .\v29258.js "/data/local/tmp/"
set /p input="Do you wanna try again? (y/n): "
if /i "%input%" EQU "y" goto :update
if /i "%input%" EQU "n" exit