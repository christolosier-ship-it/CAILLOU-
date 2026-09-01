import { createRoot } from 'react-dom/client'

import { Showroom } from '../../src/features/showroom/Showroom'
import '../../src/styles/global.css'
import '../../src/styles/showroom.css'

const root = document.getElementById('root')
if (!root) throw new Error('Showroom validation root is missing.')

createRoot(root).render(
  <Showroom
    username="validation"
    onSignOut={async () => undefined}
  />,
)
