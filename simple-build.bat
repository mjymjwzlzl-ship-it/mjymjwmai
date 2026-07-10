@echo off
echo Building APK with WebView navigation fixes...
echo.

cd /d D:\ARATA\arata-mobile\android

REM Set environment variables (try both Java paths)
if exist "C:\Program Files\Java\jdk-17" (
    set "JAVA_HOME=C:\Program Files\Java\jdk-17"
) else (
    set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.8.9-hotspot"
)
set "ANDROID_HOME=C:\Users\user\AppData\Local\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\build-tools\34.0.0;%PATH%"

echo JAVA_HOME=%JAVA_HOME%
echo ANDROID_HOME=%ANDROID_HOME%
echo.

echo Running Gradle build...
call gradlew.bat assembleRelease

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Build successful! Copying APK...
    if exist app\build\outputs\apk\release\app-release.apk (
        copy /Y app\build\outputs\apk\release\app-release.apk D:\ARATA\public\downloads\arata-webtoon-1.0.2.apk
        echo.
        echo ==============================================
        echo APK READY: Navigation issue fixed!
        echo Download from: https://arata.co.kr/downloads/arata-webtoon-1.0.2.apk
        echo ==============================================
    ) else (
        echo APK file not found!
    )
) else (
    echo Build failed!
)

echo.
pause