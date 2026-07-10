@echo off
chcp 65001 >nul
echo ================================================================
echo Windows 시스템 성능 최적화 스크립트
echo ================================================================
echo 관리자 권한이 필요합니다. 관리자로 실행해주세요!
echo ================================================================
echo.

echo [1/10] Windows 검색 인덱싱 비활성화...
sc stop "WSearch"
sc config "WSearch" start=disabled

echo [2/10] Windows Defender 실시간 보호 임시 비활성화...
powershell -Command "Set-MpPreference -DisableRealtimeMonitoring $true" 2>nul

echo [3/10] 시스템 복원 지점 비활성화 (성능 향상)...
powershell -Command "Disable-ComputerRestore -Drive 'C:\'" 2>nul

echo [4/10] 가상 메모리 최적화...
wmic computersystem set AutomaticManagedPagefile=False
wmic pagefileset where name="C:\\pagefile.sys" set InitialSize=8192,MaximumSize=16384

echo [5/10] 네트워크 최적화...
netsh int tcp set global autotuninglevel=normal
netsh int tcp set global chimney=enabled
netsh int tcp set global rss=enabled
netsh int tcp set global netdma=enabled
netsh int tcp set global ecncapability=enabled
netsh int tcp set global timestamps=disabled
netsh int tcp set global initialRto=2000
netsh int tcp set global rsc=enabled

echo [6/10] DNS 캐시 최적화...
ipconfig /flushdns
netsh int ip set dns "Local Area Connection" static 1.1.1.1
netsh int ip add dns "Local Area Connection" 1.0.0.1 index=2

echo [7/10] 디스크 최적화...
fsutil behavior set memoryusage 2
fsutil behavior set disablelastaccess 1
fsutil behavior set mftzone 2

echo [8/10] 프로세서 스케줄링 최적화 (프로그램 우선)...
reg add "HKLM\SYSTEM\CurrentControlSet\Control\PriorityControl" /v Win32PrioritySeparation /t REG_DWORD /d 38 /f

echo [9/10] 시각 효과 비활성화...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects" /v VisualFXSetting /t REG_DWORD /d 2 /f

echo [10/10] 불필요한 서비스 비활성화...
sc stop "SysMain"
sc config "SysMain" start=disabled
sc stop "DiagTrack"
sc config "DiagTrack" start=disabled
sc stop "TabletInputService"
sc config "TabletInputService" start=disabled
sc stop "WbioSrvc"
sc config "WbioSrvc" start=disabled

echo.
echo ================================================================
echo Windows 시스템 최적화 완료!
echo ================================================================
pause