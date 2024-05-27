import { Analytics } from "@vercel/analytics/react";

import { Home } from "../components/home";

import { createClient } from "../utils/supabase/server";

import { getServerSideConfig } from "../config/server";

const serverConfig = getServerSideConfig();

export default async function App() {
  const canInitSupabaseClient = () => {
    // This function is just for the interactive tutorial.
    // Feel free to remove it once you have Supabase connected.
    try {
      createClient();
      return true;
    } catch (e) {
      return false;
    }
  };

  const isSupabaseConnected = canInitSupabaseClient();

  return (
    <>
      <Home />
      {serverConfig?.isVercel && (
        <>
          <Analytics />
        </>
      )}
    </>
  );
}
