import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";

const lexend = Lexend({ 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-lexend",
});

export const metadata: Metadata = {
  title: "NeuroGen Suite - Learning Disability Detection",
  description: "A Multimodal Generative Diagnostic Suite using Stealth Assessment to detect Learning Disabilities through gameplay.",
  keywords: ["learning disabilities", "dyslexia", "dyscalculia", "dysgraphia", "dyspraxia", "NVLD", "assessment", "children", "education"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${lexend.variable} font-sans antialiased bg-slate-900 text-white`}>
        {children}
      </body>
    </html>
  );
}
