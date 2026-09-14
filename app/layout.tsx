import './globals.css';

export const metadata = {
  title: 'AELORIA',
  description: 'Dark fantasy action-platformer about an elven warrior and the World Tree',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  );
}
