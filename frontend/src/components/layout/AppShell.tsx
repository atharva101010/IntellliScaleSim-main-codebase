import React from 'react'
import Header from './Header'
import { useLocation } from 'react-router-dom'

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation()
  const isAuth = location.pathname === '/login' || location.pathname === '/register'
  const bgClass = isAuth
    ? 'bg-rose-50'
    : 'bg-gradient-to-br from-slate-50 via-white to-slate-100'

  const mainBase = "w-full"
  const mainLayout = isAuth ? `${mainBase} max-w-6xl mx-auto min-h-[calc(100vh-56px)] grid place-items-center px-4 sm:px-6 lg:px-8` : `${mainBase}`
  return (
    <div className={`min-h-screen ${bgClass} text-slate-900`}>
      <Header />
      <main className={mainLayout}>
        {children}
      </main>
    </div>
  )
}

export default AppShell
