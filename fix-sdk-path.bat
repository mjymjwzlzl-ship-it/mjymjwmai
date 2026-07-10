@echo off
echo ========================================
echo Android SDK 경로 자동 수정
echo ========================================
echo.

REM 가능한 SDK 위치들 확인
set SDK_FOUND=0

REM Android Studio 기본 위치
if exist "C:\Users\%USERNAME%\AppData\Local\Android\Sdk" (
    set ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
    set SDK_FOUND=1
    echo SDK found at: C:\Users\%USERNAME%\AppData\Local\Android\Sdk
)

REM Program Files의 Android SDK
if %SDK_FOUND%==0 if exist "C:\Android\Sdk" (
    set ANDROID_HOME=C:\Android\Sdk
    set SDK_FOUND=1
    echo SDK found at: C:\Android\Sdk
)

REM Android Studio와 함께 설치된 SDK
if %SDK_FOUND%==0 if exist "C:\Program Files\Android\Sdk" (
    set ANDROID_HOME=C:\Program Files\Android\Sdk
    set SDK_FOUND=1
    echo SDK found at: C:\Program Files\Android\Sdk
)

if %SDK_FOUND%==0 (
    echo.
    echo [오류] Android SDK를 찾을 수 없습니다!
    echo.
    echo Android Studio를 실행하고 SDK Manager에서 SDK를 설치하세요:
    echo 1. Android Studio 실행
    echo 2. Configure → SDK Manager (또는 File → Settings → Android SDK)
    echo 3. Android SDK Location 확인 및 설치
    echo.
    echo 또는 D:\ARATA\open-sdk-manager.bat 실행
    pause
    exit /b 1
)

echo.
echo local.properties 파일 업데이트 중...
echo sdk.dir=%ANDROID_HOME:\=\\%> "D:\ARATA\arata-mobile\android\local.properties"

echo.
echo ========================================
echo 수정 완료!
echo ========================================
echo.
echo Android SDK 경로: %ANDROID_HOME%
echo.
echo 이제 다시 빌드를 실행하세요:
echo D:\ARATA\simple-build.bat
echo.
pause