import { Bebas_Neue, DM_Sans } from "next/font/google"
import AppPreloader from "@/components/AppPreloader"
import "./globals.css"

const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
})
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
})

export const metadata = {
  title: "Digital Art Battle",
  description: "Classroom digital art competition dashboard and battle arena",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${bebas.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppPreloader />
        {children}
      </body>
    </html>
  )
}
