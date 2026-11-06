import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const AuthContext = createContext(null)
export const SESSION_STORAGE_KEY = 'webetu.session'

function readStoredSession() {
  try {
    return localStorage.getItem(SESSION_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

// Mock only: no credentials are ever checked (D3). Presence of the flag is the session.
export function AuthProvider({ children }) {
  const [signedIn, setSignedIn] = useState(readStoredSession)

  useEffect(() => {
    try {
      if (signedIn) localStorage.setItem(SESSION_STORAGE_KEY, '1')
      else localStorage.removeItem(SESSION_STORAGE_KEY)
    } catch {
      /* private mode: session lives in memory only */
    }
  }, [signedIn])

  const signIn = useCallback(() => setSignedIn(true), [])
  const signOut = useCallback(() => setSignedIn(false), [])

  const value = useMemo(() => ({ signedIn, signIn, signOut }), [signedIn, signIn, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
