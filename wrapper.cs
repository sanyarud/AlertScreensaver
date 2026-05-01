using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;

class Program {
    static void Main(string[] args) {
        try {
            string exeDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
            string exePath = Path.Combine(exeDir, "AlertUAScreensaver.exe");
            
            if (File.Exists(exePath)) {
                ProcessStartInfo startInfo = new ProcessStartInfo();
                startInfo.FileName = exePath;
                startInfo.Arguments = string.Join(" ", args);
                startInfo.WorkingDirectory = exeDir;
                startInfo.UseShellExecute = false;
                
                Process p = Process.Start(startInfo);
                p.WaitForExit();
            }
        } catch (Exception) {
        }
    }
}
