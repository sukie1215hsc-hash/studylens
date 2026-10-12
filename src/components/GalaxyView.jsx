import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n/LanguageContext'
import { colorForCategory, formatDuration } from '../lib/categories'
import { readThemePaint, withAlpha } from '../utils/theme'
import styles from './GalaxyView.module.css'

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function hashSeed(value) {
  let h = 2166136261
  const text = String(value)
  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  }
  return (h >>> 0) / 4294967296
}

function starRadius(duration) {
  const minutes = Math.max(0, Number(duration) || 0)
  const minR = 4.8
  const maxR = 16.8
  const t = Math.min(1, Math.sqrt(minutes / 240))
  return minR + (maxR - minR) * t
}

function layoutStars(records) {
  const grouped = new Map()
  records.forEach((record) => {
    const key = record.category || 'Other'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key).push(record)
  })

  const categories = [...grouped.keys()]
  const stars = []

  categories.forEach((category, ringIndex) => {
    const items = grouped.get(category).slice().sort((a, b) => a.date.localeCompare(b.date))
    const radius =
      categories.length === 1 ? 0.28 : 0.16 + (ringIndex / Math.max(1, categories.length - 1)) * 0.3
    const twist = hashSeed(category) * Math.PI * 2

    const arc = Math.min(1.05, 0.22 + items.length * 0.11)
    items.forEach((record, index) => {
      const jitter = (hashSeed(record.id) - 0.5) * 0.05
      const along = items.length === 1 ? 0.5 : index / (items.length - 1)
      const angle = twist + (along - 0.5) * arc + jitter
      const radial = radius + (hashSeed(`${record.id}-r`) - 0.5) * 0.03
      stars.push({
        ...record,
        nx: 0.5 + Math.cos(angle) * radial,
        ny: 0.5 + Math.sin(angle) * radial * 0.78,
        radius: starRadius(record.duration),
        color: colorForCategory(category),
        ring: radius,
      })
    })
  })

  const links = buildConstellationLinks(stars)
  return { stars, categories, grouped, links }
}

function buildConstellationLinks(stars) {
  const groups = new Map()
  stars.forEach((star, index) => {
    const key = star.category || 'Other'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(index)
  })

  const seen = new Set()
  const links = []
  const maxDist = 0.18

  groups.forEach((indices) => {
    if (indices.length < 2) return

    indices.forEach((i) => {
      const origin = stars[i]
      const nearest = indices
        .filter((j) => j !== i)
        .map((j) => {
          const other = stars[j]
          const dx = origin.nx - other.nx
          const dy = origin.ny - other.ny
          return { j, dist: Math.hypot(dx, dy) }
        })
        .filter((item) => item.dist > 0 && item.dist < maxDist)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 2)

      nearest.forEach(({ j }) => {
        const key = i < j ? `${i}:${j}` : `${j}:${i}`
        if (seen.has(key)) return
        seen.add(key)
        links.push({ a: i, b: j, color: origin.color })
      })
    })
  })

  return links
}

