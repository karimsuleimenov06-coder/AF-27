import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import AppShell from './layout/AppShell'
import MainMenu from './screens/MainMenu'
import SquadScreen from './screens/SquadScreen'
import PacksScreen from './screens/PacksScreen'
import TransfersScreen from './screens/TransfersScreen'
import UpgradesScreen from './screens/UpgradesScreen'
import TournamentsScreen from './screens/TournamentsScreen'
import SettingsScreen from './screens/SettingsScreen'

const MatchScreen = lazy(() => import('./screens/MatchScreen'))

function MatchLoading() {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-night">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan border-t-transparent" />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<MainMenu />} />
        <Route path="squad" element={<SquadScreen />} />
        <Route path="packs" element={<PacksScreen />} />
        <Route path="transfers" element={<TransfersScreen />} />
        <Route path="upgrades" element={<UpgradesScreen />} />
        <Route path="tournaments" element={<TournamentsScreen />} />
        <Route path="settings" element={<SettingsScreen />} />
        <Route
          path="match"
          element={
            <Suspense fallback={<MatchLoading />}>
              <MatchScreen />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  )
}
