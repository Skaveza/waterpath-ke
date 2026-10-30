import { useRef } from 'react'
import { Link } from 'react-router-dom'

const GITHUB_URL = 'https://github.com/Skaveza/waterpath-ke'
const PORTFOLIO_URL = 'https://skaveza.github.io/io/'
const DATA_URL = 'https://ihp-wins.unesco.org/dataset/boreholes-kenya-rural-focus'

const stats = [
  { value: '1,061', label: 'boreholes mapped in Turkana County' },
  { value: '442', label: 'with a recorded water-quality reading' },
  { value: '620', label: 'honestly labelled "Not tested"' },
  { value: '134', label: 'brackish or saline sites in the planning view' },
]

const features = [
  {
    n: '01',
    title: 'Find',
    text: 'See the nearest water points ranked by distance from where you are. Search by name or place, hide broken pumps, or show safe water only.',
  },
  {
    n: '02',
    title: 'Understand',
    text: 'Each borehole has plain-language guidance on its water, with flow, walking time and directions. Available in English and Kiswahili.',
  },
  {
    n: '03',
    title: 'Report',
    text: 'Report a broken pump or a water problem in three anonymous steps. A technician can be notified by SMS through Africa\u2019s Talking.',
  },
]

const scale = [
  { label: 'Excellent', range: 'up to 800', color: '#5A7A40' },
  { label: 'Drinkable', range: 'up to 1,500', color: '#8A9F4F' },
  { label: 'Brackish', range: 'up to 3,000', color: '#C48A2A' },
  { label: 'Saline', range: 'above 3,000', color: '#C0522A' },
]

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function Landing() {
  const scroller = useRef(null)
  return (
    <div ref={scroller} className="h-full overflow-y-auto bg-earth-page font-body text-earth-ink antialiased">
      {/* Navigation */}
      <header className="sticky top-0 z-30 border-b border-earth-rule bg-earth-page/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <button
            onClick={() => scroller.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-baseline gap-2"
          >
            <span className="font-display text-2xl font-bold">WaterPath</span>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-earth-rust">Kenya</span>
          </button>
          <nav className="hidden items-center gap-8 text-sm font-medium text-earth-mid md:flex">
            <button onClick={() => scrollTo('features')} className="hover:text-earth-ink">What it does</button>
            <button onClick={() => scrollTo('data')} className="hover:text-earth-ink">The data</button>
            <button onClick={() => scrollTo('offline')} className="hover:text-earth-ink">Without internet</button>
            <button onClick={() => scrollTo('planners')} className="hover:text-earth-ink">For planners</button>
          </nav>
          <Link
            to="/app"
            className="rounded-full bg-earth-ink px-5 py-2 text-sm font-bold text-white transition hover:bg-earth-rust"
          >
            Open the app
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <img
          src="/turkana-landscape.jpg"
          alt="A dirt track crossing the rocky plains of Turkana County, with camels walking along it"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1c0f06]/90 via-[#1c0f06]/60 to-[#1c0f06]/10" />
        <div className="relative mx-auto max-w-6xl px-6 pb-40 pt-24 md:pt-32">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FFE082]">
            Turkana County, Kenya
          </p>
          <h1 className="mt-5 max-w-2xl font-display text-5xl font-bold italic leading-[1.08] text-white md:text-6xl">
            Water points in Turkana, mapped honestly.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85">
            WaterPath turns an open borehole dataset into a mobile-friendly app. Find the nearest
            water, see what is known about its quality, and report what is broken, with a USSD
            prototype for people without internet.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              to="/app"
              className="rounded-full bg-[#FFE082] px-7 py-3.5 font-bold text-earth-ink transition hover:bg-white"
            >
              Open the app
            </Link>
            <button
              onClick={() => scrollTo('data')}
              className="rounded-full border border-white/40 px-7 py-3.5 font-bold text-white transition hover:bg-white/10"
            >
              How honest is the data?
            </button>
          </div>
          <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.15em] text-white/60">
            Working prototype · Not field-tested · No real users
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 mx-auto -mt-24 max-w-6xl px-6">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-earth-rule bg-earth-rule shadow-[0_20px_50px_-20px_rgba(44,26,14,0.35)] sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white p-7">
              <div className="font-display text-4xl font-bold text-earth-rust">{s.value}</div>
              <p className="mt-2 text-sm leading-snug text-earth-mid">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-28 md:grid-cols-2">
          <div className="overflow-hidden rounded-3xl shadow-[0_24px_60px_-24px_rgba(44,26,14,0.45)]">
            <img
              src="/turkana-well.jpg"
              alt="A woman drawing water from a hand-dug well"
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-earth-rust">
              What it does
            </p>
            <h2 className="mt-3 font-display text-4xl font-bold leading-tight">
              Three things a community needs to know about its water.
            </h2>
            <div className="mt-10 space-y-8">
              {features.map((f) => (
                <div key={f.n} className="flex gap-5">
                  <span className="font-mono text-sm font-semibold text-earth-light">{f.n}</span>
                  <div>
                    <h3 className="text-lg font-bold">{f.title}</h3>
                    <p className="mt-1 leading-relaxed text-earth-mid">{f.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Data */}
      <section id="data" className="scroll-mt-20 bg-earth-ink text-white">
        <div className="mx-auto max-w-6xl px-6 py-28">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FFE082]">
            The data, with its limits
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-tight">
            &ldquo;Safe to drink&rdquo; here means low in salt, and nothing more.
          </h2>
          <p className="mt-6 max-w-2xl leading-relaxed text-white/75">
            Water quality comes from conductivity readings in a historical survey. Conductivity
            measures salinity only. It says nothing about bacteria or other contamination, and the
            readings may be out of date. WaterPath is a guide for where to look and what to ask,
            not a safety certificate.
          </p>

          <div className="mt-12 grid gap-3 sm:grid-cols-4">
            {scale.map((s) => (
              <div key={s.label} className="rounded-xl bg-white/5 p-5">
                <div className="mb-4 h-2 rounded-full" style={{ background: s.color }} />
                <div className="font-bold">{s.label}</div>
                <div className="mt-1 font-mono text-xs text-white/60">{s.range} &micro;S/cm</div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-[#FFE082]/30 bg-[#FFE082]/5 p-8 md:p-10">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FFE082]">
              An experiment that did not make it into the app
            </p>
            <h3 className="mt-3 font-display text-2xl font-bold">
              620 boreholes have no reading. We tried to predict them, and decided not to.
            </h3>
            <p className="mt-4 max-w-3xl leading-relaxed text-white/75">
              A Random Forest trained on location, depth and pH was right 68.4% of the time. Always
              guessing &ldquo;safe&rdquo; would have been right 70.2% of the time. Because it did
              not beat that baseline, its predictions are not shown anywhere, and boreholes without
              a reading are labelled &ldquo;Not tested&rdquo;.
            </p>
          </div>
        </div>
      </section>

      {/* Without internet */}
      <section id="offline" className="scroll-mt-20">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-28 md:grid-cols-2">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-earth-rust">
              Without internet
            </p>
            <h2 className="mt-3 font-display text-4xl font-bold leading-tight">
              A USSD menu for phones with no data.
            </h2>
            <p className="mt-6 leading-relaxed text-earth-mid">
              Many people in Turkana County cannot rely on mobile internet. The USSD prototype
              lets someone find water near their town or report a problem from a basic phone,
              through a short menu.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-earth-light">
              This is a prototype that has been tested only in Africa&rsquo;s Talking&rsquo;s
              sandbox. It is not yet live on a real short code.
            </p>
          </div>
          <div className="mx-auto w-full max-w-xs rounded-[2rem] border-[6px] border-earth-ink bg-earth-ink p-3 shadow-[0_24px_60px_-24px_rgba(44,26,14,0.6)]">
            <div className="rounded-[1.4rem] bg-[#EEF3E8] p-5 font-mono text-[13px] leading-relaxed text-earth-ink">
              <p>Welcome to WaterPath</p>
              <p>Safe water in Turkana County</p>
              <p className="mt-3">1. Find water near me</p>
              <p>2. Report a problem</p>
              <p>3. About WaterPath</p>
              <div className="mt-5 flex gap-2 text-xs">
                <span className="flex-1 rounded-md bg-earth-ink/10 py-2 text-center">Cancel</span>
                <span className="flex-1 rounded-md bg-earth-ink py-2 text-center text-white">Send</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Planners */}
      <section id="planners" className="scroll-mt-20 border-y border-earth-rule bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-earth-rust">
            For NGOs and planners
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-4xl font-bold leading-tight">
            A planning view for where water treatment could matter most.
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-earth-rule bg-earth-page p-7">
              <h3 className="text-lg font-bold">Status dashboard</h3>
              <p className="mt-2 leading-relaxed text-earth-mid">
                A map of water points with status controls, so a team can see which pumps need
                attention. It sits behind a demo PIN, which is not real authentication.
              </p>
            </div>
            <div className="rounded-2xl border border-earth-rule bg-earth-page p-7">
              <h3 className="text-lg font-bold">Desalination planning</h3>
              <p className="mt-2 leading-relaxed text-earth-mid">
                A panel built from the 134 boreholes with measured conductivity above 1,500
                &micro;S/cm, showing candidate sites for treatment using an illustrative scenario.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="rounded-3xl bg-earth-rust px-8 py-14 text-center text-white md:px-16">
          <h2 className="font-display text-4xl font-bold italic">Find your nearest water point.</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/85">
            Open the app, share your location or type your town, and see what is nearby.
          </p>
          <Link
            to="/app"
            className="mt-8 inline-block rounded-full bg-white px-8 py-3.5 font-bold text-earth-rust transition hover:bg-[#FFE082] hover:text-earth-ink"
          >
            Open the app
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-earth-rule">
        <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-earth-mid">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="font-display text-lg font-bold text-earth-ink">WaterPath</span>{' '}
              <span className="ml-1">Kenya. Built by Sifa Kaveza Mwachoni.</span>
            </div>
            <div className="flex items-center gap-6 font-medium text-earth-ink">
              <a href={PORTFOLIO_URL} target="_blank" rel="noreferrer" className="hover:text-earth-rust">Portfolio</a>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-earth-rust">GitHub</a>
            </div>
          </div>
          <p className="mt-6 max-w-3xl text-xs leading-relaxed text-earth-light">
            Borehole data: Rural Focus Ltd / SWAS Water Surveys via{' '}
            <a href={DATA_URL} target="_blank" rel="noreferrer" className="underline">
              UNESCO IHP-WINS
            </a>
            , from Water Resources Authority records. Check the dataset page for current terms.
          </p>
        </div>
      </footer>
    </div>
  )
}