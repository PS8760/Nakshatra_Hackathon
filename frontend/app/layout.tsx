import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "NeuroRestore AI — AI-Powered Rehabilitation",
  description: "Real-time physical joint recovery and cognitive rehabilitation. No hardware required. Works on any device.",
  keywords: ["rehabilitation", "AI", "physiotherapy", "pose estimation", "recovery"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body style={{ background: "#02182b", color: "#e8f4f0" }} className="antialiased">
        <Navbar />
        <main>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
