function mulberry32(seed) {
  return function next() {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const PALETTES = {
  record: ['#3a5ba0', '#4f6fb3', '#2e4a86', '#6d82c4'],
  grow: ['#3d8b7a', '#5aa394', '#9dbea8', '#2f6f62'],
  reflect: ['#8a7ca8', '#9b8db8', '#6f6388', '#c3b8d4'],
  spark: ['#e07a5f', '#e8c36a'],
}

const SAMPLE_DETAILS = [
  {
    kind: 'Study session',
    title: 'Organic chemistry review',
    note: 'Worked through reaction mechanisms for 48 minutes.',
    stamp: 'Demo · 12 Mar',
  },
  {
    kind: 'Completed task',
    title: 'Problem set 04',
    note: 'Finished twelve questions on linear independence.',
    stamp: 'Demo · 18 Mar',
  },
  {
    kind: 'Milestone',
    title: 'First full week mapped',
    note: 'Seven consecutive days of recorded effort.',
    stamp: 'Demo · 22 Mar',
  },
  {
    kind: 'Study session',
    title: 'French listening drills',
    note: 'Shadowed a short interview, then logged new phrases.',
    stamp: 'Demo · 02 Apr',
  },
  {
    kind: 'Completed task',
    title: 'Essay outline',
    note: 'Structured three arguments with source notes.',
    stamp: 'Demo · 09 Apr',
  },
  {
    kind: 'Reflection',
    title: 'What actually stuck',
    note: 'The map made a quiet week look denser than it felt.',
    stamp: 'Demo · 14 Apr',
  },
]

function gaussian(rand, mean, spread) {
  const u = Math.max(rand(), 1e-6)
  const v = Math.max(rand(), 1e-6)
  const mag = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  return mean + mag * spread
}

function makeCluster(rand, { cx, cy, count, spreadX, spreadY, palette, ring = 0 }) {
  const points = []
  for (let i = 0; i < count; i += 1) {
    let x = gaussian(rand, cx, spreadX)
    let y = gaussian(rand, cy, spreadY)
    if (ring) {
      const a = rand() * Math.PI * 2
      const r = ring * (0.65 + rand() * 0.5)
      x = cx + Math.cos(a) * r + (rand() - 0.5) * 0.04
      y = cy + Math.sin(a) * r * 0.72 + (rand() - 0.5) * 0.04
    }
    points.push({
      x: Math.min(0.97, Math.max(0.03, x)),
      y: Math.min(0.96, Math.max(0.06, y)),
      r: 1.8 + rand() * 2.4,
      color: palette[Math.floor(rand() * palette.length)],
      drift: rand() * Math.PI * 2,
      amp: 0.002 + rand() * 0.006,
      prominent: false,
    })
  }
  return points
}

export function createMapData(seed = 20261010) {
  const rand = mulberry32(seed)

  const points = [
    ...makeCluster(rand, {
      cx: 0.34,
      cy: 0.36,
      count: 92,
      spreadX: 0.085,
      spreadY: 0.09,
      palette: PALETTES.record,
    }),
    ...makeCluster(rand, {
      cx: 0.62,
      cy: 0.28,
      count: 70,
      spreadX: 0.07,
      spreadY: 0.075,
      palette: PALETTES.reflect,
    }),
    ...makeCluster(rand, {
      cx: 0.58,
      cy: 0.58,
      count: 84,
      spreadX: 0.09,
      spreadY: 0.08,
      palette: PALETTES.grow,
    }),
    ...makeCluster(rand, {
      cx: 0.28,
      cy: 0.62,
      count: 36,
      spreadX: 0.055,
      spreadY: 0.05,
      palette: PALETTES.record,
    }),
    ...makeCluster(rand, {
      cx: 0.74,
      cy: 0.48,
      count: 28,
      spreadX: 0.04,
      spreadY: 0.045,
      palette: PALETTES.spark,
      ring: 0.08,
    }),
  ]

  const sparse = 40
  for (let i = 0; i < sparse; i += 1) {
    points.push({
      x: 0.12 + rand() * 0.76,
      y: 0.16 + rand() * 0.7,
      r: 1.2 + rand() * 1.6,
      color: rand() > 0.5 ? PALETTES.record[3] : PALETTES.grow[2],
      drift: rand() * Math.PI * 2,
      amp: 0.0015 + rand() * 0.004,
      prominent: false,
    })
  }

  const hubIndexes = [12, 40, 88, 110, 155, 198, 240, 270]
  hubIndexes.forEach((idx, i) => {
    if (!points[idx]) return
    points[idx] = {
      ...points[idx],
      r: 7.2 + (i % 3) * 1.8,
      prominent: true,
      detail: SAMPLE_DETAILS[i % SAMPLE_DETAILS.length],
    }
  })

  const links = []
  const used = new Set()
  points.forEach((point, index) => {
    if (!point.prominent && rand() > 0.18) return
    let nearest = -1
    let best = 0.08
    points.forEach((other, j) => {
      if (j === index) return
      const dx = point.x - other.x
      const dy = point.y - other.y
      const d = Math.hypot(dx, dy)
      if (d < best) {
        best = d
        nearest = j
      }
    })
    if (nearest >= 0) {
      const key = index < nearest ? `${index}-${nearest}` : `${nearest}-${index}`
      if (!used.has(key)) {
        used.add(key)
        links.push({ a: index, b: nearest, alpha: 0.18 + rand() * 0.22 })
      }
    }
  })

  hubIndexes.forEach((idx, n) => {
    const next = hubIndexes[(n + 1) % hubIndexes.length]
    if (points[idx] && points[next]) {
      links.push({ a: idx, b: next, alpha: 0.28, spine: true })
    }
  })

  return { points, links }
}
