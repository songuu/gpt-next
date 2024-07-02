import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

import Home from '@/components/home';

import Nav from '@/components/nav';

export default async function App({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // if (!user) {
  //   return redirect("/login");
  // }
  return <Home>
    <Nav />
    {children}
  </Home>
}