Set WinScriptHost = CreateObject("WScript.Shell")

' 1. הרצת השרת ברקע (ללא חלון)
WinScriptHost.Run "python.exe main.py", 0

Set WinScriptHost = Nothing