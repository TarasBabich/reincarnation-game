import './globals.css';

export const metadata = {
  title: 'REINCARNUM',
  description: 'Game about reincarnation, power, wealth and influence',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  );
}
