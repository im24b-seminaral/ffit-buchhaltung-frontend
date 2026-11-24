import { useCallback, useState } from 'react'
import { EasterEggStage } from '@/components/easter-egg'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthScreen } from '@/features/auth-screen'
import { Workspace } from '@/features/workspace'
import { loadBackend, loadSession, storeBackend, storeSession, type Session } from '@/lib/backend'

export default function App() {
  const [backendUrl, setBackendUrl] = useState(loadBackend)
  const [session, setSession] = useState<Session | null>(() => loadSession(backendUrl))

  const changeSession = useCallback((next: Session | null) => {
    storeSession(next)
    setSession(next)
  }, [])
  const logout = useCallback(() => changeSession(null), [changeSession])

  /** A token is only valid for the backend that issued it, so switching backends ends the session. */
  function changeBackend(url: string) {
    storeBackend(url)
    setBackendUrl(url)
    if (session && session.backendUrl !== url) logout()
  }

  return (
    <TooltipProvider delay={500}>
      {session ? (
        <Workspace key={`${session.backendUrl}|${session.projectName}`} session={session} onBackendChange={changeBackend} onLogout={logout} />
      ) : (
        <AuthScreen
          backendUrl={backendUrl}
          onBackendChange={changeBackend}
          onLoggedIn={(projectName, token) => changeSession({ backendUrl, projectName, token })}
        />
      )}
      <Toaster position="bottom-right" />
      <EasterEggStage />
    </TooltipProvider>
  )
}
