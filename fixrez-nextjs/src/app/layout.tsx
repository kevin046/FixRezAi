import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/components/ui/sonner";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FixRez AI - Professional Resume Optimization Tool with Advanced AI Technology",
  description: "Transform your resume with AI-powered optimization. FixRez AI analyzes your resume, provides ATS-friendly improvements, and helps you land more interviews.",
  keywords: "resume optimization, AI resume, ATS resume, job application, career tools, resume builder, AI career assistant",
  authors: [{ name: "FixRez AI" }],
  creator: "FixRez AI",
  publisher: "FixRez AI",
  robots: "index, follow",
  alternates: {
    canonical: "https://fixrez.ai",
  },
  openGraph: {
    title: "FixRez AI - Professional Resume Optimization Tool",
    description: "Transform your resume with AI-powered optimization. Get ATS-friendly improvements and land more interviews.",
    url: "https://fixrez.ai",
    siteName: "FixRez AI",
    images: [
      {
        url: "https://fixrez.ai/og-image.png",
        width: 1200,
        height: 630,
        alt: "FixRez AI - Professional Resume Optimization",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FixRez AI - Professional Resume Optimization Tool",
    description: "Transform your resume with AI-powered optimization. Get ATS-friendly improvements and land more interviews.",
    images: ["https://fixrez.ai/twitter-image.png"],
  },
  verification: {
    google: "your-google-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <SessionProviderWrapper>
          {children}
        </SessionProviderWrapper>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
