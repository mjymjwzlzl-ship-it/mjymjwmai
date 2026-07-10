@echo off
echo =====================================
echo ARATA APK v1.0.3 빌드 시작
echo =====================================
echo.

cd /d D:\ARATA\arata-mobile\android

set JAVA_HOME=C:\Program Files\Java\jdk-17
set PATH=%JAVA_HOME%\bin;%PATH%

echo [1/2] Release APK 빌드 중...
echo 이 작업은 몇 분 걸릴 수 있습니다...
echo.

call gradlew.bat assembleRelease

if exist app\build\outputs\apk\release\app-release.apk (
    echo.
    echo [2/2] APK를 다운로드 폴더로 복사 중...
    copy /Y app\build\outputs\apk\release\app-release.apk D:\ARATA\public\downloads\arata-v1.0.3.apk
    echo.
    echo =====================================
    echo 빌드 성공!
    echo APK 위치: D:\ARATA\public\downloads\arata-v1.0.3.apk
    echo =====================================
) else (
    echo.
    echo =====================================
    echo 빌드 실패!
    echo =====================================
)

cd /d D:\ARATA
pause