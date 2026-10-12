import { useMemo, useState } from 'react'
import { useI18n } from '../i18n/LanguageContext'
import {
  computeLearningMomentum,
  dailyHoursSeries,
  formatAxisDate,
  formatHoursLabel,
} from '../lib/learningMomentum'
import styles from './LearningMomentum.module.css'

const RANGES = [
  { id: 7, key: 'lab.days7' },
  { id: 14, key: 'lab.days14' },
  { id: 30, key: 'lab.days30' },
]

function niceMax(hours) {
  const peak = Math.max(...hours, 0)
  if (peak <= 1) return 1
  if (peak <= 2) return 2
  if (peak <= 4) return 4
  if (peak <= 6) return 6
  return Math.ceil(peak)
}

function yTicks(maxHours) {
  if (maxHours <= 1) return [0, 0.5, 1]
  if (maxHours <= 2) return [0, 1, 2]
  const step = maxHours <= 6 ? 2 : Math.ceil(maxHours / 4)
  const ticks = []
  for (let value = 0; value <= maxHours; value += step) ticks.push(value)
  if (ticks[ticks.length - 1] !== maxHours) ticks.push(maxHours)
  return ticks
}

function xIndices(length, range) {
  if (length <= 1) return [0]
  if (range <= 7) return [...Array(length).keys()]
  const step = range <= 14 ? 2 : Math.max(1, Math.round((length - 1) / 5))
  const indices = []
  for (let index = 0; index < length - 1; index += step) {
    if (index === length - 2) continue
    indices.push(index)
  }
  indices.push(length - 1)
  return indices
}

function momentumCopy(momentum, t) {
  if (momentum.status === 'empty') return t('lab.emptyCopy')
  if (momentum.status === 'building') return t('lab.buildingCopy')
  const recent = formatHoursLabel(momentum.recentAvg)
  const previous = formatHoursLabel(momentum.prevAvg)
  const key =
    momentum.direction === 'rising'
      ? 'lab.risingCopy'
      : momentum.direction === 'declining'
        ? 'lab.decliningCopy'
        : 'lab.steadyCopy'
  return t(key, { recent, previous })
}

export default function LearningMomentum({ records }) {
  const { t, locale } = useI18n()
  const [range, setRange] = useState(14)
  const momentum = useMemo(() => computeLearningMomentum(records), [records])
  const series = useMemo(() => dailyHoursSeries(records, range), [records, range])

  const chart = useMemo(() => {
    const width = 640
    const height = 248
    const left = 44
    const right = 16
    const top = 16
    const bottom = 36
    const plotWidth = width - left - right
    const plotHeight = height - top - bottom
    const maxHours = niceMax(series.map((point) => point.hours))
    const ticks = yTicks(maxHours)
    const count = Math.max(series.length - 1, 1)
    const coords = series.map((point, index) => {
      const x = left + (plotWidth * index) / count
      const y = top + plotHeight * (1 - point.hours / maxHours)
      return { ...point, x, y }
    })
    const line = coords.map((point) => `${point.x},${point.y}`).join(' ')
    const area = coords.length
      ? `${left},${top + plotHeight} ${line} ${coords[coords.length - 1].x},${top + plotHeight}`
      : ''
    return { width, height, left, top, plotWidth, plotHeight, maxHours, ticks, coords, line, area }
  }, [series])

  const hasHours = series.some((point) => point.hours > 0)
  const labelIndices = xIndices(series.length, range)

  return (
    <section className={styles.section} aria-labelledby="momentum-heading">
      <div className={styles.head}>
        <div>
          <p className={styles.kicker}>{t('lab.pace')}</p>
          <h2 id="momentum-heading" className={styles.title}>
            {t('lab.momentum')}
          </h2>
        </div>
        {momentum.status === 'ready' ? (
          <p className={styles.summary}>{t(`lab.${momentum.direction}`)}</p>
        ) : null}
      </div>

      {momentum.status === 'ready' ? (
        <div className={styles.scoreRow}>
          <p className={styles.score}>
            <strong>{momentum.score}</strong>
            <span>{t('lab.of100')}</span>
          </p>
          <div className={styles.meter} aria-hidden="true">
            <i style={{ width: `${momentum.score}%` }} />
          </div>
        </div>
      ) : (
        <p className={styles.placeholder}>
          {momentum.status === 'building' ? t('lab.building') : t('lab.notEnough')}
        </p>
      )}

      <p className={styles.copy}>{momentumCopy(momentum, t)}</p>

      <div className={styles.chartHead}>
        <p className={styles.chartTitle} id="hours-chart-heading">
          {t('lab.dailyHours')}
        </p>
        <div className={styles.toggles} role="group" aria-label={t('lab.chartRange')}>
          {RANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={range === item.id ? styles.active : undefined}
              onClick={() => setRange(item.id)}
              aria-pressed={range === item.id}
            >
              {t(item.key)}
            </button>
          ))}
        </div>
      </div>

      {records.length === 0 || !hasHours ? (
        <p className={styles.empty}>
          {records.length === 0 ? t('lab.noPlot') : t('lab.noHoursRange', { range })}
        </p>
      ) : (
        <svg
          className={styles.chart}
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          role="img"
          aria-labelledby="hours-chart-heading"
        >
          {chart.ticks.map((tick) => {
            const y = chart.top + chart.plotHeight * (1 - tick / chart.maxHours)
            return (
              <g key={tick}>
                <line
                  x1={chart.left}
                  x2={chart.left + chart.plotWidth}
                  y1={y}
                  y2={y}
                  className={styles.grid}
                />
                <text x={chart.left - 8} y={y + 4} className={styles.tick} textAnchor="end">
                  {tick}
                </text>
              </g>
            )
          })}
          <polygon className={styles.area} points={chart.area} />
          <polyline className={styles.line} points={chart.line} />
          {chart.coords.map((point) => (
            <circle key={point.date} cx={point.x} cy={point.y} r="3.2" className={styles.dot}>
              <title>
                {formatAxisDate(point.date, locale)} · {formatHoursLabel(point.hours)} h
              </title>
            </circle>
          ))}
          {labelIndices.map((index) => {
            const point = chart.coords[index]
            if (!point) return null
            return (
              <text key={point.date} x={point.x} y={chart.height - 10} className={styles.axis} textAnchor="middle">
                {formatAxisDate(point.date, locale)}
              </text>
            )
          })}
        </svg>
      )}
    </section>
  )
}
