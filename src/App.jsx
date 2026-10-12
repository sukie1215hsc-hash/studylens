import { useCallback, useEffect, useRef, useState } from 'react'
import SkipLink from './components/SkipLink'
import Header from './components/Header'
import Hero from './components/Hero'
import Explanation from './components/Explanation'
import StarForm from './components/StarForm'
import MyGalaxy from './pages/MyGalaxy'
import DataLab from './pages/DataLab'
import Community from './pages/Community'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Account from './pages/Account'
import { rememberCategoryColors } from './lib/categories'
import { insertRecord, listRecords, removeRecord } from './lib/db/records'
import { loadRecords, addRecord as addRecordToStorage, deleteRecord } from './utils/localStorage'
import { markMissionStarred, clearMissionStarByStarId } from './utils/missions'
import {
  createCategory,
  deleteCategory,
  listCategories,
  loadLocalCategories,
  renameCategory,
} from './utils/userCategories'
import { getSession, logout as clearSession, subscribeAuth } from './utils/auth'
import { ensureAccountProfile } from './utils/community'
import { persistTheme, readStoredTheme } from './utils/theme'
import styles from './App.module.css'

export default function App() {
  const [starMission, setStarMission] = useState(null)
  const [records, setRecords] = useState([])
  const [categories, setCategories] = useState([])
  const [studyLoading, setStudyLoading] = useState(true)
  const [studyError, setStudyError] = useState('')
  const [currentPage, setCurrentPage] = useState('home')
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [theme, setTheme] = useState(() => readStoredTheme())
  const [afterAuthPage, setAfterAuthPage] = useState('community')
  const [resumePublish, setResumePublish] = useState(false)
  const [missionTick, setMissionTick] = useState(0)
  const [focusComposer, setFocusComposer] = useState(0)
  const guestStorageAllowed = useRef(true)

  const goToMissionCreation = useCallback(() => {
    setCurrentPage('galaxy')
    setFocusComposer((value) => value + 1)
  }, [])

  const [birth, setBirth] = useState(null)

  const handleCreateStar = useCallback((mission, origin) => {
    setStarMission({ ...mission, origin })
  }, [])

  const applyCategories = useCallback((list) => {
    const next = Array.isArray(list) ? list : []
    rememberCategoryColors(next.map((item) => [item.name, item.color]))
    setCategories(next)
    return next
  }, [])

  const handleSaveStar = useCallback(async (newRecord) => {
    const origin = starMission?.origin || null
    let saved = newRecord
    setStudyError('')

    if (session?.id) {
      const result = await insertRecord(session.id, newRecord)
      if (!result.ok) return result
      saved = result.record
      const listed = await listRecords(session.id)
      if (!listed.ok) return listed
      setRecords(listed.records)
    } else {
      guestStorageAllowed.current = true
      applyCategories(loadLocalCategories())
      setRecords(addRecordToStorage(newRecord))
    }

    markMissionStarred(saved.missionId, saved.id)
    setStarMission(null)
    setMissionTick((value) => value + 1)
    setCurrentPage('galaxy')
    setBirth({
      starId: saved.id,
      missionId: saved.missionId,
      category: saved.category,
      origin,
    })
    return { ok: true }
  }, [session, starMission])

  const handleNavigate = useCallback((pageId) => {
    if (pageId !== 'login' && pageId !== 'signup' && pageId !== 'galaxy') {
      setResumePublish(false)
    }
    if ((pageId === 'login' || pageId === 'signup') && session) {
      setCurrentPage(afterAuthPage === 'galaxy' ? 'galaxy' : afterAuthPage === 'account' ? 'account' : 'community')
      return
    }
    if (pageId === 'community' && !session) {
      if (authReady) {
        setAfterAuthPage('community')
        setCurrentPage('login')
      } else {
        setCurrentPage('community')
      }
      return
    }
    setCurrentPage(pageId)
  }, [afterAuthPage, authReady, session])

  const applyUser = useCallback(async (user) => {
    if (!user) {
      setSession(null)
      return null
    }
    let username = user.username
    try {
      const result = await ensureAccountProfile(user)
      if (result?.profile?.username) {
        username = result.profile.username
      }
    } catch (error) {
      console.error('Error ensuring profile:', error)
    }
    const next = { ...user, username }
    setSession(next)
    return next
  }, [])

  const handleAuthSuccess = useCallback(async (user) => {
    setRecords([])
    applyCategories([])
    setStudyError('')
    await applyUser(user)
    setCurrentPage(resumePublish ? 'galaxy' : afterAuthPage || 'community')
  }, [afterAuthPage, applyCategories, applyUser, resumePublish])

  const handlePublishAuth = useCallback((pageId) => {
    setResumePublish(true)
    setAfterAuthPage('galaxy')
    setCurrentPage(pageId === 'signup' ? 'signup' : 'login')
  }, [])

  const handleLogout = useCallback(() => {
    guestStorageAllowed.current = false
    clearSession()
    setSession(null)
    setRecords([])
    applyCategories([])
    setStudyError('')
    setResumePublish(false)
    setCurrentPage((page) =>
      page === 'community' || page === 'login' || page === 'signup' ? 'home' : page,
    )
  }, [applyCategories])

  const handleThemeChange = useCallback((next) => {
    setTheme(persistTheme(next))
  }, [])

  const handleFocusComposer = useCallback(() => {
    setFocusComposer((value) => value + 1)
  }, [])

  const handleBirthDone = useCallback(() => {
    setBirth(null)
  }, [])

  const handleDeleteStar = useCallback(async (starId) => {
    setStudyError('')
    if (session?.id) {
      const result = await removeRecord(session.id, starId)
      if (!result.ok) {
        setStudyError(result.error || 'study.deleteStar')
        return
      }
      const listed = await listRecords(session.id)
      if (!listed.ok) {
        setStudyError(listed.error || 'study.loadStars')
        return
      }
      setRecords(listed.records)
    } else {
      setRecords(deleteRecord(starId))
    }
    clearMissionStarByStarId(starId)
    setMissionTick((value) => value + 1)
    setBirth((current) => (current?.starId === starId ? null : current))
  }, [session])

  const handleAddCategory = useCallback(async (name) => {
    const result = await createCategory(session?.id, name)
    if (!result.ok) return result
    applyCategories(result.categories)
    return result
  }, [applyCategories, session])

  const handleRemoveCategory = useCallback(async (id) => {
    const result = await deleteCategory(session?.id, id)
    if (!result.ok) return result
    applyCategories(result.categories)
    return result
  }, [applyCategories, session])

  const handleRenameCategory = useCallback(async (id, name) => {
    const result = await renameCategory(session?.id, id, name)
    if (!result.ok) return result
    applyCategories(result.categories)
    if (Array.isArray(result.records)) setRecords(result.records)
    return result
  }, [applyCategories, session])

  useEffect(() => {
    let cancelled = false

    getSession()
      .then(async (user) => {
        if (cancelled) return
        await applyUser(user)
        if (!cancelled) setAuthReady(true)
      })
      .catch((error) => {
        console.error('Error loading session:', error)
        if (cancelled) return
        setSession(null)
        setAuthReady(true)
      })

    const unsubscribe = subscribeAuth((user) => {
      if (cancelled) return
      applyUser(user).then(() => {
        if (!cancelled) setAuthReady(true)
      })
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [applyUser])

  useEffect(() => {
    if (!authReady) return undefined
    let cancelled = false

    const syncStudyData = async () => {
      setStudyLoading(true)
      setStudyError('')
      try {
        if (!session?.id) {
          if (!guestStorageAllowed.current) {
            applyCategories([])
            setRecords([])
            return
          }
          applyCategories(loadLocalCategories())
          setRecords(loadRecords())
          return
        }

        setRecords([])
        applyCategories([])

        const [recordsResult, categoriesResult] = await Promise.all([
          listRecords(session.id),
          listCategories(session.id),
        ])
        if (cancelled) return
        if (!recordsResult.ok) {
          setStudyError(recordsResult.error || 'study.loadStars')
          setRecords([])
        } else {
          setRecords(recordsResult.records)
        }
        if (!categoriesResult.ok) {
          setStudyError(categoriesResult.error || 'study.loadCategories')
        } else {
          applyCategories(categoriesResult.categories)
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error syncing study data:', error)
          setStudyError(error.message || 'study.loadData')
        }
      } finally {
        if (!cancelled) setStudyLoading(false)
      }
    }

    syncStudyData()
    return () => {
      cancelled = true
    }
  }, [applyCategories, authReady, session?.id])

  useEffect(() => {
    if (!authReady) return
    if (currentPage === 'community' && !session) {
      setAfterAuthPage('community')
      setCurrentPage('login')
    }
  }, [authReady, currentPage, session])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [currentPage])

  return (
    <div className={styles.page} id="top">
      <SkipLink />
      <Header
        currentPage={currentPage}
        onNavigate={handleNavigate}
        theme={theme}
        onThemeChange={handleThemeChange}
      />
      <main>
        {currentPage === 'galaxy' ? (
          <MyGalaxy
            records={records}
            studyLoading={studyLoading}
            studyError={studyError}
            session={session}
            resumePublish={resumePublish}
            onResumePublishConsumed={() => setResumePublish(false)}
            onNeedAuth={handlePublishAuth}
            onViewCommunity={() => handleNavigate('community')}
            onCreateStar={handleCreateStar}
            onAddMission={handleFocusComposer}
            missionTick={missionTick}
            focusComposer={focusComposer}
            birth={birth}
            onBirthDone={handleBirthDone}
            onDeleteStar={handleDeleteStar}
          />
        ) : currentPage === 'lab' ? (
          <DataLab records={records} studyLoading={studyLoading} studyError={studyError} />
        ) : currentPage === 'community' ? (
          session ? (
            <Community
              categories={categories}
              session={session}
              onNeedAuth={() => {
                setAfterAuthPage('community')
                setCurrentPage('login')
              }}
            />
          ) : null
        ) : currentPage === 'account' ? (
          <Account
            session={session}
            onLogin={() => {
              setAfterAuthPage('account')
              setCurrentPage('login')
            }}
            onSignup={() => {
              setAfterAuthPage('account')
              setCurrentPage('signup')
            }}
            onLogout={handleLogout}
            onCommunity={() => handleNavigate('community')}
          />
        ) : currentPage === 'login' ? (
          <Login
            onSuccess={handleAuthSuccess}
            onGoSignup={() => setCurrentPage('signup')}
          />
        ) : currentPage === 'signup' ? (
          <Signup
            onSuccess={handleAuthSuccess}
            onGoLogin={() => setCurrentPage('login')}
          />
        ) : (
          <>
            <Hero onStart={goToMissionCreation} />
            <Explanation onStart={goToMissionCreation} onNavigate={handleNavigate} />
          </>
        )}
      </main>
      {starMission && (
        <StarForm
          mission={starMission}
          categories={categories}
          usedCategoryNames={records.map((record) => record.category)}
          session={session}
          hasRecords={records.length > 0}
          onCategoriesChange={(list) => applyCategories(Array.isArray(list) ? list : categories)}
          onAddCategory={handleAddCategory}
          onRemoveCategory={handleRemoveCategory}
          onRenameCategory={handleRenameCategory}
          onSave={handleSaveStar}
          onNeedAuth={(pageId) => {
            setAfterAuthPage('galaxy')
            setStarMission(null)
            setCurrentPage(pageId === 'signup' ? 'signup' : 'login')
          }}
          onClose={() => setStarMission(null)}
        />
      )}
    </div>
  )
}
