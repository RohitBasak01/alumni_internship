import { createContext, useContext, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchCurrentUser, logout as logoutRequest } from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [sessionDisabled, setSessionDisabled] = useState(false);
  const sessionQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: fetchCurrentUser,
    enabled: !sessionDisabled,
    retry: false,
  });

  const sessionErrorStatus = sessionQuery.error?.response?.status || null;
  const isUnauthorizedSessionError =
    Boolean(sessionQuery.error) &&
    (sessionErrorStatus === 401 || sessionErrorStatus === 403);
  const currentUser = isUnauthorizedSessionError
    ? null
    : sessionQuery.data || null;
  const hasRecoverableSessionError =
    Boolean(sessionQuery.error) &&
    sessionErrorStatus !== 401 &&
    sessionErrorStatus !== 403;

  function login(user) {
    setSessionDisabled(false);
    queryClient.setQueryData(["current-user"], user);
  }

  async function logout() {
    setSessionDisabled(true);
    queryClient.setQueryData(["current-user"], null);
    try {
      await logoutRequest();
    } finally {
      queryClient.removeQueries({ queryKey: ["current-user"] });
    }
  }

  async function refreshSession() {
    setSessionDisabled(false);
    await queryClient.invalidateQueries({ queryKey: ["current-user"] });
  }

  function clearSession() {
    setSessionDisabled(true);
    queryClient.removeQueries({ queryKey: ["current-user"] });
  }

  const value = {
    user: currentUser,
    isAuthenticated: Boolean(currentUser),
    isLoading: sessionQuery.isLoading,
    sessionError: hasRecoverableSessionError ? sessionQuery.error : null,
    login,
    logout,
    refreshSession,
    clearSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
