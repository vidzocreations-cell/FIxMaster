using System;
using System.Drawing;
using System.Windows.Forms;

namespace FixMasterPOS
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
        }
    }

    public class MainForm : Form
    {
        private WebBrowser webBrowser;

        public MainForm()
        {
            this.Text = "FixMaster POS - Point of Sale & Repair Management System";
            this.Size = new Size(1366, 768);
            this.WindowState = FormWindowState.Maximized;
            this.StartPosition = FormStartPosition.CenterScreen;

            // Try loading application icon if available
            try
            {
                this.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            }
            catch { }

            webBrowser = new WebBrowser();
            webBrowser.Dock = DockStyle.Fill;
            webBrowser.ScriptErrorsSuppressed = true;
            webBrowser.IsWebBrowserContextMenuEnabled = true;

            // Load Vercel Cloud Live URL
            webBrowser.Navigate("https://fix-master-git-main-hansa7788-s-projects1.vercel.app");

            this.Controls.Add(webBrowser);
        }
    }
}
