import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { MobileSimulator } from "@/components/MobileSimulator";
import { MobileProvider } from "@/lib/mobile-context";
import { UIProvider } from "@/lib/ui-context";
import { DataProvider } from "@/lib/data-provider";
import { ToastProvider } from "@/lib/toast-context";
import { Toaster } from "@/components/ui/Toaster";
import { LayoutSwitcher } from "@/components/LayoutSwitcher";
import { SessionProvider } from "@/lib/session-context";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins"
});

export const metadata: Metadata = {
  title: "School Uniform Solutions - Operations",
  description: "Operations management system for School Uniform Solutions",
  icons: {
    icon: "/logo.png"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} font-sans antialiased`}>
        <DataProvider>
          <SessionProvider>
            <UIProvider>
              <ToastProvider>
                <MobileProvider>
                  <MobileSimulator>
                  <LayoutSwitcher>
                      {children}
                  </LayoutSwitcher>
                  </MobileSimulator>
                </MobileProvider>
                <Toaster />
              </ToastProvider>
            </UIProvider>
          </SessionProvider>
        </DataProvider>
      </body>
    </html>
  );
}
