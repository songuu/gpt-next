import Home from '@/components/home';

import Nav from '@/components/nav';

export default function App({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Home>
    {/* <Nav /> */}
    {children}
  </Home>
}