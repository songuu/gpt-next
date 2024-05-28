import { Screen } from '@/components/home'

export default function App({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Screen showSider={false}>{children}</Screen>
}