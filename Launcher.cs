using System;
using System.Diagnostics;
using System.Threading;
using System.IO;

class Program {
    static void Main() {
        string appDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "ops-app");
        // Explicitly use port 3000 and single page application rewrite if needed (though static export doesn't use SPA rewrite usually, 'serve' is fine)
        string serveCmd = "npx serve out -l 3000";
        
        // Check if ops-app exists, otherwise assume we are inside ops-app
        if (!Directory.Exists(appDir)) {
            appDir = AppDomain.CurrentDomain.BaseDirectory;
        }

        Console.WriteLine("Starting School Uniform Ops in Browser...");
        Console.WriteLine("Server Directory: " + appDir);

        // Start Server
        // /k keeps the window open so the user can see if 'serve' crashes or asks for input
        ProcessStartInfo psi = new ProcessStartInfo("cmd.exe", "/k " + serveCmd);
        psi.WorkingDirectory = appDir;
        psi.UseShellExecute = true; // Use shell execute to ensure it pops up clearly
        psi.WindowStyle = ProcessWindowStyle.Normal; // Ensure visible
        
        try {
            Console.WriteLine("Launching server... (Please wait)");
            Process.Start(psi);
            
            // Give it 4 seconds to spin up (first time might be slow)
            Thread.Sleep(4000);

            // Open Browser
            Console.WriteLine("Opening http://localhost:3000...");
            Process.Start("http://localhost:3000");
        } catch (Exception e) {
            Console.WriteLine("Error launching app: " + e.Message);
            Console.ReadKey();
        }
    }
}
