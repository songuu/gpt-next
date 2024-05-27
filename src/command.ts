import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Locale from "./locales";

type Command = (param: string) => void;
interface Commands {
  fill?: Command;
  submit?: Command;
  mask?: Command;
  code?: Command;
  settings?: Command;
}

export function useCommand(commands: Commands = {}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    let shouldUpdate = false;

    const params = new URLSearchParams(searchParams.toString())

    params.forEach((param, name) => {
      const commandName = name as unknown as keyof Commands;
      if (typeof commands[commandName] === "function") {
        commands[commandName]!(param);
        params.delete(name)
        shouldUpdate = true;
      }
    });

    if (shouldUpdate) {
      window.history.pushState(null, '', `?${searchParams.toString()}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, commands]);
}

interface ChatCommands {
  new?: Command;
  newm?: Command;
  next?: Command;
  prev?: Command;
  clear?: Command;
  del?: Command;
}

export const ChatCommandPrefix = ":";

export function useChatCommand(commands: ChatCommands = {}) {
  function extract(userInput: string) {
    return (
      userInput.startsWith(ChatCommandPrefix) ? userInput.slice(1) : userInput
    ) as keyof ChatCommands;
  }

  function search(userInput: string) {
    const input = extract(userInput);
    const desc = Locale.Chat.Commands;
    return Object.keys(commands)
      .filter((c) => c.startsWith(input))
      .map((c) => ({
        title: desc[c as keyof ChatCommands],
        content: ChatCommandPrefix + c,
      }));
  }

  function match(userInput: string) {
    const command = extract(userInput);
    const matched = typeof commands[command] === "function";

    return {
      matched,
      invoke: () => matched && commands[command]!(userInput),
    };
  }

  return { match, search };
}
