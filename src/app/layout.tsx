import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit, DM_Sans, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import { LocationProvider } from "../contexts/LocationContext";
import { BasketProvider } from "../contexts/BasketContext";

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
        className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} ${dmSans.variable} ${jakarta.variable} antialiased bg-background text-foreground`}
      >
        <LocationProvider>
          <BasketProvider>
            <Navbar />
            <main className="px-4 md:px-8 max-w-[1600px] mx-auto">
              {children}
            </main>
          </BasketProvider>
        </LocationProvider>
      </body>
    </html>
  );
}