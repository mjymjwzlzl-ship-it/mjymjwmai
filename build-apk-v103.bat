@echo off
echo ====================================
echo ARATA APK 빌드 시작 (v1.0.3)
echo ====================================
echo.

cd /d D:\ARATA\arata-mobile

echo [1/3] 환경 변수 설정...
set JAVA_HOME=C:\Program Files\Java\jdk-17
set ANDROID_HOME=C:\Users\user\AppData\Local\Android\Sdk
set PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools;%PATH%

echo [2/3] Android 디렉토리로 이동...
cd android

echo [3/3] Release APK 빌드 중...
call gradlew assembleRelease

echo.
if exist app\build\outputs\apk\release\app-release.apk (
    echo ✅ APK 빌드 성공!
    echo.
    echo APK 위치: 
    echo D:\ARATA\arata-mobile\android\app\build\outputs\apk\release\app-release.apk
    echo.
    
    REM public/downloads 폴더로 복사
    echo APK를 다운로드 폴더로 복사 중...
    copy /Y app\build\outputs\apk\release\app-release.apk ..\..\public\downloads\arata-v1.0.3.apk
    
    echo.
    echo ✅ APK가 다음 위치에 복사되었습니다:
    echo D:\ARATA\public\downloads\arata-v1.0.3.apk
) else (
    echo ❌ APK 빌드 실패!
    echo 빌드 로그를 확인하세요.
)

echo.
pause