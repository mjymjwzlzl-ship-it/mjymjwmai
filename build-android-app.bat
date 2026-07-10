@echo off
echo ========================================
echo ARATA 웹툰 Android APK 빌드
echo ========================================
echo.

REM Java 경로 설정
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.8.9-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%

REM Java 설치 확인
where java >nul 2>&1
if %errorlevel% neq 0 (
    echo [오류] Java를 찾을 수 없습니다.
    echo.
    echo JAVA_HOME: %JAVA_HOME%
    echo PATH를 확인하세요.
    pause
    exit /b 1
)

echo [1/4] Java 확인 완료
"%JAVA_HOME%\bin\java" -version
echo.

REM arata-mobile 디렉토리로 이동
cd /d D:\ARATA\arata-mobile

echo [2/4] Android 프로젝트 준비...
if not exist "android" (
    echo Android 프로젝트 생성중...
    call npx expo prebuild --platform android --clean
)

echo.
echo [3/4] APK 빌드 시작...
echo 이 작업은 5-10분 정도 소요됩니다.
cd android

REM Gradle 빌드 실행
call gradlew.bat assembleRelease

if %errorlevel% neq 0 (
    echo.
    echo [오류] 빌드 실패!
    echo Android SDK가 설치되어 있는지 확인하세요.
    pause
    exit /b 1
)

echo.
echo [4/4] APK 복사중...

REM APK 파일 복사
set SOURCE=app\build\outputs\apk\release\app-release.apk
set DEST=..\..\public\downloads\arata-webtoon-1.0.0.apk

if exist "%SOURCE%" (
    copy /Y "%SOURCE%" "%DEST%"
    echo.
    echo ========================================
    echo 빌드 성공!
    echo APK 위치: public\downloads\arata-webtoon-1.0.0.apk
    echo ========================================
) else (
    echo [오류] APK 파일을 찾을 수 없습니다.
)

cd ..\..
echo.
pause