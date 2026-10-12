import { useMemo } from 'react'
import { useI18n } from '../i18n/LanguageContext'
import { colorForCategory, formatHours } from '../lib/categories'
import styles from './CategoryChart.module.css'

const RADIUS = 52
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function buildSlices(records, uncategorized) {
  const totals = new Map()
  records.forEach((record) => {
    const name = record.category?.trim() || uncategorized
    totals.set(name, (totals.get(name) || 0) + Number(record.duration || 0))
  })

  const minutes = [...totals.entries()].reduce((sum, [, value]) => sum + value, 0)
  if (minutes <= 0) return { minutes: 0, slices: [] }

  let offset = 0
  const slices = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => {
      const share = value / minutes
      const length = share * CIRCUMFERENCE
      const slice = {
        name,
        minutes: value,
        hours: formatHours(value),
        percent: Math.round(share * 1000) / 10,
        color: colorForCategory(name),
        dash: `${length} ${CIRCUMFERENCE}`,
        offset,
      }
      offset -= length
      return slice
    })

  return { minutes, slices }
}

export default function CategoryChart({ records }) {
  const { t } = useI18n()
  const { minutes, slices } = useMemo(
    () => buildSlices(records, t('lab.uncategorized')),
    [records, t],
  )

  if (records.length === 0 || slices.length === 0) {
    return (
      <section className={styles.section} aria-labelledby="category-chart-heading">
        <p className={styles.kicker}>{t('lab.byCategory')}</p>
        <h2 id="category-chart-heading" className={styles.title}>
          {t('lab.timeSpent')}
        </h2>
        <p className={styles.empty}>{t('lab.timeEmpty')}</p>
      </section>
    )
  }

  return (
    <section className={styles.section} aria-labelledby="category-chart-heading">
      <div className={styles.head}>
        <div>
          <p className={styles.kicker}>{t('lab.byCategory')}</p>
          <h2 id="category-chart-heading" className={styles.title}>
            {t('lab.timeSpent')}
          </h2>
        </div>
        <p className={styles.summary}>{t('lab.hoursTotal', { hours: formatHours(minutes) })}</p>
      </div>

      <div className={styles.body}>
        <svg className={styles.chart} viewBox="0 0 140 140" role="img" aria-label={t('lab.categoryChart')}>
          <circle className={styles.track} cx="70" cy="70" r={RADIUS} />
          {slices.map((slice) => (
            <circle
              key={slice.name}
              cx="70"
              cy="70"
              r={RADIUS}
              fill="none"
              stroke={slice.color}
              strokeWidth="16"
              strokeDasharray={slice.dash}
              strokeDashoffset={slice.offset}
              transform="rotate(-90 70 70)"
            />
          ))}
        </svg>

        <ul className={styles.legend}>
          {slices.map((slice) => (
            <li key={slice.name}>
              <span className={styles.swatch} style={{ background: slice.color }} aria-hidden="true" />
              <span className={styles.name}>{slice.name}</span>
              <span className={styles.hours}>{slice.hours} h</span>
              <span className={styles.percent}>{slice.percent}%</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
