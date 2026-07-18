import "./globals.css";

export const metadata = {
  title: "NCSC86 Dog Tag Order",
  description: "Dog tag order form and 3D preview for NCSC86",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
