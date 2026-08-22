import { DM_Sans, Geist_Mono, Instrument_Sans } from "next/font/google";
import { ConditionalHeader } from "@/components/layout/conditional-header";
import { ConditionalFooter } from "@/components/layout/conditional-footer";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { AgentShellProvider } from "@/components/agent/agent-shell";
import { MAP_TILE_ORIGINS } from "@/lib/map-styles";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "Wisconsin Workways",
    template: "%s · Wisconsin Workways",
  },
  description:
    "Explore Wisconsin jobs, local economics, and public-transit routes that connect people to work.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${instrument.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {MAP_TILE_ORIGINS.map((origin) => (
          <link key={origin} rel="preconnect" href={origin} crossOrigin="anonymous" />
        ))}
        <link rel="preload" href="/data/wi-counties.geojson" as="fetch" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <AgentShellProvider>
            <ConditionalHeader />
            <main className="flex min-h-0 flex-1 flex-col">{children}</main>
            <ConditionalFooter />
          </AgentShellProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
