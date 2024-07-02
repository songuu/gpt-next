'use client';

import { useState } from 'react';
import { type Provider } from '@supabase/supabase-js';
import { Github } from 'lucide-react';

import { signInWithOAuth } from '@/utils/auth-helper/client'

import { IconButton } from "./button";

type OAuthProviders = {
  name: Provider;
  displayName: string;
  icon: JSX.Element;
};

export function OauthSignIn() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const oAuthProviders: OAuthProviders[] = [
    {
      name: 'github',
      displayName: 'GitHub',
      icon: <Github className="h-5 w-5" />
    }
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    await signInWithOAuth(e);
  }

  return (
    <div className="mt-8">
      {oAuthProviders.map((provider) => (
        <form
          key={provider.name}
          className="pb-2"
          onSubmit={(e) => handleSubmit(e)}
        >
          <input type="hidden" name="provider" value={provider.name} />
          <IconButton
            // icon={provider.icon}
            className="w-full"
          >
            <span className="mr-2">{provider.icon}</span>
            <span>{provider.displayName}</span>
          </IconButton>
        </form>
      ))}
    </div>
  );
}