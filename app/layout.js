import { Playfair_Display, Inter } from 'next/font/google';
import './globals.css';
import { title } from 'process';

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

//meta data
export const metadata={
  title:'Glow & Grace Nails | Professional Nail Services in Nairobi',
  description:'Book professional manicure,pedicure, and nail art services in Nairobi.Choose your design, pick a time slot ,and book your appointment online today.',
  keywords:'nail parlor Nairobi,nail technician Kenya, manicure and pedicure Nairobi ,Glow and Grace Nails',
}


export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${playfair.variable} ${inter.variable}`}>{children}</body>
    </html>
  );
}


