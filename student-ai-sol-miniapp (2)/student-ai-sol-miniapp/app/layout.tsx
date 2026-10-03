import "./globals.css";

export const metadata = {
  title: "Student AI",
  description: "Решение учебных задач по фото и тексту"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
