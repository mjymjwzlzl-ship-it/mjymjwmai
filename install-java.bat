@echo off
echo ========================================
echo Java JDK 17 설치 가이드
echo ========================================
echo.
echo [방법 1] 자동 설치 (winget 사용)
echo.
echo winget을 사용하여 Java JDK 17을 자동으로 설치합니다...
echo.

winget install Oracle.JDK.17 --accept-package-agreements --accept-source-agreements

if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo winget 설치 실패! 수동 설치를 진행하세요.
    echo ========================================
    echo.
    echo [방법 2] 수동 설치
    echo.
    echo 1. 아래 링크에서 Java JDK 17을 다운로드하세요:
    echo    https://www.oracle.com/java/technologies/downloads/#java17
    echo.
    echo 2. Windows x64 Installer를 선택하세요
    echo.
    echo 3. 다운로드한 파일을 실행하여 설치하세요
    echo    - 기본 경로: C:\Program Files\Java\jdk-17
    echo.
    echo 4. 설치 완료 후 이 창을 닫고 다시 실행하세요
    echo.
    start https://www.oracle.com/java/technologies/downloads/#java17
) else (
    echo.
    echo ✅ Java JDK 17 설치 완료!
    echo.
    echo 환경 변수 설정 중...
    setx JAVA_HOME "C:\Program Files\Java\jdk-17" /M
    setx PATH "%PATH%;C:\Program Files\Java\jdk-17\bin" /M
    
    echo.
    echo ✅ 환경 변수 설정 완료!
    echo.
    echo Java 버전 확인:
    "C:\Program Files\Java\jdk-17\bin\java" -version
)

echo.
echo ========================================
echo 설치 완료 후 할 일:
echo ========================================
echo 1. 명령 프롬프트를 새로 열어주세요
echo 2. java -version 명령으로 설치 확인
echo 3. D:\ARATA\build-apk-v103.bat 실행하여 APK 빌드
echo.
pause