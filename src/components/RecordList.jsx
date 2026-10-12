import { useMemo, useState } from 'react'
import { useI18n } from '../i18n/LanguageContext'
import { formatDuration } from '../lib/categories'
import { describeRecordDate, uniqueOptions } from '../lib/recordTime'
import styles from './RecordList.module.css'

const FILTERS = [
  { id: 'all', key: 'lab.all' },
  { id: 'week', key: 'lab.week' },
  { id: 'month', key: 'lab.month' },
  { id: 'year', key: 'lab.year' },
]

export default function RecordList({ records }) {
  const { t, locale } = useI18n()
  const [filter, setFilter] = useState('all')
  const [period, setPeriod] = useState('')
  const dateOptions = useMemo(
    () => ({
      locale,
      weekLabelFor: (week, year) => t('lab.weekLabel', { week, year }),
    }),
    [locale, t],
  )

  const rows = useMemo(
    () =>
      [...records]
        .sort((a, b) => String(b.date).localeCompare(String(a.date)))
        .map((record) => ({ record, meta: describeRecordDate(record.date, dateOptions) })),
    [records, dateOptions],
  )

  const options = useMemo(() => {
    if (filter === 'week') return uniqueOptions(records, 'weekKey', 'weekLabel', dateOptions)
    if (filter === 'month') return uniqueOptions(records, 'monthKey', 'monthLabel', dateOptions)
    if (filter === 'year') return uniqueOptions(records, 'yearKey', 'yearLabel', dateOptions)
    return []
  }, [filter, records, dateOptions])

  const activePeriod = options.some((option) => option.value === period)
    ? period
    : options[0]?.value || ''

  const visible = useMemo(() => {
    if (filter === 'all') return rows
    return rows.filter(({ meta }) => {
      if (filter === 'week') return meta.weekKey === activePeriod
      if (filter === 'month') return meta.monthKey === activePeriod
      if (filter === 'year') return meta.yearKey === activePeriod
      return true
    })
  }, [rows, filter, activePeriod])

  const totalDuration = visible.reduce((sum, { record }) => sum + record.duration, 0)

  if (records.length === 0) {
    return (
      <section className={styles.section} aria-labelledby="records-heading">
        <h2 id="records-heading" className={styles.title}>
          {t('lab.records')}
        </h2>
        <p className={styles.empty}>{t('lab.recordsEmpty')}</p>
      </section>
    )
  }

  return (
    <section className={styles.section} aria-labelledby="records-heading">
      <div className={styles.head}>
        <div>
          <p className={styles.kicker}>{t('lab.fromStars')}</p>
          <h2 id="records-heading" className={styles.title}>
            {t('lab.records')}
          </h2>
        </div>
        <p className={styles.summary}>
          {t(visible.length === 1 ? 'lab.starOne' : 'lab.starMany', {
            count: visible.length,
            duration: formatDuration(totalDuration),
          })}
        </p>
      </div>

      <div className={styles.filters}>
        <div className={styles.toggles} role="group" aria-label={t('lab.timeFilter')}>
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={filter === item.id ? styles.active : ''}
              aria-pressed={filter === item.id}
              onClick={() => {
                setFilter(item.id)
                setPeriod('')
              }}
            >
              {t(item.key)}
            </button>
          ))}
        </div>
        {filter !== 'all' && options.length > 0 ? (
          <label className={styles.period}>
            <span className="sr-only">{t('lab.chooseFilter', { filter: t(`lab.${filter}`) })}</span>
            <select
              value={activePeriod}
              onChange={(event) => setPeriod(event.target.value)}
            >
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <p className={styles.empty}>{t('lab.noPeriod')}</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{t('lab.date')}</th>
                <th scope="col">{t('lab.weekCol')}</th>
                <th scope="col">{t('lab.monthCol')}</th>
                <th scope="col">{t('lab.taskTitle')}</th>
                <th scope="col">{t('star.category')}</th>
                <th scope="col">{t('lab.durationCol')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(({ record, meta }) => (
                <tr key={record.id}>
                  <td>{meta.dateLabel}</td>
                  <td>{meta.weekLabel}</td>
                  <td>{meta.monthLabel}</td>
                  <td className={styles.task}>{record.title}</td>
                  <td>{record.category}</td>
                  <td>{formatDuration(record.duration)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
