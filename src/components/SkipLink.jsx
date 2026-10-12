import { useI18n } from '../i18n/LanguageContext'
import styles from './SkipLink.module.css'

export default function SkipLink() {
  const { t } = useI18n()
  return (
    <a className={styles.link} href="#how">
      {t('skip.how')}
    </a>
  )
}
