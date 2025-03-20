import { validateLicenseKey } from '@renderer/lib/utils'
import React from 'react'
import useLocalStorage from 'use-local-storage'

type User = {
  id: string
  name: string
  email: string
  imageUrl: string
}

type AuthContext = {
  licenseKey: string | null
  setLicenseKey: (licenseKey: string) => void
  user: User | null
  setUser: (user: User) => void
  logout: () => void
}

const authContext = React.createContext<AuthContext>({
  licenseKey: null,
  setLicenseKey: () => {},
  user: null,
  setUser: () => {},
  logout: () => {}
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [licenseKey, setLicenseKey] = useLocalStorage<string | null>('shrinkx-license-key', null)
  const [user, setUser] = useLocalStorage<User | null>('shrinkx-user', null)

  function logout() {
    setLicenseKey(null)
    setUser(null)
  }

  React.useEffect(() => {
    async function validate() {
      if (!licenseKey) return
      const { data, error } = await validateLicenseKey(licenseKey)
      if (error) {
        setLicenseKey(null)
        setUser(null)
      }
      if (data) {
        setLicenseKey(data.licenseKey)
        setUser(data.user)
      }
    }
    validate()
  }, [licenseKey])

  return (
    <authContext.Provider value={{ licenseKey, setLicenseKey, user, setUser, logout }}>
      {children}
    </authContext.Provider>
  )
}

export function useAuth() {
  return React.useContext(authContext)
}
