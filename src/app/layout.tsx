import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit, DM_Sans, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import { LocationProvider } from "../contexts/LocationContext";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ADI-I",
  description: "Find food pantries, affordable groceries, and meal programs near you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} ${dmSans.variable} ${jakarta.variable} antialiased`}
      >
        <LocationProvider>
          <Navbar />
          {children}
        </LocationProvider>
      </body>
    </html>
  );
}