export default function GalaxyView({
  records,
  expanded,
  onToggleExpand,
  holdStarId = null,
  appearingStarId = null,
  targetStarId = null,
  onStarTarget,
  onDeleteStar,
}) {
  const { t } = useI18n()
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const trashRef = useRef(null)
  const cameraRef = useRef({ x: 0, y: 0, scale: 1 })
  const dragRef = useRef(null)
  const liftRef = useRef(null)
  const skipClickRef = useRef(false)
  const hoverRef = useRef(-1)
  const selectedRef = useRef(null)
  const holdRef = useRef(null)
  const birthRef = useRef({ id: null, start: 0 })
  const [hover, setHover] = useState(null)
  const [selected, setSelected] = useState(null)
  const [hint, setHint] = useState(true)
  const [trayArmed, setTrayArmed] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)

  selectedRef.current = selected?.id ?? null
  holdRef.current = holdStarId
  const pendingRef = useRef(null)
  pendingRef.current = pendingDelete

  const layout = useMemo(() => layoutStars(records), [records])
  const layoutRef = useRef(layout)
  layoutRef.current = layout

  const totals = useMemo(() => {
    const minutes = records.reduce((sum, record) => sum + record.duration, 0)
    return {
      minutes,
      sessions: records.length,
      categories: new Set(records.map((record) => record.category)).size,
    }
  }, [records])

  useEffect(() => {
    cameraRef.current = { x: 0, y: 0, scale: expanded ? 1.15 : 1 }
  }, [expanded])

  useEffect(() => {
    if (!appearingStarId) {
      birthRef.current = { id: null, start: 0 }
      return
    }
    birthRef.current = { id: appearingStarId, start: performance.now() }
  }, [appearingStarId])

  useLayoutEffect(() => {
    if (!targetStarId || !onStarTarget) return
    const star = layout.stars.find((item) => item.id === targetStarId)
    const wrap = wrapRef.current
    if (!star || !wrap) return
    const rect = wrap.getBoundingClientRect()
    onStarTarget({
      x: rect.left + star.nx * rect.width,
      y: rect.top + star.ny * rect.height,
    })
  }, [targetStarId, layout, onStarTarget])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return undefined

    const ctx = canvas.getContext('2d')
    let frame = 0
    let running = true
    const reduced = prefersReducedMotion()

    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const project = (nx, ny, t, w, h) => {
      const motion = reduced ? 0 : 1
      const cam = cameraRef.current
      const driftX = Math.cos(t * 0.00022 + nx * 8) * 4 * motion
      const driftY = Math.sin(t * 0.00018 + ny * 7) * 3 * motion
      const cx = w / 2 + cam.x
      const cy = h / 2 + cam.y
      return {
        x: cx + (nx - 0.5) * w * cam.scale + driftX,
        y: cy + (ny - 0.5) * h * cam.scale + driftY,
      }
    }

    const drawPlate = (w, h, t, paint) => {
      const cam = cameraRef.current
      const cx = w / 2 + cam.x
      const cy = h / 2 + cam.y
      const glow = Math.min(0.28, totals.minutes / 1800)

      ctx.fillStyle = paint.galaxyBg
      ctx.fillRect(0, 0, w, h)

      const wash = ctx.createRadialGradient(cx, cy, 12, cx, cy, Math.max(w, h) * 0.62)
      wash.addColorStop(0, withAlpha(paint.sun, 0.08 + glow))
      wash.addColorStop(0.42, withAlpha(paint.cobalt, 0.05 + glow * 0.45))
      wash.addColorStop(1, 'transparent')
      ctx.fillStyle = wash
      ctx.fillRect(0, 0, w, h)

      ctx.save()
      ctx.translate(cx, cy)
      ctx.strokeStyle = paint.mapGuide
      ctx.lineWidth = 1
      const rings = 5 + Math.min(4, totals.categories)
      for (let i = 1; i <= rings; i += 1) {
        ctx.beginPath()
        ctx.ellipse(0, 0, (i / rings) * w * 0.42 * cam.scale, (i / rings) * h * 0.36 * cam.scale, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.moveTo(-w * 0.44 * cam.scale, 0)
      ctx.lineTo(w * 0.44 * cam.scale, 0)
      ctx.moveTo(0, -h * 0.38 * cam.scale)
      ctx.lineTo(0, h * 0.38 * cam.scale)
      ctx.strokeStyle = paint.mapGuideStrong
      ctx.stroke()
      ctx.restore()

      if (!reduced && totals.sessions > 0) {
        ctx.globalAlpha = 0.14
        const dustCount = Math.min(28, 6 + totals.sessions * 3)
        for (let i = 0; i < dustCount; i += 1) {
          const seed = hashSeed(`dust-${i}`)
          const x = ((seed * 0.9 + 0.05) * w + Math.sin(t * 0.0003 + i) * 8) % w
          const y = ((hashSeed(`dusty-${i}`) * 0.9 + 0.05) * h + Math.cos(t * 0.00025 + i) * 6) % h
          ctx.fillStyle = i % 3 === 0 ? paint.cobalt : paint.mapDust
          ctx.beginPath()
          ctx.arc(x, y, 0.7, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
      }
    }

    const drawGhosts = (w, h, t, paint) => {
      ctx.save()
      for (let i = 0; i < 10; i += 1) {
        const seed = hashSeed(`ghost-${i}`)
        const angle = seed * Math.PI * 2
        const radial = 0.16 + hashSeed(`ghost-r-${i}`) * 0.26
        const { x, y } = project(
          0.5 + Math.cos(angle) * radial,
          0.5 + Math.sin(angle) * radial * 0.78,
          t,
          w,
          h,
        )
        ctx.globalAlpha = 0.1 + seed * 0.08
        ctx.fillStyle = i % 2 === 0 ? paint.cobalt : paint.mapDust
        ctx.beginPath()
        ctx.arc(x, y, 1.6 + seed * 2.4, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    const drawStar = (ctx, x, y, r, color, hot, birthGlow, paint) => {
      ctx.beginPath()
      ctx.fillStyle = color
      ctx.globalAlpha = (hot ? 0.3 : 0.14) + birthGlow * 0.28
      ctx.arc(x, y, r * 2.35, 0, Math.PI * 2)
      ctx.fill()

      ctx.globalAlpha = 0.96
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()

      ctx.globalAlpha = 0.5 + birthGlow * 0.25
      ctx.fillStyle = paint.sun
      ctx.beginPath()
      ctx.arc(x - r * 0.22, y - r * 0.24, Math.max(1.1, r * 0.36), 0, Math.PI * 2)
      ctx.fill()

      ctx.globalAlpha = hot ? 0.55 : 0.22 + 0.2 * birthGlow
      ctx.beginPath()
      ctx.strokeStyle = color
      ctx.lineWidth = hot ? 1.4 : 1.1
      ctx.arc(x, y, r + 4.5, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    const draw = (t) => {
      if (!running) return
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      const paint = readThemePaint(wrap)
      ctx.clearRect(0, 0, w, h)
      drawPlate(w, h, t, paint)

      const { stars, links } = layoutRef.current
      const hoverIdx = hoverRef.current
      const selectedId = selectedRef.current
      const scale = Math.max(0.85, Math.min(w, h) / 640) * cameraRef.current.scale

      if (stars.length === 0) {
        drawGhosts(w, h, t, paint)
      }

      ctx.save()
      ctx.setLineDash([1.4, 5.2])
      ctx.lineCap = 'round'
      ctx.lineWidth = 0.85
      ctx.globalAlpha = 0.11
      const hiddenId = holdRef.current
      const birth = birthRef.current
      ;(links || []).forEach((link) => {
        const from = stars[link.a]
        const to = stars[link.b]
        if (!from || !to || from.category !== to.category) return
        if (from.id === hiddenId || to.id === hiddenId) return
        const a = project(from.nx, from.ny, t, w, h)
        const b = project(to.nx, to.ny, t, w, h)
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = link.color
        ctx.stroke()
      })
      ctx.restore()

      const lift = liftRef.current
      stars.forEach((star, index) => {
        if (star.id === hiddenId) return
        if (lift?.dragging && lift.id === star.id) return
        const { x, y } = project(star.nx, star.ny, t, w, h)
        const hot = index === hoverIdx || star.id === selectedId
        let birthScale = 1
        let birthGlow = 0
        if (birth.id === star.id && birth.start) {
          const u = Math.min(1, (t - birth.start) / 1000)
          const rise = u < 0.55 ? u / 0.55 : 1
          const settle = u < 0.55 ? 0 : (u - 0.55) / 0.45
          birthScale = 0.42 + rise * 0.76 - settle * 0.18
          birthGlow = u < 0.45 ? u / 0.45 : Math.max(0, 1 - (u - 0.45) / 0.55)
        }
        const r = (hot ? star.radius * 1.28 : star.radius) * scale * 0.58 * birthScale
        drawStar(ctx, x, y, r, star.color, hot, birthGlow, paint)
      })

      if (lift?.dragging && lift.star) {
        const star = lift.star
        const r = star.radius * scale * 0.64
        drawStar(ctx, lift.x, lift.y, r, star.color, true, 0.2, paint)
      }

      frame = requestAnimationFrame(draw)
    }

    const hitTest = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect()
      const x = clientX - rect.left
      const y = clientY - rect.top
      const w = rect.width
      const h = rect.height
      const t = performance.now()
      let found = -1
      let best = 22
      layoutRef.current.stars.forEach((star, index) => {
        const p = project(star.nx, star.ny, t, w, h)
        const d = Math.hypot(p.x - x, p.y - y)
        if (d < Math.max(best, star.radius + 14)) {
          best = d
          found = index
        }
      })
      return found
    }

    const overTrash = (clientX, clientY) => {
      const tray = trashRef.current
      if (!tray) return false
      const box = tray.getBoundingClientRect()
      return clientX >= box.left && clientX <= box.right && clientY >= box.top && clientY <= box.bottom
    }

    const onMove = (event) => {
      const lift = liftRef.current
      if (lift) {
        const rect = canvas.getBoundingClientRect()
        const dx = event.clientX - lift.startX
        const dy = event.clientY - lift.startY
        if (!lift.dragging && Math.hypot(dx, dy) > 7) {
          lift.dragging = true
          setSelected(null)
          setHover(null)
        }
        if (lift.dragging) {
          lift.x = event.clientX - rect.left
          lift.y = event.clientY - rect.top
          const armed = overTrash(event.clientX, event.clientY)
          lift.armed = armed
          setTrayArmed(armed)
          canvas.style.cursor = 'grabbing'
        }
        return
      }
      if (dragRef.current) {
        const dx = event.clientX - dragRef.current.x
        const dy = event.clientY - dragRef.current.y
        cameraRef.current.x = dragRef.current.cx + dx
        cameraRef.current.y = dragRef.current.cy + dy
        canvas.style.cursor = 'grabbing'
        return
      }
      const idx = hitTest(event.clientX, event.clientY)
      hoverRef.current = idx
      if (idx >= 0) {
        const star = layoutRef.current.stars[idx]
        const rect = canvas.getBoundingClientRect()
        const p = project(star.nx, star.ny, performance.now(), rect.width, rect.height)
        setHover({
          title: star.title,
          category: star.category,
          duration: star.duration,
          x: p.x,
          y: p.y,
        })
        canvas.style.cursor = 'grab'
      } else {
        setHover(null)
        canvas.style.cursor = expanded ? 'grab' : 'crosshair'
      }
    }

    const onLeave = () => {
      if (liftRef.current) return
      hoverRef.current = -1
      dragRef.current = null
      setHover(null)
    }

    const onDown = (event) => {
      event.preventDefault()
      if (document.activeElement === canvas) canvas.blur()
      if (pendingRef.current) return
      const idx = hitTest(event.clientX, event.clientY)
      if (idx >= 0) {
        const star = layoutRef.current.stars[idx]
        const rect = canvas.getBoundingClientRect()
        const p = project(star.nx, star.ny, performance.now(), rect.width, rect.height)
        liftRef.current = {
          id: star.id,
          star,
          startX: event.clientX,
          startY: event.clientY,
          x: p.x,
          y: p.y,
          dragging: false,
          armed: false,
        }
        canvas.setPointerCapture?.(event.pointerId)
        return
      }
      if (!expanded) return
      dragRef.current = {
        x: event.clientX,
        y: event.clientY,
        cx: cameraRef.current.x,
        cy: cameraRef.current.y,
      }
    }

    const onUp = (event) => {
      const lift = liftRef.current
      dragRef.current = null
      if (!lift) return
      liftRef.current = null
      setTrayArmed(false)
      if (lift.dragging) {
        skipClickRef.current = true
        if (overTrash(event.clientX, event.clientY)) {
          setPendingDelete(lift.star)
        }
      }
    }

    const onClick = (event) => {
      if (skipClickRef.current) {
        skipClickRef.current = false
        return
      }
      const idx = hitTest(event.clientX, event.clientY)
      if (idx < 0) {
        setSelected(null)
        return
      }
      const star = layoutRef.current.stars[idx]
      const rect = canvas.getBoundingClientRect()
      const p = project(star.nx, star.ny, performance.now(), rect.width, rect.height)
      setSelected({
        ...star,
        x: Math.min(p.x + 14, rect.width - 268),
        y: Math.min(p.y + 10, rect.height - 210),
      })
      setHint(false)
    }

    const onWheel = (event) => {
      if (!expanded) return
      event.preventDefault()
      const next = cameraRef.current.scale * (event.deltaY > 0 ? 0.92 : 1.08)
      cameraRef.current.scale = Math.min(3.4, Math.max(0.7, next))
    }

    resize()
    draw(0)
    const observer = new ResizeObserver(resize)
    observer.observe(wrap)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerleave', onLeave)
    canvas.addEventListener('pointerdown', onDown, { passive: false })
    window.addEventListener('pointerup', onUp)
    canvas.addEventListener('click', onClick)
    canvas.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      running = false
      cancelAnimationFrame(frame)
      observer.disconnect()
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('wheel', onWheel)
    }
  }, [expanded, totals.categories, totals.minutes])

  return (
    <div className={styles.slot}>
      {expanded && (
        <div className={styles.observatoryBar}>
          <p>{t('galaxy.observatory')}</p>
          <button type="button" onClick={onToggleExpand}>
            {t('galaxy.return')}
          </button>
        </div>
      )}
      <div className={styles.wrap} ref={wrapRef} data-expanded={expanded ? 'true' : 'false'}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          tabIndex={0}
          role="img"
          aria-label={t('galaxy.canvasLabel')}
        />
        {hint && records.length > 0 && (
          <p className={styles.hint}>
            {expanded ? t('galaxy.hintExpand') : t('galaxy.hintTray')}
          </p>
        )}
        {hover && !selected && (
          <div className={styles.float} style={{ left: hover.x, top: hover.y }} aria-hidden="true">
            {hover.category} · {hover.title} · {formatDuration(hover.duration)}
          </div>
        )}
        {selected && (
          <aside
            className={styles.card}
            style={{
              left: selected.x,
              top: selected.y,
              '--star-color': selected.color || colorForCategory(selected.category),
            }}
          >
            <p className={styles.kicker}>
              <span className={styles.swatch} aria-hidden="true" />
              {selected.category}
            </p>
            <h3>{selected.title}</h3>
            <dl className={styles.meta}>
              <div>
                <dt>{t('galaxy.fieldDuration')}</dt>
                <dd>{formatDuration(selected.duration)}</dd>
              </div>
              <div>
                <dt>{t('galaxy.fieldDate')}</dt>
                <dd>{selected.date}</dd>
              </div>
            </dl>
            {selected.notes ? (
              <p className={styles.notes}>
                <span>{t('galaxy.fieldNotes')}</span>
                {selected.notes}
              </p>
            ) : null}
            <button type="button" onClick={() => setSelected(null)}>
              {t('galaxy.close')}
            </button>
          </aside>
        )}
        {records.length > 0 ? (
          <div
            ref={trashRef}
            className={`${styles.tray} ${trayArmed ? styles.trayArmed : ''}`}
            aria-label={t('galaxy.tray')}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path
                d="M8 7V6.2C8 5.5 8.5 5 9.2 5h5.6C15.5 5 16 5.5 16 6.2V7M5 7h14M9 10.5v6M12 10.5v6M15 10.5v6M7.5 7l.6 11.2c.1.7.6 1.3 1.3 1.3h5.2c.7 0 1.2-.6 1.3-1.3L16.5 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
            <span>{trayArmed ? t('galaxy.release') : t('galaxy.remove')}</span>
          </div>
        ) : null}
        {pendingDelete ? (
          <div className={styles.confirm} role="alertdialog" aria-labelledby="delete-star-title">
            <div className={styles.confirmCard}>
              <p className={styles.kicker}>{t('galaxy.removeStar')}</p>
              <h3 id="delete-star-title">{t('galaxy.deleteStar')}</h3>
              <p>
                {t('galaxy.deleteStarBody', { title: pendingDelete.title })}
              </p>
              <div className={styles.confirmActions}>
                <button type="button" className={styles.ghost} onClick={() => setPendingDelete(null)}>
                  {t('galaxy.keep')}
                </button>
                <button
                  type="button"
                  className={styles.danger}
                  onClick={() => {
                    const id = pendingDelete.id
                    setPendingDelete(null)
                    setSelected(null)
                    onDeleteStar?.(id)
                  }}
                >
                  {t('galaxy.delete')}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
