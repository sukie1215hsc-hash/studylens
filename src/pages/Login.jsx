import { useState } from 'react'
import { useI18n } from '../i18n/LanguageContext'
import { login } from '../utils/auth'
import styles from './Auth.module.css'

export default function Login({ onSuccess, onGoSignup }) {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await login({ email, password })
      if (!result.ok) {
        setError(result.error || 'auth.failed')
        return
      }
      await onSuccess(result.user)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.page}>
      <p className={styles.kicker}>{t('account.kicker')}</p>
      <h1 className={styles.title}>{t('auth.loginTitle')}</h1>
      <p className={styles.lede}>{t('auth.loginLede')}</p>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.label}>
          {t('auth.email')}
          <input
            className={styles.input}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className={styles.label}>
          {t('auth.password')}
          <input
            className={styles.input}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? (
          <p className={styles.error} role="alert">
            {t(error)}
          </p>
        ) : null}
        <button className={styles.primary} type="submit" disabled={busy}>
          {busy ? t('auth.signingIn') : t('account.login')}
        </button>
      </form>
      <p className={styles.switch}>
        {t('auth.newHere')}{' '}
        <button type="button" onClick={onGoSignup}>
          {t('auth.createAccount')}
        </button>
      </p>
    </div>
  )
}
