import { supabase } from "../../lib/supabase";
import {
  LOGIN_SESSION_COOKIE_NAME,
  REMEMBER_LOGIN_STORAGE_KEY,
} from "../../shared/constants";

export type LoginSession = {
  id: string;
  role: string;
};

export type RememberedLogin = {
  id: string;
  password: string;
};

export const setLoginSessionCookie = (id: string, role: string) => {
  const value = encodeURIComponent(JSON.stringify({ id, role }));
  document.cookie = `${LOGIN_SESSION_COOKIE_NAME}=${value}; path=/; SameSite=Lax`;
};

export const getLoginSessionCookie = () => {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${LOGIN_SESSION_COOKIE_NAME}=`));

  if (!cookie) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(cookie.split("=")[1])) as LoginSession;
  } catch {
    return null;
  }
};

export const clearLoginSessionCookie = () => {
  document.cookie = `${LOGIN_SESSION_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
};

export const getRememberedLogin = () => {
  const rememberedLogin = localStorage.getItem(REMEMBER_LOGIN_STORAGE_KEY);

  if (!rememberedLogin) {
    return null;
  }

  try {
    return JSON.parse(rememberedLogin) as RememberedLogin;
  } catch {
    localStorage.removeItem(REMEMBER_LOGIN_STORAGE_KEY);
    return null;
  }
};

export const saveRememberedLogin = (id: string, password: string) => {
  localStorage.setItem(
    REMEMBER_LOGIN_STORAGE_KEY,
    JSON.stringify({
      id,
      password,
    })
  );
};

export const clearRememberedLogin = () => {
  localStorage.removeItem(REMEMBER_LOGIN_STORAGE_KEY);
};

export const loginAccount = async (id: string, password: string) => {
  return await supabase
    .from("login_accounts")
    .select("*")
    .eq("id", id)
    .eq("password", password)
    .single();
};