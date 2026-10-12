import {
  createProfile,
  createPublicAchievement,
  createPublicGalaxy,
  createUser,
  toFeedItem,
  toGalaxyCard,
} from './communityModel'

/**
 * Visual preview only. Not loaded as live Community data.
 */
const PREVIEW_PEOPLE = [
  {
    username: 'mina.reads',
    categories: ['Language', 'Humanities'],
    map: [
      { x: 0.32, y: 0.48, r: 5, category: 'Language' },
      { x: 0.4, y: 0.4, r: 4, category: 'Language' },
      { x: 0.46, y: 0.52, r: 6, category: 'Language' },
      { x: 0.62, y: 0.38, r: 5, category: 'Humanities' },
      { x: 0.7, y: 0.5, r: 4, category: 'Humanities' },
      { x: 0.58, y: 0.62, r: 3.5, category: 'Humanities' },
    ],
    stars: 12,
    hours: 18.4,
    achievements: [
      {
        title: 'Finished the second chapter of the novel in the original language',
        category: 'Language',
        hours: 1.5,
        reflection: 'The dialogue finally felt like speech, not homework.',
      },
    ],
  },
  {
    username: 'jun.lab',
    categories: ['Science', 'Math'],
    map: [
      { x: 0.3, y: 0.55, r: 6, category: 'Science' },
      { x: 0.38, y: 0.42, r: 4, category: 'Science' },
      { x: 0.5, y: 0.5, r: 5, category: 'Math' },
      { x: 0.62, y: 0.36, r: 4.5, category: 'Math' },
      { x: 0.68, y: 0.58, r: 5, category: 'Science' },
    ],
    stars: 9,
    hours: 14.2,
    achievements: [
      {
        title: 'Worked through the optics problem set without looking at solutions first',
        category: 'Science',
        hours: 2.0,
        reflection: '',
      },
    ],
  },
  {
    username: 'ariel.night',
    categories: ['Skills', 'Language'],
    map: [
      { x: 0.28, y: 0.46, r: 4, category: 'Skills' },
      { x: 0.36, y: 0.6, r: 5, category: 'Skills' },
      { x: 0.48, y: 0.4, r: 6, category: 'Language' },
      { x: 0.56, y: 0.54, r: 4, category: 'Language' },
      { x: 0.64, y: 0.34, r: 5, category: 'Skills' },
      { x: 0.72, y: 0.52, r: 4.5, category: 'Language' },
      { x: 0.44, y: 0.68, r: 3.5, category: 'Skills' },
    ],
    stars: 21,
    hours: 31.6,
    achievements: [
      {
        title: 'Practiced scales slowly for forty minutes',
        category: 'Skills',
        hours: 0.7,
        reflection: 'Quieter hands. Fewer rushed notes.',
      },
    ],
  },
  {
    username: 'noah.quiet',
    categories: ['Humanities'],
    map: [
      { x: 0.42, y: 0.46, r: 5, category: 'Humanities' },
      { x: 0.52, y: 0.4, r: 4, category: 'Humanities' },
      { x: 0.58, y: 0.56, r: 6, category: 'Humanities' },
      { x: 0.38, y: 0.6, r: 3.5, category: 'Humanities' },
    ],
    stars: 6,
    hours: 8.1,
    achievements: [
      {
        title: 'Outlined the essay on memory and place',
        category: 'Humanities',
        hours: 1.2,
        reflection: 'The structure is still loose, but the question is clearer.',
      },
    ],
  },
]

function previewBundle() {
  const galaxies = []
  const feed = []
  PREVIEW_PEOPLE.forEach((person, index) => {
    const user = createUser({ id: `preview-user-${index}` })
    const profile = createProfile(user, {
      username: person.username,
      galaxyPublic: true,
    })
    const galaxy = createPublicGalaxy(profile, {
      map: person.map,
      categories: person.categories,
      stars: Array.from({ length: person.stars }, (_, starIndex) => ({
        id: `${profile.id}-star-${starIndex}`,
        category: person.categories[starIndex % person.categories.length],
        duration: (person.hours * 60) / person.stars,
      })),
    })
    galaxy.stats.hours = person.hours
    galaxy.stats.starCount = person.stars
    galaxies.push(toGalaxyCard(profile, galaxy))
    person.achievements.forEach((item) => {
      feed.push(toFeedItem(createPublicAchievement(profile, item)))
    })
  })
  return { galaxies, feed }
}

export const COMMUNITY_PREVIEW = previewBundle()
