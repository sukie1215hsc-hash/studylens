import { useI18n } from '../i18n/LanguageContext'
import styles from './Account.module.css'

export default function Account({ session, onLogin, onSignup, onLogout, onCommunity }) {
  const { t } = useI18n()

  return (
    <div className={styles.page}>
      <p className={styles.kicker}>{t('account.kicker')}</p>
      <h1 className={styles.title}>{t('account.title')}</h1>
      {session ? (
        <>
          <p className={styles.lede}>{t('account.ledeIn')}</p>
          <p className={styles.who}>
            <strong>{session.username}</strong>
            <span>{session.email}</span>
          </p>
          <p className={styles.meta}>{t('account.signedInAs')}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.ghost} onClick={onCommunity}>
              {t('account.profile')}
            </button>
            <button type="button" className={styles.primary} onClick={onLogout}>
              {t('account.logout')}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className={styles.lede}>{t('account.ledeOut')}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.ghost} onClick={onSignup}>
              {t('account.signup')}
            </button>
            <button type="button" className={styles.primary} onClick={onLogin}>
              {t('account.login')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
