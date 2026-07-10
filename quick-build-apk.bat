@echo off
echo Building APK with navigation fixes...

:: Java 경로 설정
set JAVA_HOME=C:\Program Files\Java\jdk-17
set PATH=%JAVA_HOME%\bin;%PATH%

:: 프로젝트 디렉토리로 이동
cd /d D:\ARATA\arata-mobile\android

:: 빌드 실행
echo Starting Gradle build...
call gradlew assembleRelease

:: 빌드 성공 확인
if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo Build completed successfully!

:: APK 파일 복사
echo Copying APK to public directory...
powershell -Command "Copy-Item 'D:\ARATA\arata-mobile\android\app\build\outputs\apk\release\app-release.apk' -Destination 'D:\ARATA\public\downloads\arata-webtoon-1.0.0.apk' -Force"

echo APK copied to: D:\ARATA\public\downloads\arata-webtoon-1.0.0.apk
echo.
echo 웹툰 네비게이션 문제가 수정된 새 APK가 준비되었습니다!
echo 웹사이트에서 다운로드하여 설치해주세요.
pause