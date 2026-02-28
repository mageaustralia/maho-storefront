/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { AuthLoginForm } from './AuthLoginForm';
import { AuthRegisterForm } from './AuthRegisterForm';
import { AuthForgotPassword } from './AuthForgotPassword';

export interface AuthFormProps {
  mode: 'login' | 'register' | 'forgot';
}

const variants: Record<string, Record<string, FC>> = {
  standard: {
    login: AuthLoginForm,
    register: AuthRegisterForm,
    forgot: AuthForgotPassword,
  },
};

export const AuthForm: FC<AuthFormProps> = ({ mode }) => {
  const variant = getVariant('account', 'auth', 'standard');
  const modeMap = variants[variant] ?? variants.standard;
  const Component = modeMap[mode] ?? modeMap.login;
  return <Component />;
};

export { AuthLoginForm, AuthRegisterForm, AuthForgotPassword };