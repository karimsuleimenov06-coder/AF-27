import { Outlet } from 'react-router-dom'
import TopBar from '../components/TopBar'
import SideNav from '../components/SideNav'
import FpsCounter from '../components/FpsCounter'
import RotatePrompt from '../components/RotatePrompt'
import { useIsLandscape } from '../lib/useIsLandscape'

export default function AppShell() {
  const isLandscape = useIsLandscape()

  return (
    <div className="fixed inset-0 flex bg-night">
      <SideNav />
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="no-scrollbar flex-1 overflow-y-auto">
          <div className="mx-auto h-full max-w-3xl">
            <Outlet />
          </div>
        </main>
        <FpsCounter />
      </div>

      {!isLandscape && (
        <div className="fixed inset-0 z-[300]">
          <RotatePrompt />
        </div>
      )}
    </div>
  )
}
