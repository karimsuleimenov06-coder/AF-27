import { useEffect, useState } from 'react'

export function useIsLandscape() {
  const [isLandscape, setIsLandscape] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(orientation: landscape)').matches,
  )
  useEffect(() => {
    const mql = window.matchMedia('(orientation: landscape)')
    const onChange = () => setIsLandscape(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return isLandscape
}
