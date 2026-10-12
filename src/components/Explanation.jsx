import { useI18n } from '../i18n/LanguageContext'
import styles from './Explanation.module.css'

function Figures() {
  return {
    1: (
      <svg viewBox="0 0 88 64" aria-hidden="true">
        <rect x="14" y="16" width="60" height="8" fill="none" stroke="currentColor" strokeWidth="0.8" />
        <rect x="14" y="28" width="46" height="8" fill="none" stroke="var(--cobalt)" strokeWidth="0.8" />
        <rect x="14" y="40" width="52" height="8" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.45" />
        <circle cx="70" cy="32" r="2.2" fill="var(--cobalt)" />
      </svg>
    ),
    2: (
      <svg viewBox="0 0 88 64" aria-hidden="true">
        <circle cx="32" cy="34" r="14" fill="none" stroke="var(--cobalt)" strokeWidth="0.8" />
        <circle cx="52" cy="28" r="10" fill="none" stroke="var(--lavender)" strokeWidth="0.8" />
        <circle cx="58" cy="40" r="5" fill="var(--sun)" />
        <circle cx="28" cy="26" r="2" fill="var(--cobalt)" />
        <circle cx="44" cy="20" r="1.6" fill="var(--lavender)" />
      </svg>
    ),
    3: (
      <svg viewBox="0 0 88 64" aria-hidden="true">
        <path d="M16 46 L28 34 L40 38 L52 22 L72 28" fill="none" stroke="var(--cobalt)" strokeWidth="1.1" />
        <circle cx="28" cy="34" r="2.1" fill="var(--cobalt)" />
        <circle cx="52" cy="22" r="2.1" fill="var(--teal)" />
        <circle cx="72" cy="28" r="2.1" fill="var(--coral)" />
        <path d="M16 50 H72" stroke="currentColor" strokeWidth="0.6" opacity="0.35" />
      </svg>
    ),
    4: (
      <svg viewBox="0 0 88 64" aria-hidden="true">
        <ellipse cx="44" cy="32" rx="28" ry="16" fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.35" />
        <circle cx="30" cy="30" r="2.4" fill="var(--cobalt)" />
        <circle cx="44" cy="24" r="1.8" fill="var(--lavender)" />
        <circle cx="54" cy="36" r="2.8" fill="var(--teal)" />
        <circle cx="62" cy="28" r="1.5" fill="var(--coral)" />
      </svg>
    ),
    5: (
      <svg viewBox="0 0 88 64" aria-hidden="true">
        <circle cx="32" cy="30" r="10" fill="none" stroke="var(--lavender)" strokeWidth="0.8" />
        <circle cx="56" cy="34" r="10" fill="none" stroke="var(--teal)" strokeWidth="0.8" />
        <path d="M40 30 H48" stroke="currentColor" strokeWidth="0.8" opacity="0.45" />
        <circle cx="32" cy="30" r="2" fill="var(--lavender)" />
        <circle cx="56" cy="34" r="2" fill="var(--teal)" />
      </svg>
    ),
  }
}

const STEP_META = [
  { n: '01', page: 'galaxy', prefix: 'home.step1' },
  { n: '02', page: 'galaxy', prefix: 'home.step2' },
  { n: '03', page: 'lab', prefix: 'home.step3' },
  { n: '04', page: 'galaxy', prefix: 'home.step4' },
  { n: '05', page: 'community', prefix: 'home.step5' },
]

export default function Explanation({ onStart, onNavigate }) {
  const { t } = useI18n()
  const figures = Figures()

  return (
    <section className={styles.section} id="how">
      <header className={styles.head}>
        <p>{t('home.howKicker')}</p>
        <h2>{t('home.howTitle')}</h2>
      </header>

      <ol className={styles.steps}>
        {STEP_META.map((step, index) => (
          <li key={step.n}>
            <div className={styles.figure}>{figures[index + 1]}</div>
            <div className={styles.stepCopy}>
              <p className={styles.num}>{step.n}</p>
              <h3>{t(`${step.prefix}.title`)}</h3>
              <p className={styles.body}>{t(`${step.prefix}.body`)}</p>
              {onNavigate ? (
                <button type="button" className={styles.stepLink} onClick={() => onNavigate(step.page)}>
                  {t(`${step.prefix}.link`)}
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <div className={styles.foot} id="about">
        <div>
          <p className={styles.footKicker}>{t('home.footKicker')}</p>
          <h2>{t('home.footTitle')}</h2>
          <p className={styles.footLede}>{t('home.footLede')}</p>
        </div>
        <button type="button" onClick={onStart}>
          {t('home.footCta')}
        </button>
      </div>
    </section>
  )
}
