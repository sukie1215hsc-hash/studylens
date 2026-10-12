import { useI18n } from '../i18n/LanguageContext'
import LearningMap from './LearningMap'
import styles from './Hero.module.css'

export default function Hero({ onStart }) {
  const { t } = useI18n()

  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.copy}>
        <p className={styles.kicker}>{t('home.kicker')}</p>
        <h1 id="hero-title" className={styles.title}>
          {t('home.title')}
        </h1>
        <p className={styles.lede}>{t('home.lede')}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={onStart}>
            {t('home.start')}
          </button>
          <a className={styles.secondary} href="#how">
            {t('home.explore')}
          </a>
        </div>
      </div>

      <div className={styles.preview}>
        <LearningMap />
        <p className={styles.caption}>{t('home.caption')}</p>
      </div>
    </section>
  )
}
