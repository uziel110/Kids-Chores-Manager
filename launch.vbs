Dim WshShell, AppDir, oHTTP, bServerRunning

Set WshShell = CreateObject("WScript.Shell")
AppDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

' Check if server already running on port 8000
bServerRunning = False
Set oHTTP = CreateObject("MSXML2.XMLHTTP")
On Error Resume Next
oHTTP.Open "GET", "http://localhost:8000", False
oHTTP.Send
If Err.Number = 0 And oHTTP.Status > 0 Then
    bServerRunning = True
End If
On Error GoTo 0
Set oHTTP = Nothing

If Not bServerRunning Then
    WshShell.Run """" & AppDir & "\.venv\Scripts\python.exe"" """ & AppDir & "\main.py""", 0, False
    WScript.Sleep 3000
End If

WshShell.Run "http://localhost:8000", 1, False
Set WshShell = Nothing
