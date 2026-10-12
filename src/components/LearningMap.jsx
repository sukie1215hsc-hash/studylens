import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/LanguageContext'
import { createMapData } from '../lib/mapData'
import { readThemePaint } from '../utils/theme'
import styles from './LearningMap.module.css'

const MAP = createMapData()

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function LearningMap() {
  const { t } = useI18n()
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const hoverRef = useRef(-1)
  const selectedRef = useRef(-1)
  const [hover, setHover] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    selectedRef.current = selected
      ? MAP.points.findIndex((p) => p.detail && p.detail.title === selected.title)
      : -1
  }, [selected])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return undefined

    const ctx = canvas.getContext('2d')
    let frame = 0
    let running = true
    const reduced = prefersReducedMotion()
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')

    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const pointAt = (index, t, w, h) => {
      const p = MAP.points[index]
      const motion = reduced ? 0 : 1
      const x = p.x * w + Math.cos(t * 0.00035 + p.drift) * p.amp * w * motion
      const y = p.y * h + Math.sin(t * 0.00028 + p.drift) * p.amp * h * 1.4 * motion
      return { x, y, p }
    }

    const draw = (t) => {
      if (!running) return
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      ctx.clearRect(0, 0, w, h)

      const hoverIdx = hoverRef.current
      const selectedIdx = selectedRef.current

      const scale = Math.max(0.85, Math.min(w, h) / 560)
      const paint = readThemePaint(wrap)
      ctx.lineCap = 'round'
      MAP.links.forEach((link, i) => {
        const a = pointAt(link.a, t, w, h)
        const b = pointAt(link.b, t, w, h)
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = link.spine ? paint.cobalt : paint.mapLink
        ctx.globalAlpha = link.spine ? 0.42 : Math.min(0.42, link.alpha + 0.08)
        ctx.lineWidth = (link.spine ? 1.15 : 0.7) * scale
        if (link.spine && !reduced) {
          ctx.setLineDash([4, 10])
          ctx.lineDashOffset = -t * 0.02 - i
        } else {
          ctx.setLineDash([])
        }
        ctx.stroke()
        ctx.globalAlpha = 1
      })
      ctx.setLineDash([])

      MAP.points.forEach((_, index) => {
        const { x, y, p } = pointAt(index, t, w, h)
        const isHot = index === hoverIdx || index === selectedIdx
        const radius = (isHot ? p.r * 1.35 : p.r) * scale
        ctx.beginPath()
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.prominent ? 0.96 : 0.82
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
        if (p.prominent) {
          ctx.globalAlpha = isHot ? 0.6 : 0.34
          ctx.beginPath()
          ctx.strokeStyle = p.color
          ctx.lineWidth = 1.1 * scale
          ctx.arc(x, y, radius + 5 * scale, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.globalAlpha = 1
      })

      frame = requestAnimationFrame(draw)
    }

    const hitTest = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect()
      const x = clientX - rect.left
      const y = clientY - rect.top
      const w = rect.width
      const h = rect.height
      let found = -1
      let best = 18
      MAP.points.forEach((p, index) => {
        if (!p.prominent) return
        const dx = p.x * w - x
        const dy = p.y * h - y
        const d = Math.hypot(dx, dy)
        if (d < Math.max(best, p.r + 10)) {
          best = d
          found = index
        }
      })
      return found
    }

    const onMove = (event) => {
      const idx = hitTest(event.clientX, event.clientY)
      hoverRef.current = idx
      if (idx >= 0) {
        const rect = canvas.getBoundingClientRect()
        const p = MAP.points[idx]
        setHover({
          index: idx,
          kind: p.detail.kind,
          x: p.x * rect.width,
          y: p.y * rect.height,
        })
        canvas.style.cursor = 'pointer'
      } else {
        setHover(null)
        canvas.style.cursor = 'crosshair'
      }
    }

    const onLeave = () => {
      hoverRef.current = -1
      setHover(null)
    }

    const onClick = (event) => {
      const idx = hitTest(event.clientX, event.clientY)
      if (idx < 0) {
        selectedRef.current = -1
        setSelected(null)
        return
      }
      selectedRef.current = idx
      const rect = canvas.getBoundingClientRect()
      const p = MAP.points[idx]
      setSelected({
        ...p.detail,
        x: Math.min(p.x * rect.width + 16, rect.width - 220),
        y: Math.min(p.y * rect.height + 12, rect.height - 140),
      })
    }

    const onKey = (event) => {
      const hubs = MAP.points
        .map((p, i) => (p.prominent ? i : -1))
        .filter((i) => i >= 0)
      if (!hubs.length) return
      if (event.key === 'Escape') {
        selectedRef.current = -1
        hoverRef.current = -1
        setSelected(null)
        setHover(null)
        return
      }
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Enter') {
        return
      }
      event.preventDefault()
      const current = selectedRef.current >= 0 ? selectedRef.current : hubs[0]
      const pos = Math.max(0, hubs.indexOf(current))
      let next = current
      if (event.key === 'ArrowRight') next = hubs[(pos + 1) % hubs.length]
      if (event.key === 'ArrowLeft') next = hubs[(pos - 1 + hubs.length) % hubs.length]
      if (event.key === 'Enter' && selectedRef.current < 0) next = hubs[0]
      selectedRef.current = next
      hoverRef.current = next
      const rect = canvas.getBoundingClientRect()
      const p = MAP.points[next]
      setHover({
        index: next,
        kind: p.detail.kind,
        x: p.x * rect.width,
        y: p.y * rect.height,
      })
      setSelected({
        ...p.detail,
        x: Math.min(p.x * rect.width + 16, rect.width - 220),
        y: Math.min(p.y * rect.height + 12, rect.height - 140),
      })
    }

    resize()
    draw(0)
    const observer = new ResizeObserver(resize)
    observer.observe(wrap)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerleave', onLeave)
    canvas.addEventListener('click', onClick)
    canvas.addEventListener('keydown', onKey)
    media.addEventListener('change', resize)

    return () => {
      running = false
      cancelAnimationFrame(frame)
      observer.disconnect()
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('keydown', onKey)
      media.removeEventListener('change', resize)
    }
  }, [])

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        tabIndex={0}
        role="img"
          aria-label={t('home.mapLabel')}
      />
      {hover && !selected && (
        <div
          className={styles.float}
          style={{ left: hover.x, top: hover.y }}
          aria-hidden="true"
        >
          {hover.kind}
        </div>
      )}
      {selected && (
        <aside
          className={styles.card}
          style={{ left: selected.x, top: selected.y }}
          aria-live="polite"
        >
          <p className={styles.kicker}>{selected.kind}</p>
          <h3>{selected.title}</h3>
          <p>{selected.note}</p>
          <p className={styles.stamp}>{selected.stamp}</p>
          <button
            type="button"
            onClick={() => {
              setSelected(null)
            }}
          >
            {t('galaxy.close')}
          </button>
        </aside>
      )}
    </div>
  )
}
