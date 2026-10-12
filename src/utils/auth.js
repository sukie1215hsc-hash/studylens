import { isUsernameTaken } from '../lib/db/profiles'
import { supabase } from '../lib/supabase'

function isUsernameConflict(error) {
  const message = String(error?.message || '').toLowerCase()
  return (
    message.includes('username') &&
    (message.includes('taken') || message.includes('duplicate') || message.includes('unique') || message.includes('already'))
  ) || message.includes('profiles_username')
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function normalizeUsername(username) {
  return String(username || '').trim()
}

function toPublicUser(user) {
  if (!user) return null

  return {
    id: user.id,
    username: user.user_metadata?.username || '',
    email: user.email,
  }
}

export async function signup({ username, email, password }) {
  const name = normalizeUsername(username)
  const mail = normalizeEmail(email)
  const pass = String(password || '')

  if (name.length < 2) {
    return { ok: false, error: 'auth.usernameShort' }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
    return { ok: false, error: 'auth.emailInvalid' }
  }

  if (pass.length < 6) {
    return { ok: false, error: 'auth.passwordShort' }
  }

  const taken = await isUsernameTaken(name)
  if (!taken.ok) {
    return { ok: false, error: taken.error || 'auth.usernameTaken' }
  }
  if (taken.taken) {
    return { ok: false, error: 'auth.usernameTaken' }
  }

  const { data, error } = await supabase.auth.signUp({
    email: mail,
    password: pass,
    options: {
      data: {
        username: name,
      },
    },
  })


  if (error) {
    console.error(error)

    if (isUsernameConflict(error)) {
      return { ok: false, error: 'auth.usernameTaken' }
    }

    if (error.message.includes('already')) {
      return { ok: false, error: 'auth.emailTaken' }
    }

    return {
      ok: false,
      error: 'auth.failed',
    }
  }


  return {
    ok: true,
    user: toPublicUser(data.user),
  }
}


export async function login({ email, password }) {
  const mail = normalizeEmail(email)
  const pass = String(password || '')


  if (!mail || !pass) {
    return {
      ok: false,
      error: 'auth.needBoth',
    }
  }


  const { data, error } =
    await supabase.auth.signInWithPassword({
      email: mail,
      password: pass,
    })


  if (error) {
    console.error(error)

    return {
      ok: false,
      error: 'auth.passwordMismatch',
    }
  }


  return {
    ok: true,
    user: toPublicUser(data.user),
  }
}


export async function getSession() {
  const { data } = await supabase.auth.getSession()

  return toPublicUser(data.session?.user)
}

export function subscribeAuth(onUser) {
  const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
    onUser(toPublicUser(nextSession?.user))
  })

  return () => {
    data.subscription.unsubscribe()
  }
}

export async function logout() {
  await supabase.auth.signOut()
  return null
}


export function validateSignup({ username, email, password }) {
  const name = normalizeUsername(username)
  const mail = normalizeEmail(email)
  const pass = String(password || '')


  if (name.length < 2) return 'auth.usernameShort'

  if (name.length > 24) return 'auth.usernameLong'

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
    return 'auth.emailInvalid'
  }

  if (pass.length < 6) return 'auth.passwordShort'

  return ''
}