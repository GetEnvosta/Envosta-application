import '../globals.css';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <div className="font-sans">{children}</div>;
}
