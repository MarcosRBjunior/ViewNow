import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import { Footer } from '@/components/Footer/Footer';
import { Header } from '@/components/Header/Header';
import './globals.css';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'ViewNow', template: '%s · ViewNow' },
  description: 'Galeria de vídeos de uma playlist do YouTube, para assistir sem sair do site.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR" className={manrope.variable}>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
