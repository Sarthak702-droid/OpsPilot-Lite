"use client";
import { createContext, useContext } from "react";
type TokenGetter = () => Promise<string | null>;
const Context = createContext<TokenGetter>(async () => null);
export function TokenProvider({ getToken, children }: { getToken: TokenGetter; children: React.ReactNode }) { return <Context.Provider value={getToken}>{children}</Context.Provider>; }
export function useToken() { return useContext(Context); }

