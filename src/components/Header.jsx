import { useI18n } from '../i18n/LanguageContext'
import SiteMenu from './SiteMenu'
import styles from './Header.module.css'

const CENTER = [
  { id: 'home', key: 'nav.home' },
  { id: 'galaxy', key: 'nav.galaxy' },
  { id: 'lab', key: 'nav.lab' },
  { id: 'community', key: 'nav.community' },
]

export default function Header({
  currentPage = 'home',
  onNavigate,
  theme = 'light',
  onThemeChange,
}) {
  const { t } = useI18n()

  return (
    <header className={styles.header}>
      <a className={styles.brand} href="#top" onClick={() => onNavigate('home')}>
        <span className={styles.mark} aria-hidden="true">
          <svg viewBox="0 0 28 28" width="22" height="22">
            <circle cx="8" cy="11" r="2.4" fill="var(--cobalt)" />
            <circle cx="18" cy="8" r="1.8" fill="var(--lavender)" />
            <circle cx="20" cy="17" r="2.6" fill="var(--teal)" />
            <circle cx="12" cy="20" r="1.5" fill="var(--coral)" />
            <path
              d="M8 11 L18 8 L20 17 L12 20 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.8"
              opacity="0.7"
            />
          </svg>
        </span>
        StudyLens
      </a>

      <nav className={styles.desktop} aria-label={t('nav.primary')}>
        {CENTER.map((item) => (
          <button
            key={item.id}
            type="button"
            className={currentPage === item.id ? styles.active : undefined}
            aria-current={currentPage === item.id ? 'page' : undefined}
            onClick={() => onNavigate(item.id)}
          >
            {t(item.key)}
          </button>
        ))}
      </nav>

      <div className={styles.right}>
        <SiteMenu
          currentPage={currentPage}
          onNavigate={onNavigate}
          theme={theme}
          onThemeChange={onThemeChange}
        />
      </div>
    </header>
  )
}
