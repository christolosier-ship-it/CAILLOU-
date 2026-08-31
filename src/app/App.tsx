import { PRODUCT_NAME, PRODUCT_SIGNATURE } from '../domain/foundation'
import { FoundationStatus } from '../features/foundation/FoundationStatus'
import { FoundationScene } from '../scene/FoundationScene'

export function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Fondation V1</p>
          <h1>{PRODUCT_NAME}</h1>
        </div>
        <FoundationStatus />
      </header>

      <main className="foundation-layout">
        <section className="foundation-copy" aria-labelledby="foundation-title">
          <p className="eyebrow">Une situation remarquablement stable</p>
          <h2 id="foundation-title">{PRODUCT_SIGNATURE}</h2>
          <p>
            Le socle applicatif est en place. Cette vue valide uniquement le rendu 3D,
            le responsive et la PWA, sans anticiper le showroom ni les fonctions métier.
          </p>
        </section>

        <section className="foundation-scene" aria-labelledby="scene-title">
          <div className="scene-heading">
            <div>
              <p className="eyebrow">Validation WebGL</p>
              <h2 id="scene-title">Volume provisoire</h2>
            </div>
            <p>Glisser pour faire pivoter · Molette ou pincement pour zoomer</p>
          </div>
          <FoundationScene />
          <p className="scene-note">
            Aucun GLB de production n'est chargé à cette étape.
          </p>
        </section>
      </main>

      <footer className="app-footer">
        <span>CAILLOU™ V1</span>
        <span>État : minéral</span>
      </footer>
    </div>
  )
}
