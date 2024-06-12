"use client";

require("@/polyfill");

import { useState, useEffect } from "react";

import { usePathname } from "next/navigation";

import styles from "./home.module.scss";

import BotIcon from "@/icons/bot.svg";
import LoadingIcon from "@/icons/three-dots.svg";

import { getCSSVar, useMobileScreen } from "@/utils";
import { getISOLang, getLang } from "@/locales";

import { ModelProvider, SlotID } from "@/constant";
import { ErrorBoundary } from "@/components/error";

import { SideBar } from "@/components/sidebar";
import { useAppConfig } from "@/store/config";
import { getClientConfig } from "@/config/client";
import { ClientApi } from "@/client/api";
import { useAccessStore } from "@/store";
import { identifyDefaultClaudeModel } from "@/utils/checkers";
import { Path } from '@/constant'

export function Loading(props: { noLogo?: boolean }) {
  return (
    <div className={styles["loading-content"] + " no-dark"}>
      {!props.noLogo && <BotIcon />}
      <LoadingIcon />
    </div>
  );
}

export function useSwitchTheme() {
  const config = useAppConfig();

  useEffect(() => {
    document.body.classList.remove("light");
    document.body.classList.remove("dark");

    if (config.theme === "dark") {
      document.body.classList.add("dark");
    } else if (config.theme === "light") {
      document.body.classList.add("light");
    }

    const metaDescriptionDark = document.querySelector(
      'meta[name="theme-color"][media*="dark"]',
    );
    const metaDescriptionLight = document.querySelector(
      'meta[name="theme-color"][media*="light"]',
    );

    if (config.theme === "auto") {
      metaDescriptionDark?.setAttribute("content", "#151515");
      metaDescriptionLight?.setAttribute("content", "#fafafa");
    } else {
      const themeColor = getCSSVar("--theme-color");
      metaDescriptionDark?.setAttribute("content", themeColor);
      metaDescriptionLight?.setAttribute("content", themeColor);
    }
  }, [config.theme]);
}

function useHtmlLang() {
  useEffect(() => {
    const lang = getISOLang();
    const htmlLang = document.documentElement.lang;

    if (lang !== htmlLang) {
      document.documentElement.lang = lang;
    }
  }, []);
}

const useHasHydrated = () => {
  const [hasHydrated, setHasHydrated] = useState<boolean>(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  return hasHydrated;
};

const loadAsyncGoogleFont = () => {
  const linkEl = document.createElement("link");
  const proxyFontUrl = "/google-fonts";
  const remoteFontUrl = "https://fonts.googleapis.com";
  const googleFontUrl =
    getClientConfig()?.buildMode === "export" ? remoteFontUrl : proxyFontUrl;
  linkEl.rel = "stylesheet";
  linkEl.href =
    googleFontUrl +
    "/css2?family=" +
    encodeURIComponent("Noto Sans:wght@300;400;700;900") +
    "&display=swap";
  document.head.appendChild(linkEl);
};

export function Screen({
  children,
  showSider = true
}: {
  children: React.ReactNode;
  showSider?: boolean;
}) {
  const pathname = usePathname() as Path;

  const isHome = [Path.Home, Path.Chat].includes(pathname);
  const config = useAppConfig();
  const isMobileScreen = useMobileScreen();
  const shouldTightBorder =
    getClientConfig()?.isApp || (config.tightBorder && !isMobileScreen);

  useEffect(() => {
    loadAsyncGoogleFont();
  }, []);

  return (
    <div
      className={
        styles.container +
        ` ${shouldTightBorder ? styles["tight-container"] : styles.container} ${getLang() === "ar" ? styles["rtl-screen"] : ""
        }`
      }
    >
      {
        showSider ? <SideBar className={isHome ? styles["sidebar-show"] : ""} /> : null
      }
      <div className={
        styles["window-content"] +
        ` ${showSider ? '' : '!w-full items-center'}`
      } id={SlotID.AppBody}>
        {children}
      </div>
    </div>
  );
}

export function useLoadData() {
  const config = useAppConfig();

  var api: ClientApi;
  if (config.modelConfig.model.startsWith("gemini")) {
    api = new ClientApi(ModelProvider.GeminiPro);
  } if (config.modelConfig.model.startsWith('qwen')) {
    api = new ClientApi(ModelProvider.Qwen)
  } else if (config.modelConfig.model.startsWith('general')) {
    api = new ClientApi(ModelProvider.Spark)
  } else if (identifyDefaultClaudeModel(config.modelConfig.model)) {
    api = new ClientApi(ModelProvider.Claude);
  } else {
    api = new ClientApi(ModelProvider.GPT);
  }

  useEffect(() => {
    (async () => {
      const models = await api.llm.models();

      config.mergeModels(models);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export default function Home({
  children,
}: {
  children: React.ReactNode;
}) {
  useSwitchTheme();
  useLoadData();
  useHtmlLang();

  useEffect(() => {
    console.log("[Config] got config from build time", getClientConfig());
    useAccessStore.getState().fetch();
  }, []);

  if (!useHasHydrated()) {
    return <Loading />;
  }

  return (
    <ErrorBoundary>
      <Screen>{children}</Screen>
    </ErrorBoundary>
  );
}
