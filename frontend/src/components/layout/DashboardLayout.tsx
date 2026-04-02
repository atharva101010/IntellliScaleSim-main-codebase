import React from 'react'
import { motion } from 'framer-motion'
import Sidebar from './Sidebar'

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-[calc(100vh-64px)] flex w-full bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden p-6 md:p-10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,1)_0%,_rgba(248,250,252,1)_60%,_rgba(241,245,249,1)_100%)]">
        <motion.div
          className="max-w-[1400px] mx-auto w-full"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  )
}

export default DashboardLayout
