import { useState, useEffect, useRef } from 'react'
import homeVideo from '../../video/home.mp4'
import { articlesData } from './data/articles'
import { supabase } from './lib/supabase'

// In production on Vercel, use same-origin proxy rewrite via vercel.json to completely eliminate CORS preflight issues
const API_BASE_URL = import.meta.env.DEV ? (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '') : ''

const COMMUNITY_GENRES = [
  'Fiction & Drama',
  'Self-Help & Personal Growth',
  'Philosophy & Spirituality',
  'Mystery & Thriller',
  'Sci-Fi & Fantasy',
  'Romance & Relationships',
  'Biography & Memoir',
  'Business, Finance & Tech',
  'History, Politics & Society',
  'Poetry & Essays',
  'Other'
]

const READING_ROOM_CATEGORIES = [
  'Book Reflections & Reviews',
  'Reading Habits & Psychology',
  'Author Deep Dives & Stories',
  'Books That Changed My Life',
  'The Reading Life & Philosophy',
  'Curated Lists & Reading Guides',
  'Science, Mind & Wellness',
  'Ideas, Society & Culture'
]

const getCommentThreads = (comments = []) => {
  const topLevel = []
  const repliesByParent = {}

  if (!Array.isArray(comments)) return { topLevel, repliesByParent }

  const commentIds = new Set(comments.filter(Boolean).map((c) => c.id))

  comments.forEach((c) => {
    if (!c) return
    let parentId = c.reply_to_id

    // If parent was deleted or doesn't exist, show as top-level
    if (parentId && !commentIds.has(parentId)) {
      parentId = null
    }

    const cText = c.text || c.content || ''
    // Fallback: If no explicit reply_to_id, but text starts with @Name
    if (!parentId && typeof cText === 'string' && cText.startsWith('@')) {
      const match = cText.match(/^@([a-zA-Z\s]+?)\s/)
      if (match) {
        const mentionedName = match[1].trim().toLowerCase()
        const parent = comments.find((p) => {
          if (!p || p.id === c.id) return false
          const pName = (p.author_name || p.author || '').toLowerCase()
          return pName && pName.includes(mentionedName)
        })
        if (parent) {
          parentId = parent.id
        }
      }
    }

    if (parentId) {
      if (!repliesByParent[parentId]) repliesByParent[parentId] = []
      repliesByParent[parentId].push(c)
    } else {
      topLevel.push(c)
    }
  })

  return { topLevel, repliesByParent }
}

const CommunityBookCover = ({ cover, title, author, genre }) => {
  const [resolvedCover, setResolvedCover] = useState(cover)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    // If the cover was erroneously mapped to Mel Robbins' "The Let Them Theory" cover (id 15152033) for a different book
    const isCorruptedCover = cover === 'https://covers.openlibrary.org/b/id/15152033-M.jpg' && !title?.toLowerCase().includes('let them')

    if (cover && !isCorruptedCover) {
      setResolvedCover(cover)
      setImgError(false)
      return
    }

    // Auto-fetch real cover if missing or corrupted
    let active = true
    const fetchRealCover = async () => {
      const cleanTitle = (title || '').trim()
      const cleanAuthor = author && author !== 'Unknown Author' ? author.trim() : ''
      const q = encodeURIComponent(`${cleanTitle} ${cleanAuthor}`.trim())

      try {
        const olRes = await fetch(`https://openlibrary.org/search.json?q=${q}&limit=1`)
        if (olRes.ok) {
          const olData = await olRes.json()
          const coverId = olData?.docs?.[0]?.cover_i
          if (coverId && active) {
            setResolvedCover(`https://covers.openlibrary.org/b/id/${coverId}-M.jpg`)
            setImgError(false)
            return
          }
        }
      } catch { }

      try {
        const gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1`)
        if (gbRes.ok) {
          const gbData = await gbRes.json()
          const thumb = gbData?.items?.[0]?.volumeInfo?.imageLinks?.thumbnail ||
                        gbData?.items?.[0]?.volumeInfo?.imageLinks?.smallThumbnail || null
          if (thumb && active) {
            setResolvedCover(thumb.replace(/^http:\/\//i, 'https://'))
            setImgError(false)
            return
          }
        }
      } catch { }

      if (active) {
        setResolvedCover(null)
      }
    }

    fetchRealCover()
    return () => { active = false }
  }, [cover, title, author])

  const getCoverBg = (g) => {
    if (!g) return 'linear-gradient(135deg, #1b3226 0%, #0d1e16 100%)'
    const lower = g.toLowerCase()
    if (lower.includes('drama') || lower.includes('fiction')) return 'linear-gradient(135deg, #2d3e50 0%, #1a2634 100%)'
    if (lower.includes('self-help') || lower.includes('growth')) return 'linear-gradient(135deg, #8c532b 0%, #542e12 100%)'
    if (lower.includes('philosophy') || lower.includes('spirituality')) return 'linear-gradient(135deg, #233d34 0%, #12211b 100%)'
    if (lower.includes('sci-fi') || lower.includes('fantasy')) return 'linear-gradient(135deg, #37284f 0%, #1f1530 100%)'
    if (lower.includes('romance')) return 'linear-gradient(135deg, #6b283d 0%, #3e1220 100%)'
    if (lower.includes('thriller') || lower.includes('mystery')) return 'linear-gradient(135deg, #2a2a2a 0%, #111111 100%)'
    return 'linear-gradient(135deg, #1b3226 0%, #0d1e16 100%)'
  }

  const showFallback = !resolvedCover || imgError

  return (
    <div className="community-cover-spine-wrap">
      <div className="community-cover-3d">
        {!showFallback ? (
          <img
            src={resolvedCover}
            alt={title}
            onError={() => setImgError(true)}
            className="community-cover-img"
          />
        ) : (
          <div
            className="community-cover-hardcover-fallback"
            style={{ background: getCoverBg(genre) }}
          >
            <div className="community-cover-emboss-border">
              <span className="community-cover-emblem">✦</span>
              <div className="community-cover-fallback-title">
                {title}
              </div>
              <div className="community-cover-fallback-author">
                {author}
              </div>
            </div>
          </div>
        )}
        <div className="community-cover-spine-crease" />
      </div>
    </div>
  )
}

const FEMALE_AVATAR_SRC = '/Avatar/female_profile.png?v=3'
const MALE_AVATAR_SRC = '/Avatar/male_profile.png?v=3'

const INITIAL_COMMUNITY_POSTS = [
  {
    id: 'post-1',
    book_title: "The Let Them Theory",
    book_author: 'Mel Robbins',
    book_cover: 'https://covers.openlibrary.org/b/id/15152033-M.jpg',
    genre: 'Self-Help & Personal Growth',
    why_loved: "A deeply liberating reminder that so much of our daily anxiety comes from trying to manage how other people perceive, react, or behave towards us. Two simple words — 'Let Them' — give you permission to stop over-explaining yourself, release the need for control you never had, and reclaim all your energy back for your own peace and growth.",
    favorite_quote: 'Let them judge. Let them react. Let them doubt you. Let them be wrong about you. Your peace does not depend on their decision.',
    author_name: 'Simran Chaudhary',
    author_role: 'Your Fellow Reader',
    avatar: FEMALE_AVATAR_SRC,
    date: '',
    likes: 0,
    user_liked: false,
    liked_by: [],
    comments: []
  }
]

function App() {
  const [query, setQuery] = useState('')
  const [topK, setTopK] = useState(5)
  const [rerank, setRerank] = useState(true)
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [latency, setLatency] = useState(null)
  const [backendOnline, setBackendOnline] = useState(false)

  // 1. My Reading Shelf (LocalStorage Persistence)
  const [savedBooks, setSavedBooks] = useState(() => {
    try {
      const local = localStorage.getItem('shelfknows_saved_books')
      return local ? JSON.parse(local) : []
    } catch {
      return []
    }
  })
  const [showShelfModal, setShowShelfModal] = useState(false)
  // Auth & Profile State (Supabase)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)

  // ShelfKnows Creator / Admin privileges (Simran Chaudhary / Admin role)
  const isCreatorOrAdmin = Boolean(
    profile?.role === 'admin' ||
    profile?.role === 'creator' ||
    user?.email?.toLowerCase().includes('simran') ||
    profile?.full_name?.toLowerCase().includes('simran') ||
    user?.user_metadata?.full_name?.toLowerCase().includes('simran')
  )
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState('signin') // 'signin' or 'signup'
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authFullName, setAuthFullName] = useState('')
  const [authHeadline, setAuthHeadline] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState(null)
  const [authSuccessMsg, setAuthSuccessMsg] = useState(null)
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false)
  const [resetPasswordError, setResetPasswordError] = useState(null)
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState(false)
  const [knownEmails, setKnownEmails] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('shelfknows_known_emails') || '[]')
      return Array.isArray(stored) ? stored : []
    } catch {
      return []
    }
  })

  const addKnownEmail = (email) => {
    if (!email) return
    const emailLower = email.trim().toLowerCase()
    setKnownEmails((prev) => {
      if (prev.includes(emailLower)) return prev
      const updated = [...prev, emailLower]
      try { localStorage.setItem('shelfknows_known_emails', JSON.stringify(updated)) } catch { }
      return updated
    })
  }
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showEditProfileModal, setShowEditProfileModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [editGender, setEditGender] = useState('female')
  const [editHeadline, setEditHeadline] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const profileDropdownRef = useRef(null)
  const [userAvatar, setUserAvatar] = useState(() => {
    try {
      return localStorage.getItem('shelfknows_avatar_gender') || 'female'
    } catch {
      return 'female'
    }
  })
  const [authGender, setAuthGender] = useState('female')
  const currentAvatarSrc = userAvatar === 'male' ? MALE_AVATAR_SRC : FEMALE_AVATAR_SRC

  // 1b. Reader Profile & Sanctum State
  const [profileActiveTab, setProfileActiveTab] = useState('shelf') // 'shelf' | 'writing' | 'quotes'
  const [shelfFilter, setShelfFilter] = useState('all') // 'all' | 'saved' | 'reading' | 'finished'

  const [shelfBooksStatus, setShelfBooksStatus] = useState(() => {
    try {
      const local = localStorage.getItem('shelfknows_shelf_books_status')
      return local ? JSON.parse(local) : {}
    } catch {
      return {}
    }
  })
  const [openStatusMenuBook, setOpenStatusMenuBook] = useState(null)

  useEffect(() => {
    try {
      localStorage.setItem('shelfknows_shelf_books_status', JSON.stringify(shelfBooksStatus))
    } catch (e) {
      console.error(e)
    }
  }, [shelfBooksStatus])

  const setBookShelfStatus = (bookTitle, status) => {
    setShelfBooksStatus((prev) => ({
      ...prev,
      [bookTitle]: status
    }))
  }

  // User Articles / Essays
  const [userArticles, setUserArticles] = useState(() => {
    try {
      const local = localStorage.getItem('shelfknows_user_articles_v2')
      if (local) {
        return JSON.parse(local)
      }
      return []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('shelfknows_user_articles_v2', JSON.stringify(userArticles))
    } catch (e) {
      console.error(e)
    }
  }, [userArticles])

  // Reading Room Articles (persisted in localStorage or fallback to default articlesData)
  const [readingRoomArticles, setReadingRoomArticles] = useState(() => {
    try {
      const local = localStorage.getItem('shelfknows_reading_room_articles_v3')
      if (local) {
        const parsed = JSON.parse(local)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      }
      return articlesData
    } catch {
      return articlesData
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('shelfknows_reading_room_articles_v3', JSON.stringify(readingRoomArticles))
    } catch (e) {
      console.error(e)
    }
  }, [readingRoomArticles])

  // Reading Room Essay Share State & Handlers
  const [showShareEssayForm, setShowShareEssayForm] = useState(false)
  const [essayUrl, setEssayUrl] = useState('')
  const [essayPlatform, setEssayPlatform] = useState('Substack')
  const [essayCategory, setEssayCategory] = useState('')
  const [essayTitle, setEssayTitle] = useState('')
  const [essayTeaser, setEssayTeaser] = useState('')
  const [essayCoverImage, setEssayCoverImage] = useState('')
  const [essayAuthor, setEssayAuthor] = useState('')
  const [isFetchingPreview, setIsFetchingPreview] = useState(false)
  const [previewFetchStatus, setPreviewFetchStatus] = useState(null)
  const [previewErrorMsg, setPreviewErrorMsg] = useState('')
  const [relevanceWarning, setRelevanceWarning] = useState('')

  const fetchArticleMetadata = async (targetUrl) => {
    if (!targetUrl || !targetUrl.trim()) return
    let cleanUrl = targetUrl.trim()
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl
    }

    const lower = cleanUrl.toLowerCase()
    let detectedPlatform = 'Substack'
    if (lower.includes('medium.com')) {
      detectedPlatform = 'Medium'
    } else if (lower.includes('linkedin.com')) {
      detectedPlatform = 'LinkedIn'
    } else if (lower.includes('substack.com')) {
      detectedPlatform = 'Substack'
    }
    setEssayPlatform(detectedPlatform)

    setIsFetchingPreview(true)
    setPreviewFetchStatus(null)
    setPreviewErrorMsg('')
    setRelevanceWarning('')

    try {
      const apiEndpoint = API_BASE_URL
        ? `${API_BASE_URL}/api/articles/preview?url=${encodeURIComponent(cleanUrl)}`
        : `/api/articles/preview?url=${encodeURIComponent(cleanUrl)}`

      let fetchedData = null
      try {
        const res = await fetch(apiEndpoint)
        if (res.ok) {
          const data = await res.json()
          if (data && data.success && (data.title || data.image || data.description)) {
            fetchedData = data
          }
        }
      } catch (err) {
        console.warn('Backend preview API unreachable, trying client fallback...', err)
      }

      if (!fetchedData) {
        try {
          const microRes = await fetch(`https://api.microlink.io?url=${encodeURIComponent(cleanUrl)}`)
          if (microRes.ok) {
            const microJson = await microRes.json()
            if (microJson && microJson.status === 'success' && microJson.data) {
              const d = microJson.data
              fetchedData = {
                title: d.title || '',
                description: d.description || '',
                image: d.image?.url || d.logo?.url || '',
                author: d.author || '',
                platform: detectedPlatform
              }
            }
          }
        } catch (microErr) {
          console.warn('Microlink fallback error:', microErr)
        }
      }

      if (fetchedData) {
        if (fetchedData.title) setEssayTitle(fetchedData.title)
        if (fetchedData.description) setEssayTeaser(fetchedData.description)
        if (fetchedData.image) setEssayCoverImage(fetchedData.image)
        if (fetchedData.platform) setEssayPlatform(fetchedData.platform)
        if (fetchedData.author && !essayAuthor) {
          setEssayAuthor(fetchedData.author)
        }
        setPreviewFetchStatus('success')

        // Smart Literary Relevance Check
        const textToCheck = `${fetchedData.title || ''} ${fetchedData.description || ''} ${cleanUrl}`.toLowerCase()
        const spamKeywords = [
          'crypto', 'bitcoin', 'blockchain', 'solana', 'ethereum', 'forex', 'web3', 'nft',
          'reactjs', 'kubernetes', 'docker container', 'python tutorial', 'machine learning model',
          'affiliate marketing', 'dropshipping', 'day trading', 'b2b sales', 'seo ranking'
        ]
        const foundSpam = spamKeywords.find((kw) => textToCheck.includes(kw))
        if (foundSpam) {
          setRelevanceWarning(`This essay appears to mention "${foundSpam}". A gentle reminder: The Reading Room is a quiet sanctuary exclusively for books, literature, reading habits, and personal reflections.`)
        } else {
          setRelevanceWarning('')
        }
      } else {
        setPreviewFetchStatus('fallback')
      }
    } catch (e) {
      console.error('Error fetching preview:', e)
      setPreviewFetchStatus('error')
      setPreviewErrorMsg('Could not auto-fetch metadata. Please fill in the details below.')
    } finally {
      setIsFetchingPreview(false)
    }
  }

  const handlePublishReadingRoomEssay = (e) => {
    e.preventDefault()
    if (!essayUrl.trim()) return
    if (!essayCategory) {
      alert('Please select a literary category / shelf for your essay.')
      return
    }

    let finalUrl = essayUrl.trim()
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl
    }

    let finalTitle = essayTitle.trim()
    if (!finalTitle) {
      if (finalUrl.includes('/p/')) {
        const slug = finalUrl.split('/p/')[1].split('?')[0].replace(/[-_]/g, ' ')
        finalTitle = slug.charAt(0).toUpperCase() + slug.slice(1)
      } else {
        finalTitle = 'Book Essay & Reflections'
      }
    }

    const authorDisplayName = essayAuthor.trim() || profile?.full_name || user?.user_metadata?.full_name || 'Simran Chaudhary'
    const newId = `essay-${Date.now()}`

    const newArticle = {
      id: newId,
      title: finalTitle,
      url: finalUrl,
      platform: essayPlatform || 'Substack',
      category: essayCategory || 'Book Reflections & Reviews',
      coverImage: essayCoverImage.trim() || '/articles/article1.jpeg',
      teaser: essayTeaser.trim() || `A thoughtful essay shared by ${authorDisplayName} on ${essayPlatform || 'Substack'}.`,
      author: authorDisplayName,
      avatar: currentAvatarSrc,
      gender: userAvatar,
      date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      author_id: user?.id || null
    }

    setReadingRoomArticles((prev) => [newArticle, ...prev])

    // Sync to user profile articles
    const userArt = {
      id: newId,
      title: newArticle.title,
      url: newArticle.url,
      platform: newArticle.platform,
      category: newArticle.category,
      coverImage: newArticle.coverImage,
      date: newArticle.date
    }
    setUserArticles((prev) => [userArt, ...prev.filter((a) => a.id !== newId)])

    // Reset form
    setEssayUrl('')
    setEssayTitle('')
    setEssayTeaser('')
    setEssayCoverImage('')
    setEssayAuthor('')
    setEssayPlatform('Substack')
    setEssayCategory('')
    setPreviewFetchStatus(null)
    setRelevanceWarning('')
    setShowShareEssayForm(false)
  }

  const handleDeleteReadingRoomArticle = (id) => {
    setReadingRoomArticles((prev) => prev.filter((a) => a.id !== id))
    setUserArticles((prev) => prev.filter((a) => a.id !== id))
  }

  const [showAddArticleForm, setShowAddArticleForm] = useState(false)
  const [newArticleTitle, setNewArticleTitle] = useState('')
  const [newArticleUrl, setNewArticleUrl] = useState('')
  const [newArticlePlatform, setNewArticlePlatform] = useState('Substack')

  const handleAddArticle = (e) => {
    e.preventDefault()
    if (!newArticleTitle.trim() || !newArticleUrl.trim()) return
    let finalUrl = newArticleUrl.trim()
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl
    }
    const newId = `art-${Date.now()}`
    const authorDisplayName = profile?.full_name || user?.user_metadata?.full_name || 'Simran Chaudhary'
    const newArt = {
      id: newId,
      title: newArticleTitle.trim(),
      url: finalUrl,
      platform: newArticlePlatform || 'Substack',
      date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }
    setUserArticles((prev) => [newArt, ...prev])

    // Also share to Reading Room
    const readingRoomArt = {
      id: newId,
      title: newArt.title,
      url: newArt.url,
      platform: newArt.platform,
      category: 'READER PSYCHOLOGY & HABITS',
      coverImage: '/articles/article1.jpeg',
      teaser: 'An essay shared by ' + authorDisplayName,
      author: authorDisplayName,
      avatar: currentAvatarSrc,
      gender: userAvatar,
      date: newArt.date,
      author_id: user?.id || null
    }
    setReadingRoomArticles((prev) => [readingRoomArt, ...prev.filter((a) => a.id !== newId)])

    setNewArticleTitle('')
    setNewArticleUrl('')
    setNewArticlePlatform('Substack')
    setShowAddArticleForm(false)
  }

  const handleDeleteArticle = (id) => {
    setUserArticles((prev) => prev.filter((a) => a.id !== id))
    setReadingRoomArticles((prev) => prev.filter((a) => a.id !== id))
  }

  // User Quotes (Shelf Passages)
  const [userQuotes, setUserQuotes] = useState(() => {
    try {
      const local = localStorage.getItem('shelfknows_user_quotes')
      return local ? JSON.parse(local) : [
        {
          id: 'quote-sample-1',
          quote: "A reader lives a thousand lives before he dies. The man who never reads lives only one.",
          author: "George R.R. Martin",
          book: "A Dance with Dragons",
          date: "Nov 2026"
        }
      ]
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('shelfknows_user_quotes', JSON.stringify(userQuotes))
    } catch (e) {
      console.error(e)
    }
  }, [userQuotes])

  const [showAddQuoteForm, setShowAddQuoteForm] = useState(false)
  const [newQuoteText, setNewQuoteText] = useState('')
  const [newQuoteAuthor, setNewQuoteAuthor] = useState('')
  const [newQuoteBook, setNewQuoteBook] = useState('')

  const handleAddQuote = (e) => {
    e.preventDefault()
    if (!newQuoteText.trim()) return
    const newQ = {
      id: `quote-${Date.now()}`,
      quote: newQuoteText.trim(),
      author: newQuoteAuthor.trim() || 'Unknown Author',
      book: newQuoteBook.trim() || '',
      date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }
    setUserQuotes((prev) => [newQ, ...prev])
    setNewQuoteText('')
    setNewQuoteAuthor('')
    setNewQuoteBook('')
    setShowAddQuoteForm(false)
  }

  const handleDeleteQuote = (id) => {
    setUserQuotes((prev) => prev.filter((q) => q.id !== id))
  }

  // 2. The Reader Community State & Discussions
  const [communityPosts, setCommunityPosts] = useState(() => {
    try {
      const local = localStorage.getItem('shelfknows_community_posts_v9')
      if (local) {
        const parsed = JSON.parse(local)
        if (Array.isArray(parsed)) {
          const resolveAvatar = (av, name, gender) => {
            if (av && typeof av === 'string') {
              if (av.includes('female')) return FEMALE_AVATAR_SRC
              if (av.includes('male')) return MALE_AVATAR_SRC
              if (av.startsWith('http') || av.startsWith('/')) return av
            }
            if (gender === 'male') return MALE_AVATAR_SRC
            if (gender === 'female') return FEMALE_AVATAR_SRC
            const aName = (name || '').toLowerCase()
            const maleList = [
              'kabir', 'rohan', 'aditya', 'devansh', 'arjun', 'karan', 'rahul', 'vikram',
              'naveen', 'deepak', 'varun', 'amit', 'raj', 'aman', 'ayush', 'yash', 'siddharth',
              'mohit', 'matt', 'james', 'marcus', 'satoshi', 'toshikazu'
            ]
            for (const m of maleList) {
              if (aName.includes(m)) return MALE_AVATAR_SRC
            }
            return FEMALE_AVATAR_SRC
          }

          return parsed.map((p, idx) => {
            const initialMatch = INITIAL_COMMUNITY_POSTS.find((ip) => ip.id === p.id)
            if (initialMatch) {
              const authorName = p.author_name || initialMatch.author_name || 'Reader'
              const authorGender = p.gender || initialMatch.gender || null
              return {
                ...initialMatch,
                ...p,
                book_title: initialMatch.book_title,
                book_author: initialMatch.book_author,
                book_cover: initialMatch.book_cover,
                why_loved: initialMatch.why_loved,
                favorite_quote: initialMatch.favorite_quote,
                genre: initialMatch.genre,
                author_role: 'Your Fellow Reader',
                date: '',
                avatar: resolveAvatar(initialMatch.avatar || p.avatar, authorName, authorGender),
                gender: authorGender || 'female',
                liked_by: Array.isArray(p.liked_by) ? p.liked_by : (initialMatch.liked_by || []),
                comments: Array.isArray(p.comments) ? p.comments : (initialMatch.comments || [])
              }
            }

            const authorName = p.author_name || 'Reader'
            const authorGender = p.gender || null
            const isCorruptedCover = p.book_cover === 'https://covers.openlibrary.org/b/id/15152033-M.jpg' && !p.book_title?.toLowerCase().includes('let them')

            return {
              ...p,
              book_cover: isCorruptedCover ? null : p.book_cover,
              avatar: resolveAvatar(p.avatar, authorName, authorGender),
              liked_by: Array.isArray(p.liked_by) ? p.liked_by : [],
              comments: Array.isArray(p.comments) ? p.comments : []
            }
          })
        }
      }
      return INITIAL_COMMUNITY_POSTS
    } catch {
      return INITIAL_COMMUNITY_POSTS
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('shelfknows_community_posts_v9', JSON.stringify(communityPosts))
    } catch (e) {
      console.error(e)
    }
  }, [communityPosts])

  const [showCommunityForm, setShowCommunityForm] = useState(false)
  const [commBookTitle, setCommBookTitle] = useState('')
  const [commBookAuthor, setCommBookAuthor] = useState('')
  const [commGenre, setCommGenre] = useState('')
  const [commWhyLoved, setCommWhyLoved] = useState('')
  const [commQuote, setCommQuote] = useState('')
  const [commAuthorName, setCommAuthorName] = useState('')
  const [commAuthorRole, setCommAuthorRole] = useState('')
  const [commentInputs, setCommentInputs] = useState({})
  const [commenterNameInputs, setCommenterNameInputs] = useState({})
  const [openComments, setOpenComments] = useState({})
  const [replyingTo, setReplyingTo] = useState({})
  const [showLikesModal, setShowLikesModal] = useState(null)
  const [communityGenreFilter, setCommunityGenreFilter] = useState('all') // 'all' | genre name

  const filteredCommunityPosts = communityGenreFilter === 'all'
    ? communityPosts
    : communityPosts.filter((p) => (p.genre || 'Other') === communityGenreFilter)

  // Track community recommendations authored in this browser session
  const [myCommunityPostIds, setMyCommunityPostIds] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('shelfknows_my_community_post_ids') || '[]')
      return Array.isArray(stored) ? stored : []
    } catch {
      return []
    }
  })

  const handleCreateCommunityPost = async (e) => {
    e.preventDefault()
    if (!commBookTitle.trim() || !commWhyLoved.trim()) return

    const authorDisplayName = commAuthorName.trim() || (user ? (profile?.full_name || user?.user_metadata?.full_name || 'Reader') : 'Fellow Reader')
    const activeAvatar = userAvatar === 'male' ? MALE_AVATAR_SRC : FEMALE_AVATAR_SRC
    const titleVal = commBookTitle.trim()
    const authorVal = commBookAuthor.trim() || 'Unknown Author'

    let coverUrl = null
    const cleanTitle = titleVal.trim()
    const cleanAuthor = authorVal !== 'Unknown Author' ? authorVal.trim() : ''
    const searchQ = encodeURIComponent(`${cleanTitle} ${cleanAuthor}`.trim())

    // 1. Try Open Library for authentic book cover
    try {
      const olRes = await fetch(`https://openlibrary.org/search.json?q=${searchQ}&limit=1`)
      if (olRes.ok) {
        const olData = await olRes.json()
        const coverId = olData?.docs?.[0]?.cover_i
        if (coverId) {
          coverUrl = `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
        }
      }
    } catch { }

    // 2. Fallback to Google Books
    if (!coverUrl) {
      try {
        const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${searchQ}&maxResults=1`)
        if (res.ok) {
          const data = await res.json()
          const thumb = data?.items?.[0]?.volumeInfo?.imageLinks?.thumbnail ||
                        data?.items?.[0]?.volumeInfo?.imageLinks?.smallThumbnail || null
          if (thumb) {
            coverUrl = thumb.replace(/^http:\/\//i, 'https://')
          }
        }
      } catch { }
    }

    const authorHeadline = commAuthorRole.trim() || profile?.headline || user?.user_metadata?.headline || 'Reader'

    const newPost = {
      id: `post-${Date.now()}`,
      author_id: user?.id || null,
      book_title: titleVal,
      book_author: authorVal,
      book_cover: coverUrl,
      genre: commGenre.trim() || 'Other',
      why_loved: commWhyLoved.trim(),
      favorite_quote: commQuote.trim() || '',
      author_name: authorDisplayName,
      author_role: authorHeadline,
      avatar: activeAvatar,
      gender: userAvatar,
      date: 'Just now',
      likes: 0,
      user_liked: false,
      liked_by: [],
      comments: []
    }

    setCommunityPosts((prev) => [newPost, ...prev])
    setMyCommunityPostIds((prev) => {
      const updated = [newPost.id, ...prev]
      try {
        localStorage.setItem('shelfknows_my_community_post_ids', JSON.stringify(updated))
      } catch { }
      return updated
    })

    setCommBookTitle('')
    setCommBookAuthor('')
    setCommGenre('')
    setCommWhyLoved('')
    setCommQuote('')
    setCommAuthorName('')
    setCommAuthorRole('')
    setShowCommunityForm(false)
  }

  const handleDeleteCommunityPost = (postId) => {
    setCommunityPosts((prev) => prev.filter((p) => p.id !== postId))
    setMyCommunityPostIds((prev) => {
      const updated = prev.filter((id) => id !== postId)
      try {
        localStorage.setItem('shelfknows_my_community_post_ids', JSON.stringify(updated))
      } catch { }
      return updated
    })
  }

  const canManageCommunityPost = (post) => {
    if (!post) return false
    // ShelfKnows Creator / Admin has master permission to delete any recommendation
    if (isCreatorOrAdmin) return true

    const activeName = (profile?.full_name || user?.user_metadata?.full_name || (user ? 'Reader' : 'Simran Chaudhary')).trim().toLowerCase()
    const activeId = user?.id || null
    const postAuthor = (post.author_name || '').trim().toLowerCase()
    const isLocalPost = myCommunityPostIds.includes(post.id)
    const isOwnPost = (activeId && post.author_id && post.author_id === activeId) ||
      (activeName && postAuthor && activeName === postAuthor) ||
      isLocalPost
    return Boolean(isOwnPost)
  }

  const handleToggleLike = (postId) => {
    const activeName = (profile?.full_name || user?.user_metadata?.full_name || (user ? 'Reader' : 'Simran Chaudhary')).trim()
    const activeAvatar = userAvatar === 'male' ? MALE_AVATAR_SRC : FEMALE_AVATAR_SRC

    setCommunityPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const isLiked = p.user_liked
          let newLikedBy = Array.isArray(p.liked_by) ? [...p.liked_by] : []

          if (isLiked) {
            newLikedBy = newLikedBy.filter((u) => u.name?.toLowerCase() !== activeName.toLowerCase())
          } else {
            newLikedBy = [{ name: activeName, role: 'Fellow Reader', avatar: activeAvatar }, ...newLikedBy]
          }

          const updatedPost = {
            ...p,
            user_liked: !isLiked,
            likes: newLikedBy.length,
            liked_by: newLikedBy
          }

          setShowLikesModal((curr) => (curr && curr.id === postId ? updatedPost : curr))

          return updatedPost
        }
        return p
      })
    )
  }

  const handleToggleComments = (postId) => {
    setOpenComments((prev) => ({
      ...prev,
      [postId]: !prev[postId]
    }))
  }

  const getAuthorAvatar = (name, explicitAvatar, explicitGender) => {
    const aName = (name || '').trim().toLowerCase()
    const activeName = (profile?.full_name || user?.user_metadata?.full_name || (user ? 'Reader' : 'Simran Chaudhary')).trim().toLowerCase()
    if (aName === activeName || aName === 'you' || aName === 'reader' || (aName.includes('simran') && activeName.includes('simran'))) {
      return userAvatar === 'male' ? MALE_AVATAR_SRC : FEMALE_AVATAR_SRC
    }

    if (explicitAvatar && typeof explicitAvatar === 'string') {
      if (explicitAvatar.includes('female')) return FEMALE_AVATAR_SRC
      if (explicitAvatar.includes('male')) return MALE_AVATAR_SRC
      if (explicitAvatar.startsWith('http') || explicitAvatar.startsWith('/')) return explicitAvatar
    }
    if (explicitGender === 'male') return MALE_AVATAR_SRC
    if (explicitGender === 'female') return FEMALE_AVATAR_SRC

    const maleList = [
      'kabir', 'rohan', 'aditya', 'devansh', 'arjun', 'karan', 'rahul', 'vikram',
      'naveen', 'deepak', 'varun', 'amit', 'raj', 'aman', 'ayush', 'yash', 'siddharth',
      'mohit', 'matt', 'james', 'marcus', 'satoshi', 'toshikazu'
    ]
    for (const m of maleList) {
      if (aName.includes(m)) return MALE_AVATAR_SRC
    }
    return FEMALE_AVATAR_SRC
  }

  const getCommentAvatar = (comment) => {
    return getAuthorAvatar(comment?.author_name || comment?.author, comment?.avatar, comment?.gender)
  }

  const getAuthorHeadline = (authorName, articleRole) => {
    const aName = (authorName || '').trim().toLowerCase()
    const activeName = (profile?.full_name || user?.user_metadata?.full_name || (user ? 'Reader' : 'Simran Chaudhary')).trim().toLowerCase()
    if (aName === activeName || aName === 'you' || aName === 'reader' || (aName.includes('simran') && activeName.includes('simran'))) {
      const userHl = profile?.headline || user?.user_metadata?.headline
      if (userHl && userHl.trim() && userHl.trim() !== 'Reader & Story Explorer') {
        return userHl.trim()
      }
      return articleRole || 'Your Fellow Reader'
    }
    return articleRole || 'Your Fellow Reader'
  }

  const handleAddComment = (postId, e) => {
    e.preventDefault()
    const text = (commentInputs[postId] || '').trim()
    if (!text) return

    const commenterName = user ? (profile?.full_name || 'Simran Chaudhary') : 'Simran Chaudhary'
    const parentReply = replyingTo[postId]
    const activeCommenterAvatar = userAvatar === 'male' ? MALE_AVATAR_SRC : FEMALE_AVATAR_SRC

    const newComment = {
      id: `c-${Date.now()}`,
      author_id: user?.id || null,
      author_name: commenterName,
      avatar: activeCommenterAvatar,
      gender: userAvatar,
      text,
      date: 'Just now',
      reply_to_id: parentReply?.id || null,
      reply_to_name: parentReply?.name || null
    }

    setCommunityPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            comments: [...(p.comments || []), newComment]
          }
        }
        return p
      })
    )

    setCommentInputs((prev) => ({ ...prev, [postId]: '' }))
    setReplyingTo((prev) => ({ ...prev, [postId]: null }))
  }

  const canDeleteComment = (post, comment) => {
    if (!post || !comment) return false
    // ShelfKnows Creator / Admin can moderate and delete any negative or spam comment
    if (isCreatorOrAdmin) return true

    const activeName = (profile?.full_name || user?.user_metadata?.full_name || (user ? 'Reader' : 'Simran Chaudhary')).trim().toLowerCase()
    const activeId = user?.id || null

    const commentAuthor = (comment.author_name || comment.author || '').trim().toLowerCase()
    const postAuthor = (post.author_name || '').trim().toLowerCase()

    // 1. Is it the user's own comment?
    const isOwnComment = (activeId && comment.author_id && comment.author_id === activeId) ||
      (activeName && commentAuthor && activeName === commentAuthor)

    // 2. Is it a comment on the user's own post?
    const isOwnPost = (activeId && post.author_id && post.author_id === activeId) ||
      (activeName && postAuthor && activeName === postAuthor)

    return Boolean(isOwnComment || isOwnPost)
  }

  const handleDeleteComment = (postId, commentId) => {
    const post = communityPosts.find((p) => p.id === postId)
    if (!post) return

    const targetComment = (post.comments || []).find((c) => c && c.id === commentId)
    if (!targetComment) return

    // Enforce permission: User can only delete their own comment OR any comment on their own post
    if (!canDeleteComment(post, targetComment)) {
      alert("You only have permission to delete your own comments or comments made on your recommendations.")
      return
    }

    setCommunityPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            comments: (p.comments || []).filter((c) => c && c.id !== commentId && c.reply_to_id !== commentId)
          }
        }
        return p
      })
    )
    setReplyingTo((prev) => (prev[postId]?.id === commentId ? { ...prev, [postId]: null } : prev))
  }

  // 3. Full Page Routing & Modals
  const getPageFromHash = () => {
    const hash = window.location.hash.replace('#/', '').replace('#', '').toLowerCase()
    if (hash === 'architecture') return 'about'
    if (hash.startsWith('articles') || hash.startsWith('reading-room')) return 'articles'
    if (hash === 'community' || hash === 'share-a-book' || hash === 'share-book' || hash === 'recommend') return 'community'
    if (['authors', 'articles', 'reading-room', 'about', 'profile', 'community'].includes(hash)) {
      return hash === 'reading-room' ? 'articles' : hash
    }
    return 'home'
  }

  const getInitialArticleId = () => {
    const rawHash = window.location.hash.replace('#/', '').replace('#', '')
    if (rawHash.toLowerCase().startsWith('articles/') || rawHash.toLowerCase().startsWith('reading-room/')) {
      const parts = rawHash.split('/')
      if (parts[1]) return parts[1]
    }
    try {
      return sessionStorage.getItem('shelfknows_active_article_id') || null
    } catch {
      return null
    }
  }

  const [currentPage, setCurrentPage] = useState(getPageFromHash)
  const [selectedArticleId, setSelectedArticleId] = useState(getInitialArticleId)

  // Derives from readingRoomArticles and articlesData
  const selectedArticle = selectedArticleId
    ? (readingRoomArticles.find((a) => a.id === selectedArticleId || (selectedArticleId === 'ghost-on-your-bookshelf' && a.id === 'unread-bookshelf'))
       || articlesData.find((a) => a.id === selectedArticleId || (selectedArticleId === 'ghost-on-your-bookshelf' && a.id === 'unread-bookshelf'))
       || null)
    : null

  const handleOpenArticle = (article) => {
    setSelectedArticleId(article.id)
    try {
      sessionStorage.setItem('shelfknows_active_article_id', article.id)
    } catch { }
    window.location.hash = `#/reading-room/${article.id}`
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCloseArticle = () => {
    setSelectedArticleId(null)
    try {
      sessionStorage.removeItem('shelfknows_active_article_id')
    } catch { }
    window.location.hash = '#/reading-room'
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const navigateTo = (page) => {
    setCurrentPage(page)
    if (page === 'articles') {
      setSelectedArticleId(null)
      try {
        sessionStorage.removeItem('shelfknows_active_article_id')
      } catch { }
    }
    const hashPath = page === 'home'
      ? '#/'
      : (page === 'articles'
        ? '#/reading-room'
        : `#/${page}`)
    window.location.hash = hashPath
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    const handleHashChange = () => {
      const p = getPageFromHash()
      setCurrentPage(p)
      const rawHash = window.location.hash.replace('#/', '').replace('#', '')
      if (rawHash.toLowerCase().startsWith('articles/') || rawHash.toLowerCase().startsWith('reading-room/')) {
        const id = rawHash.split('/')[1]
        if (id) {
          setSelectedArticleId(id)
          try {
            sessionStorage.setItem('shelfknows_active_article_id', id)
          } catch { }
        }
      } else if (rawHash.toLowerCase() === 'articles' || rawHash.toLowerCase() === 'reading-room') {
        setSelectedArticleId(null)
        try {
          sessionStorage.removeItem('shelfknows_active_article_id')
        } catch { }
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const [selectedBook, setSelectedBook] = useState(null)

  // About ShelfKnows FAQ accordion state
  const [openArchFaq, setOpenArchFaq] = useState(null)
  const toggleArchFaq = (idx) => {
    setOpenArchFaq((prev) => (prev === idx ? null : idx))
  }

  // 3. Authors Showcase & Catalog State
  const [popularAuthors, setPopularAuthors] = useState([])
  const [loadingAuthors, setLoadingAuthors] = useState(false)
  const [authorSearchQuery, setAuthorSearchQuery] = useState('')
  const [selectedAuthor, setSelectedAuthor] = useState(null)
  const [authorBooks, setAuthorBooks] = useState([])
  const [loadingAuthorBooks, setLoadingAuthorBooks] = useState(false)
  const [authorCurrentPage, setAuthorCurrentPage] = useState(1)
  const AUTHOR_BOOKS_PER_PAGE = 5

  const getAuthorPageNumbers = () => {
    const totalPages = Math.ceil(authorBooks.length / AUTHOR_BOOKS_PER_PAGE)
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    if (authorCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages]
    }
    if (authorCurrentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    }
    return [1, '...', authorCurrentPage - 1, authorCurrentPage, authorCurrentPage + 1, '...', totalPages]
  }

  const [authorsCatalogCurrentPage, setAuthorsCatalogCurrentPage] = useState(1)
  const AUTHORS_PER_PAGE = 8

  const getAuthorsCatalogPageNumbers = () => {
    const totalPages = Math.ceil(popularAuthors.length / AUTHORS_PER_PAGE)
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    if (authorsCatalogCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages]
    }
    if (authorsCatalogCurrentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    }
    return [1, '...', authorsCatalogCurrentPage - 1, authorsCatalogCurrentPage, authorsCatalogCurrentPage + 1, '...', totalPages]
  }

  const [expandedBoxes, setExpandedBoxes] = useState({})

  const toggleBoxExpand = (boxKey) => {
    setExpandedBoxes((prev) => ({
      ...prev,
      [boxKey]: !prev[boxKey]
    }))
  }

  const samplePrompts = [
    "high-stakes survival games and rebellion",
    "philosophical space exploration",
    "magical academy and dark secrets",
    "cozy mystery in a quiet coastal town"
  ]

  const staticBestsellers = [
    {
      title: "Atomic Habits",
      authors: "James Clear",
      average_rating: 4.38,
      image_url: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1655988385i/40121378.jpg",
      description: "An immensely practical guide on how small, incremental daily changes compound into massive, life-altering transformations. Clear unpacks the psychology of cues, cravings, responses, and rewards to make good habits inevitable and bad habits impossible."
    },
    {
      title: "The Hunger Games",
      authors: "Suzanne Collins",
      average_rating: 4.32,
      image_url: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1586722975i/2767052.jpg",
      description: "In a dystopian post-apocalyptic future, sixteen-year-old Katniss Everdeen volunteers to take her younger sister's place in the Capitol's brutal annual televised fight to the death known as the Hunger Games."
    },
    {
      title: "Dune",
      authors: "Frank Herbert",
      average_rating: 4.26,
      image_url: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1555447414i/44767458.jpg",
      description: "Set on the harsh desert planet Arrakis, Dune tells the story of young Paul Atreides as his noble family inherits stewardship of the galaxy's sole source of the universe's most coveted substance: the spice melange."
    },
    {
      title: "The Midnight Library",
      authors: "Matt Haig",
      average_rating: 4.18,
      image_url: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1602190253i/52578297.jpg",
      description: "Between life and death there is an infinite library where every book offers a chance to experience another life you might have lived, allowing Nora Seed to undo past regrets and explore parallel paths."
    }
  ]

  // Curated Literary Thoughts for Book Lovers
  const literaryQuotes = [
    {
      quote: "A reader lives a thousand lives before he dies. The man who never reads lives only one.",
      author: "George R.R. Martin"
    },
    {
      quote: "If you don’t like to read, you haven’t found the right book yet.",
      author: "J.K. Rowling"
    },
    {
      quote: "We read books to find out who we are.",
      author: "Ursula K. Le Guin"
    },
    {
      quote: "That is part of the beauty of all literature. You discover that your longings are universal longings, that you're not alone. You belong.",
      author: "F. Scott Fitzgerald"
    },
    {
      quote: "Reading gives us somewhere to go when we have to stay where we are.",
      author: "Mason Cooley"
    },
    {
      quote: "If there’s a book that you want to read, but it hasn’t been written yet, then you must write it.",
      author: "Toni Morrison"
    },
    {
      quote: "Think before you speak. Read before you think.",
      author: "Fran Lebowitz"
    }
  ]

  const [activeQuoteIdx, setActiveQuoteIdx] = useState(0)
  const [quoteFading, setQuoteFading] = useState(false)

  // Auto-rotate literary thoughts every 10s (comfortable reading duration)
  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteFading(true)
      setTimeout(() => {
        setActiveQuoteIdx((prev) => (prev + 1) % literaryQuotes.length)
        setQuoteFading(false)
      }, 350)
    }, 10000)
    return () => clearInterval(timer)
  }, [literaryQuotes.length])

  const handleNextQuote = () => {
    setQuoteFading(true)
    setTimeout(() => {
      setActiveQuoteIdx((prev) => (prev + 1) % literaryQuotes.length)
      setQuoteFading(false)
    }, 280)
  }

  const handlePrevQuote = () => {
    setQuoteFading(true)
    setTimeout(() => {
      setActiveQuoteIdx((prev) => (prev - 1 + literaryQuotes.length) % literaryQuotes.length)
      setQuoteFading(false)
    }, 280)
  }

  // Check backend health on initial load
  useEffect(() => {
    checkHealth()
  }, [])

  // Sync saved books with browser localStorage
  useEffect(() => {
    try {
      localStorage.setItem('shelfknows_saved_books', JSON.stringify(savedBooks))
    } catch (err) {
      console.error("Failed to save to localStorage", err)
    }
  }, [savedBooks])

  // ================= SUPABASE AUTH & CLOUD SYNC =================
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (!error && data) {
        setProfile(data)
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
    }
  }

  const fetchUserSavedBooks = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_saved_books')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (!error && data) {
        const mapped = data.map((b) => ({
          book_id: b.book_id,
          title: b.title,
          authors: b.authors,
          genres: b.genres,
          average_rating: b.average_rating,
          description: b.description,
          image_url: b.image_url
        }))
        setSavedBooks(mapped)
        localStorage.setItem('shelfknows_saved_books', JSON.stringify(mapped))
      }
    } catch (err) {
      console.error('Error fetching saved books:', err)
    }
  }

  const handleAvatarChange = async (gender) => {
    setUserAvatar(gender)
    try {
      localStorage.setItem('shelfknows_avatar_gender', gender)
    } catch { }
    if (user) {
      try {
        await supabase.auth.updateUser({
          data: { avatar_gender: gender }
        })
      } catch (err) {
        console.warn('Could not update avatar in cloud:', err)
      }
    }
  }

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault()
    setEditLoading(true)
    try {
      const cleanName = editName.trim() || 'Reader'
      const cleanHeadline = editHeadline.trim() || 'Reader'

      // 1. Update Supabase Auth user_metadata
      if (user) {
        try {
          const { data: authData } = await supabase.auth.updateUser({
            data: {
              full_name: cleanName,
              headline: cleanHeadline,
              avatar_gender: editGender
            }
          })
          if (authData?.user) {
            setUser(authData.user)
          }
        } catch (authErr) {
          console.warn('Could not update Supabase auth metadata:', authErr)
        }
      }

      // 2. Update Avatar state and localStorage
      setUserAvatar(editGender)
      try {
        localStorage.setItem('shelfknows_avatar_gender', editGender)
      } catch { }

      // 3. Update profiles table if available
      if (user?.id) {
        try {
          await supabase
            .from('profiles')
            .update({
              full_name: cleanName,
              headline: cleanHeadline,
              bio: editBio
            })
            .eq('id', user.id)
        } catch (dbErr) {
          console.warn('Profiles table sync:', dbErr)
        }
      }

      setProfile(prev => ({
        ...(prev || {}),
        full_name: cleanName,
        headline: cleanHeadline,
        bio: editBio
      }))

      setShowEditProfileModal(false)
    } catch (err) {
      console.error('Failed to update profile:', err)
    } finally {
      setEditLoading(false)
    }
  }

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash ? window.location.hash.replace(/^#/, '') : '')

    const tokenHash = searchParams.get('token_hash') || hashParams.get('token_hash')
    const type = searchParams.get('type') || hashParams.get('type')
    const code = searchParams.get('code') || hashParams.get('code')
    const errorDesc = searchParams.get('error_description') || hashParams.get('error_description')
    const errorCode = searchParams.get('error_code') || hashParams.get('error_code')

    // 1. If link has expired or error occurred
    if (errorDesc || errorCode) {
      const friendlyMsg = errorDesc
        ? decodeURIComponent(errorDesc.replace(/\+/g, ' '))
        : 'This reset link has expired or was already used. Please request a new link.'
      setAuthError(friendlyMsg)
      setAuthMode('forgot')
      setShowAuthModal(true)
      try {
        window.history.replaceState({}, document.title, window.location.pathname)
      } catch { }
      return
    }

    // 2. If token_hash is present (Supabase verifyOtp flow)
    if (tokenHash && (type === 'recovery' || type === 'email_change' || !type)) {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: type || 'recovery' }).then(({ data, error }) => {
        if (!error && data?.session) {
          setUser(data.session.user)
          setShowResetPasswordModal(true)
          try {
            window.history.replaceState({}, document.title, window.location.pathname)
          } catch { }
        } else if (error) {
          setAuthError(error.message || 'Reset link expired. Please request a new one.')
          setAuthMode('forgot')
          setShowAuthModal(true)
        }
      })
      return
    }

    // 3. If PKCE authorization code is present
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (!error && data?.session) {
          setUser(data.session.user)
          setShowResetPasswordModal(true)
          try {
            window.history.replaceState({}, document.title, window.location.pathname)
          } catch { }
        } else if (error) {
          supabase.auth.getSession().then(({ data: sessData }) => {
            if (sessData?.session) {
              setShowResetPasswordModal(true)
            } else {
              setAuthError(error.message || 'Reset link expired. Please request a new one.')
              setAuthMode('forgot')
              setShowAuthModal(true)
            }
          })
        }
      })
      return
    }

    // 4. If hash has recovery or access_token
    const rawHash = window.location.hash || ''
    if (rawHash.includes('type=recovery') || rawHash.includes('access_token')) {
      setShowResetPasswordModal(true)
    }

    // 5. Existing active session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        if (session.user.email) {
          addKnownEmail(session.user.email)
        }
        const metaGender = session.user.user_metadata?.avatar_gender
        if (metaGender) {
          setUserAvatar(metaGender)
          try { localStorage.setItem('shelfknows_avatar_gender', metaGender) } catch { }
        }
        fetchProfile(session.user.id)
        fetchUserSavedBooks(session.user.id)

        // Check AMR for recovery session
        const isRecoveryAmr = session.user.amr?.some((item) => item.method === 'recovery')
        if (isRecoveryAmr) {
          setShowResetPasswordModal(true)
        }
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const isRecoveryAmr = session?.user?.amr?.some((item) => item.method === 'recovery')
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && isRecoveryAmr)) {
        setShowResetPasswordModal(true)
      }
      if (session?.user) {
        setUser(session.user)
        if (session.user.email) {
          addKnownEmail(session.user.email)
        }
        const metaGender = session.user.user_metadata?.avatar_gender
        if (metaGender) {
          setUserAvatar(metaGender)
          try { localStorage.setItem('shelfknows_avatar_gender', metaGender) } catch { }
        }
        fetchProfile(session.user.id)
        fetchUserSavedBooks(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    const handleClickOutside = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false)
      }
      if (!e.target.closest || !e.target.closest('.profile-status-dropdown-wrap')) {
        setOpenStatusMenuBook(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSavedBooks([])
    try {
      localStorage.removeItem('shelfknows_saved_books')
    } catch { }
    setProfileDropdownOpen(false)
  }

  // ==============================================================
  const handleSignIn = async (e) => {
    if (e) e.preventDefault()
    setAuthLoading(true)
    setAuthError(null)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword
      })
      if (error) throw error
      addKnownEmail(authEmail)
      setShowAuthModal(false)
      setAuthEmail('')
      setAuthPassword('')
    } catch (err) {
      const msg = err.message || ''
      if (msg.toLowerCase().includes('credential') || msg.toLowerCase().includes('invalid')) {
        setAuthError('No account found with this email, or incorrect password.')
      } else {
        setAuthError(msg || 'Failed to sign in. Please try again.')
      }
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSignUp = async (e) => {
    if (e) e.preventDefault()
    setAuthLoading(true)
    setAuthError(null)
    setAuthSuccessMsg(null)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
        options: {
          data: {
            full_name: authFullName || 'Reader',
            headline: authHeadline.trim() || 'Reader',
            avatar_gender: authGender
          }
        }
      })
      if (error) throw error
      addKnownEmail(authEmail)
      setUserAvatar(authGender)
      try { localStorage.setItem('shelfknows_avatar_gender', authGender) } catch { }
      if (data?.session) {
        setShowAuthModal(false)
        setAuthEmail('')
        setAuthPassword('')
        setAuthFullName('')
        setAuthHeadline('')
      } else {
        setAuthSuccessMsg('Account created successfully! You can now sign in.')
      }
    } catch (err) {
      const msg = err.message || ''
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists') || err.code === 'user_already_exists') {
        addKnownEmail(authEmail)
        setAuthError('User already registered')
      } else {
        setAuthError(msg || 'Failed to create account.')
      }
    } finally {
      setAuthLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    if (e) e.preventDefault()
    if (!authEmail.trim()) {
      setAuthError('Please enter your registered email address.')
      return
    }
    setAuthLoading(true)
    setAuthError(null)
    setAuthSuccessMsg(null)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(authEmail.trim(), {
        redirectTo: window.location.origin
      })
      if (error) throw error
      setAuthSuccessMsg(`Password reset link sent to ${authEmail.trim()}! Please check your email inbox (and spam folder).`)
    } catch (err) {
      setAuthError(err.message || 'Failed to send password reset link. Please try again.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleUpdatePassword = async (e) => {
    if (e) e.preventDefault()
    if (newPassword.length < 6) {
      setResetPasswordError('Password must be at least 6 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setResetPasswordError('Passwords do not match. Please re-enter.')
      return
    }
    setResetPasswordLoading(true)
    setResetPasswordError(null)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setResetPasswordSuccess(true)
      try {
        window.history.replaceState({}, document.title, window.location.pathname)
      } catch { }
      setTimeout(() => {
        setShowResetPasswordModal(false)
        setResetPasswordSuccess(false)
        setNewPassword('')
        setConfirmPassword('')
      }, 2500)
    } catch (err) {
      setResetPasswordError(err.message || 'Failed to update password. Please try again.')
    } finally {
      setResetPasswordLoading(false)
    }
  }

  const checkHealth = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/health`)
      if (res.ok) {
        const data = await res.json()
        setBackendOnline(data.models_loaded)
      } else {
        setBackendOnline(false)
      }
    } catch {
      setBackendOnline(false)
    }
  }

  // Authors Showcase Data Fetching
  const fetchPopularAuthors = async (q = '') => {
    setLoadingAuthors(true)
    try {
      const url = q.trim()
        ? `${API_BASE_URL}/api/authors/popular?q=${encodeURIComponent(q.trim())}&limit=80`
        : `${API_BASE_URL}/api/authors/popular?limit=80`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setPopularAuthors(data.authors || [])
        setAuthorsCatalogCurrentPage(1)
      }
    } catch (err) {
      console.error("Failed to fetch authors:", err)
    } finally {
      setLoadingAuthors(false)
    }
  }

  const handleSelectAuthor = async (authorName) => {
    setSelectedAuthor(authorName)
    setAuthorCurrentPage(1)
    setLoadingAuthorBooks(true)
    setAuthorBooks([])
    try {
      const res = await fetch(`${API_BASE_URL}/api/authors/books?author=${encodeURIComponent(authorName)}&limit=60`)
      if (res.ok) {
        const data = await res.json()
        const sortedAuthorBooks = (data.books || []).slice().sort((a, b) => {
          return (Number(b.average_rating) || 0) - (Number(a.average_rating) || 0)
        })
        setAuthorBooks(sortedAuthorBooks)
      }
    } catch (err) {
      console.error("Failed to fetch author books:", err)
    } finally {
      setLoadingAuthorBooks(false)
    }
  }

  const getAuthorInitials = (name) => {
    if (!name) return 'A'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const renderFormattedText = (text) => {
    if (!text) return ''
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: 'var(--forest-deep)', fontWeight: 700 }}>{part.slice(2, -2)}</strong>
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i}>{part.slice(1, -1)}</em>
      }
      return part
    })
  }

  // Load popular authors whenever Authors page opens
  useEffect(() => {
    if (currentPage === 'authors' && popularAuthors.length === 0) {
      fetchPopularAuthors()
    }
  }, [currentPage])

  // Live search debounced when typing author name on Authors page
  useEffect(() => {
    if (currentPage !== 'authors') return
    const timer = setTimeout(() => {
      fetchPopularAuthors(authorSearchQuery)
    }, 280)
    return () => clearTimeout(timer)
  }, [authorSearchQuery, currentPage])

  const handleSearch = async (searchQuery = query) => {
    const trimmed = searchQuery.trim()
    if (!trimmed) return

    if (currentPage !== 'home') {
      navigateTo('home')
    }

    setLoading(true)
    setError(null)

    // Smooth scroll down to recommendations
    setTimeout(() => {
      const el = document.getElementById('curated-results-shelf')
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }, 100)

    try {
      const response = await fetch(`${API_BASE_URL}/api/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: trimmed,
          top_k: Number(topK),
          rerank: rerank
        })
      })

      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`)
      }

      const data = await response.json()
      const sortedRecommendations = (data.recommendations || []).slice().sort((a, b) => {
        return (Number(b.average_rating) || 0) - (Number(a.average_rating) || 0)
      })
      setBooks(sortedRecommendations)
      setLatency(data.latency_ms)
    } catch (err) {
      setError("Unable to connect to ShelfKnows AI Engine. Please check your connection or try again in a moment.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const onChipClick = (sample) => {
    setQuery(sample)
    handleSearch(sample)
  }

  const toggleSaveBook = async (book, e) => {
    if (e) e.stopPropagation()

    // 1. If user is not logged in, prompt sign in modal
    if (!user) {
      setAuthMode('signin')
      setAuthError('Please sign in or create an account to save books to your personal shelf.')
      setShowAuthModal(true)
      return
    }

    const exists = savedBooks.some((b) => b.title === book.title)

    if (exists) {
      // Instant optimistic UI update
      setSavedBooks((prev) => prev.filter((b) => b.title !== book.title))
      try {
        await supabase
          .from('user_saved_books')
          .delete()
          .eq('user_id', user.id)
          .eq('title', book.title)
      } catch (err) {
        console.error('Failed to remove book from Supabase:', err)
      }
    } else {
      // Instant optimistic UI update
      setSavedBooks((prev) => [...prev, book])
      try {
        await supabase.from('user_saved_books').insert([
          {
            user_id: user.id,
            book_id: String(book.book_id || book.id || book.title),
            title: book.title,
            authors: book.authors || 'Unknown Author',
            genres: book.genres || '',
            average_rating: book.average_rating ? Number(book.average_rating) : 4.0,
            description: book.description || '',
            image_url: book.image_url || ''
          }
        ])
      } catch (err) {
        console.error('Failed to save book to Supabase:', err)
      }
    }
  }

  const isBookSaved = (book) => {
    return savedBooks.some((b) => b.title === book.title)
  }

  const scrollToSection = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="atelier-root">
      {/* 1. Main Navigation Bar (Clean Transparent Floating Bar) */}
      <header className="navbar-main">
        <div className="nav-brand-group" onClick={() => navigateTo('home')} style={{ cursor: 'pointer' }}>
          <img src="/logo.png" alt="ShelfKnows Logo" className="brand-logo-img" />
        </div>

        {/* Center Menu Links */}
        <ul className="nav-menu-links">
          <li className="nav-link-item">
            <button className={`nav-btn ${currentPage === 'home' ? 'active' : ''}`} onClick={() => navigateTo('home')}>
              Home
            </button>
          </li>


          <li className="nav-link-item">
            <button className={`nav-btn ${currentPage === 'authors' ? 'active' : ''}`} onClick={() => navigateTo('authors')}>
              Authors
            </button>
          </li>

          <li className="nav-link-item">
            <button className={`nav-btn ${currentPage === 'articles' ? 'active' : ''}`} onClick={() => navigateTo('articles')}>
              Reading Room
            </button>
          </li>

          <li className="nav-link-item">
            <button className={`nav-btn ${currentPage === 'community' ? 'active' : ''}`} onClick={() => navigateTo('community')}>
              Community
            </button>
          </li>

          <li className="nav-link-item">
            <button className={`nav-btn ${currentPage === 'about' ? 'active' : ''}`} onClick={() => navigateTo('about')}>
              About ShelfKnows
            </button>
          </li>
        </ul>

        {/* Right Actions */}
        <div className="nav-actions-group">
          {!user ? (
            <button
              className="nav-btn"
              style={{
                background: 'var(--forest-deep)',
                color: '#FFFFFF',
                padding: '0.45rem 1.2rem',
                borderRadius: '9999px',
                fontSize: '0.84rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                border: 'none',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: 'var(--shadow-sm)'
              }}
              onClick={() => {
                setAuthMode('signin')
                setShowAuthModal(true)
              }}
            >
              <span>Sign In</span>
            </button>
          ) : (
            <div ref={profileDropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                title={profile?.full_name || user?.user_metadata?.full_name || 'Reader Profile'}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                  boxShadow: profileDropdownOpen ? '0 0 0 2px var(--forest-deep)' : '0 2px 8px rgba(0,0,0,0.08)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                <img
                  src={currentAvatarSrc}
                  alt="Reader Avatar"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  background: 'var(--bg-surface)',
                  border: '1.5px solid var(--border-warm)',
                  borderRadius: '16px',
                  boxShadow: 'var(--shadow-lg)',
                  width: '240px',
                  padding: '0.5rem',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem'
                }}>
                  <div style={{ padding: '0.65rem 0.85rem', borderBottom: '1px solid var(--border-warm)', marginBottom: '0.3rem' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Signed In As</div>
                    <div style={{ fontSize: '0.92rem', color: 'var(--forest-deep)', fontWeight: 600, marginTop: '0.15rem' }}>
                      {profile?.full_name || user?.user_metadata?.full_name || 'Reader'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', marginTop: '0.1rem' }}>
                      {user?.email}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      navigateTo('profile')
                      setProfileDropdownOpen(false)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '10px',
                      color: 'var(--text-dark)',
                      fontSize: '0.88rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      whiteSpace: 'nowrap',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface-soft)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span>View full profile</span>
                  </button>

                  <div style={{ height: '1px', background: 'var(--border-warm)', margin: '0.3rem 0' }} />

                  <button
                    onClick={handleSignOut}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '10px',
                      color: '#DC2626',
                      fontSize: '0.88rem',
                      fontWeight: 400,
                      cursor: 'pointer',
                      textAlign: 'left',
                      whiteSpace: 'nowrap',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#FEE2E2'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ================= PAGE: HOME ================= */}
      {currentPage === 'home' && (
        <>
          {/* 2. Hero Section with Background Video Scoped Only to Hero Fold */}
          <section className="hero-section-outer">
            <div className="hero-video-wrapper" aria-hidden="true">
              <video
                className="hero-bg-video-element"
                src={homeVideo}
                autoPlay
                loop
                muted
                playsInline
              />
              <div className="hero-video-gradient-overlay" />
            </div>

            <div className="hero-atelier-container">
              <div className="hero-left-content">
                <h1 className="hero-headline-serif">
                  Your BookShelf <br />
                  Says More About You <br />
                  <em>Than You Think.</em>
                </h1>

                <p className="hero-subtext">
                  So, I created <strong style={{ color: 'var(--forest-deep)', fontWeight: 800 }}>ShelfKnows</strong> — an AI-powered hybrid book recommendation platform that helps you discover your next favorite read based on the themes, moods, and stories you love.
                </p>
              </div>
            </div>
          </section>

          {/* 4. Curated Recommendations Section */}
          <section className="section-wrapper" id="curated-results-shelf">
            {/* Search Box & Try Exploring Pills - Cleanly positioned above Curator Controls Bar */}
            <div className="curator-search-block">
              <div className="curator-search-header">
                <h2 className="curator-search-lead-serif">Your bookshelf awaits its next story.</h2>
                <p className="curator-search-lead-sub">
                  Describe the mood, theme, or feeling you're looking for in the search box below.
                </p>
              </div>

              <div className="search-box-atelier">
                <input
                  type="text"
                  className="search-input-atelier"
                  placeholder="e.g. books about high-stakes survival, quiet mysteries, or space odyssey..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button
                  className="btn-search-atelier"
                  onClick={() => handleSearch()}
                  disabled={loading || !query.trim()}
                >
                  {loading ? 'Curating...' : 'Discover Books'}
                </button>
              </div>

              {/* Prompt Inspiration Pills */}
              <div className="prompt-chips-group">
                <span className="chip-label-subtle">Try exploring:</span>
                {samplePrompts.map((sample, idx) => (
                  <button
                    key={idx}
                    className="inspiration-chip-btn"
                    onClick={() => onChipClick(sample)}
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>

            {/* Playful Curator Toggle Bar */}
            <div className="curator-controls-bar">
              <div
                className="curator-toggle-wrap"
                onClick={() => setRerank(!rerank)}
              >
                <div className={`curator-toggle-switch ${rerank ? 'active' : ''}`}>
                  <span className="toggle-thumb" />
                </div>
                <div className="curator-text-wrap">
                  <span className="curator-label-main">
                    {rerank ? 'Curator Deep Precision Mode (Active)' : 'Fast Broad Exploration Mode'}
                  </span>
                  <span className="curator-label-sub">
                    {rerank ? 'Deep semantic reranking enabled for subtle nuances' : 'Fast semantic vector & keyword search'}
                  </span>
                </div>
              </div>

              <div className="curator-meta-right">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Show:</span>
                  <select
                    className="curator-select-dropdown"
                    value={topK}
                    onChange={(e) => setTopK(e.target.value)}
                  >
                    <option value={3}>Top 3</option>
                    <option value={5}>Top 5</option>
                    <option value={8}>Top 8</option>
                    <option value={10}>Top 10</option>
                  </select>
                </div>

                {latency !== null && (
                  <span className="speed-badge-atelier">
                    ⚡ Curated in {latency} ms
                  </span>
                )}
              </div>
            </div>

            {/* Results Header & Grid (Appears when search is initiated or results exist) */}
            {(books.length > 0 || loading || error || query) && (
              <>
                <div className="section-editorial-header">
                  <div className="section-kicker">Curated for You</div>
                  <h2 className="section-title-serif">
                    {query ? (
                      <>
                        <span className="title-prefix-italic">Recommendations for</span>{' '}
                        <span className="title-query-cream">"{query}"</span>
                      </>
                    ) : (
                      <>
                        <span className="title-prefix-italic">Handpicked</span>{' '}
                        <span className="title-query-cream">Literary Gems</span>
                      </>
                    )}
                  </h2>
                </div>

                {loading && (
                  <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      border: '3px solid var(--border-warm)',
                      borderTopColor: 'var(--forest-deep)',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                      margin: '0 auto 1.2rem auto'
                    }}></div>
                    <p style={{ fontFamily: 'var(--font-heading)', fontStyle: 'italic', fontSize: '1.1rem' }}>
                      Understanding your prompt and matching themes across 50,000+ books...
                    </p>
                  </div>
                )}

                {error && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '2rem', borderRadius: '16px', textAlign: 'center', color: '#B91C1C' }}>
                    <p>{error}</p>
                  </div>
                )}

                {!loading && !error && query && books.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
                    <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', color: 'var(--forest-deep)', marginBottom: '0.4rem' }}>
                      No matching books found for "{query}"
                    </p>
                    <p style={{ fontSize: '0.9rem' }}>
                      Try exploring with a broader theme or another prompt pill above.
                    </p>
                  </div>
                )}

                {!loading && !error && books.length > 0 && (
                  <div className="books-editorial-grid">
                    {books.map((book, idx) => {
                      const saved = isBookSaved(book)
                      return (
                        <div
                          key={book.book_id || idx}
                          className="book-card-atelier"
                        >
                          {/* Top Cover Image */}
                          <div className="card-top-cover-wrap">
                            {book.image_url ? (
                              <img
                                src={book.image_url}
                                alt={book.title}
                                className="card-cover-image"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div
                              className="card-cover-fallback"
                              style={{ display: book.image_url ? 'none' : 'flex' }}
                            >
                              {book.title}
                            </div>

                            {/* Bookmark Ribbon Drop Button */}
                            <button
                              className={`ribbon-bookmark-btn ${saved ? 'saved' : ''}`}
                              title={saved ? 'Remove from My Shelf' : 'Save to My Shelf'}
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleSaveBook(book, e)
                              }}
                            >
                              {saved ? '★' : '★'}
                            </button>
                          </div>

                          {/* Body Content */}
                          <div className="card-body-atelier">
                            <h3 className="card-book-title">{book.title}</h3>
                            <div className="card-book-author">By {book.authors || 'Unknown Author'}</div>

                            <div className="card-rating-strip">
                              <span className="rating-star-gold">★</span>
                              <span>{book.average_rating ? Number(book.average_rating).toFixed(2) : '4.0'} / 5.0</span>
                            </div>

                            {/* Dual Side-by-Side Information Boxes with Inline More/Less */}
                            <div className="card-dual-boxes-row">
                              {book.description && (
                                <div className="curator-note-card synopsis-box">
                                  <div className="curator-box-header">Book Synopsis</div>
                                  <div className={`curator-note-text ${expandedBoxes[`${book.book_id || book.title}_synopsis`] ? 'expanded' : ''}`}>
                                    {book.description}
                                  </div>
                                  {book.description.length > 170 && (
                                    <button
                                      className="btn-read-more-toggle"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        toggleBoxExpand(`${book.book_id || book.title}_synopsis`)
                                      }}
                                    >
                                      {expandedBoxes[`${book.book_id || book.title}_synopsis`] ? 'Show Less ▴' : 'Read More ▾'}
                                    </button>
                                  )}
                                </div>
                              )}

                              {book.ai_explanation && (
                                <div className="curator-note-card rationale-box">
                                  <div className="curator-box-header">Why This Was Picked For You?</div>
                                  <div className={`curator-note-text ${expandedBoxes[`${book.book_id || book.title}_rationale`] ? 'expanded' : ''}`}>
                                    {book.ai_explanation}
                                  </div>
                                  {book.ai_explanation.length > 170 && (
                                    <button
                                      className="btn-read-more-toggle"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        toggleBoxExpand(`${book.book_id || book.title}_rationale`)
                                      }}
                                    >
                                      {expandedBoxes[`${book.book_id || book.title}_rationale`] ? 'Show Less ▴' : 'Read More ▾'}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Inline Card Action Buttons */}
                            <div className="card-actions-row">
                              <button
                                className={`btn-card-action btn-save-shelf ${saved ? 'saved' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleSaveBook(book, e)
                                }}
                              >
                                {saved ? '★ On Your Shelf' : '☆ Save to My Shelf'}
                              </button>

                              <button
                                className="btn-card-action btn-discover-more"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const nextQ = `books like ${book.title}`
                                  setQuery(nextQ)
                                  handleSearch(nextQ)
                                }}
                              >
                                Discover More Like This
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {/* Literary Thought Carousel (Permanently visible below recommended books or toggle bar) */}
            {!loading && (
              <div className="literary-quote-atelier">
                <div className="quote-badge-pill">
                  <span>Words For Book Lovers</span>
                </div>

                <div className={`quote-content-wrapper ${quoteFading ? 'fading' : ''}`}>
                  <blockquote className="literary-quote-text">
                    “{literaryQuotes[activeQuoteIdx].quote}”
                  </blockquote>
                  <div className="literary-quote-author">
                    — {literaryQuotes[activeQuoteIdx].author.toUpperCase()}
                  </div>
                </div>

                {/* Subtle Carousel Controls & Minimal Navigation Dots */}
                <div className="quote-carousel-nav">
                  <button
                    className="quote-nav-btn"
                    onClick={handlePrevQuote}
                    title="Previous thought"
                    aria-label="Previous quote"
                  >
                    ‹
                  </button>

                  <div className="quote-dots-indicator">
                    {literaryQuotes.map((_, idx) => (
                      <button
                        key={idx}
                        className={`quote-dot ${idx === activeQuoteIdx ? 'active' : ''}`}
                        onClick={() => {
                          setQuoteFading(true)
                          setTimeout(() => {
                            setActiveQuoteIdx(idx)
                            setQuoteFading(false)
                          }, 280)
                        }}
                        aria-label={`Go to quote ${idx + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    className="quote-nav-btn"
                    onClick={handleNextQuote}
                    title="Next thought"
                    aria-label="Next quote"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}

          </section>

          {/* 5. Permanent Trending Bestsellers Shelf */}
          <section className="bestsellers-strip-container" id="bestsellers-shelf">
            <div className="section-wrapper">
              <div className="section-editorial-header">
                <h2 className="section-title-serif">Timeless Bestsellers</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.4rem' }}>
                  Click any of these celebrated reads to discover similar books!
                </p>
              </div>

              <div className="books-editorial-grid">
                {staticBestsellers.map((item, index) => {
                  const saved = isBookSaved(item)
                  return (
                    <div
                      key={index}
                      className="book-card-atelier"
                    >
                      {/* Left: Book Cover Thumbnail */}
                      <div className="card-top-cover-wrap">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="card-cover-image"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className="card-cover-fallback"
                          style={{ display: item.image_url ? 'none' : 'flex' }}
                        >
                          {item.title}
                        </div>

                        {/* Bookmark Ribbon Drop Button */}
                        <button
                          className={`ribbon-bookmark-btn ${saved ? 'saved' : ''}`}
                          title={saved ? 'Remove from My Shelf' : 'Save to My Shelf'}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleSaveBook(item, e)
                          }}
                        >
                          {saved ? '★' : '★'}
                        </button>
                      </div>

                      {/* Right: Body Content */}
                      <div className="card-body-atelier">
                        <h3 className="card-book-title">{item.title}</h3>
                        <div className="card-book-author">By {item.authors}</div>

                        <div className="card-rating-strip">
                          <span className="rating-star-gold">★</span>
                          <span>{item.average_rating ? Number(item.average_rating).toFixed(2) : '4.3'} / 5.0</span>
                        </div>

                        {/* Book Synopsis Box (Full Width Horizontal) */}
                        {item.description && (
                          <div className="curator-note-card" style={{ width: '100%', boxSizing: 'border-box', marginTop: 'auto', marginBottom: '1.25rem' }}>
                            <div className="curator-box-header">Book Synopsis</div>
                            <p className="curator-note-text" style={{ margin: 0 }}>
                              {item.description}
                            </p>
                          </div>
                        )}

                        {/* Inline Card Action Buttons */}
                        <div className="card-actions-row">
                          <button
                            className={`btn-card-action btn-save-shelf ${saved ? 'saved' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleSaveBook(item, e)
                            }}
                          >
                            {saved ? '★ On Your Shelf' : '☆ Save to My Shelf'}
                          </button>

                          <button
                            className="btn-card-action btn-discover-more"
                            onClick={(e) => {
                              e.stopPropagation()
                              const nextQ = `books like ${item.title}`
                              setQuery(nextQ)
                              handleSearch(nextQ)
                            }}
                          >
                            Discover More Like This
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        </>
      )}

      {/* ================= PAGE: AUTHORS DIRECTORY & BOOKS ================= */}
      {currentPage === 'authors' && (
        <main className="editorial-page-container">
          {!selectedAuthor ? (
            <>
              <div className="editorial-page-hero">
                <h1 className="editorial-page-title">Meet the Authors</h1>
                <p className="editorial-page-subtitle">
                  Find the authors you love, discover new ones, and dive into their complete collections.
                </p>
              </div>

              {/* Author Search Bar */}
              <div className="author-search-bar" style={{ maxWidth: '720px', margin: '0 auto 1.8rem auto' }}>
                <span className="author-search-icon">🔍</span>
                <input
                  type="text"
                  className="author-search-input"
                  placeholder="Search by author name (e.g. Stephen King, Jane Austen)..."
                  value={authorSearchQuery}
                  onChange={(e) => setAuthorSearchQuery(e.target.value)}
                />
                {authorSearchQuery && (
                  <button
                    className="author-search-clear"
                    onClick={() => setAuthorSearchQuery('')}
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Authors Grid */}
              {loadingAuthors ? (
                <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
                  <div className="atelier-spinner" style={{ margin: '0 auto 1.2rem auto' }}></div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Searching authors in Goodreads dataset...</p>
                </div>
              ) : !backendOnline ? (
                <div style={{ textAlign: 'center', padding: '4rem 1.5rem', background: 'var(--bg-surface)', borderRadius: '20px', border: '1px dashed var(--border-warm)', maxWidth: '680px', margin: '0 auto' }}>
                  <div style={{ fontSize: '2.2rem', marginBottom: '0.6rem' }}>🔌</div>
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem', color: 'var(--forest-deep)', marginBottom: '0.4rem' }}>
                    Backend Server is Offline
                  </p>
                  <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 1.4rem auto', lineHeight: 1.6 }}>
                    The 4,600+ authors catalog and 50,000 book dataset are loaded by the FastAPI backend. Please start the backend server in your terminal.
                  </p>
                  <button
                    className="btn-search-atelier"
                    style={{ padding: '0.6rem 1.5rem', fontSize: '0.86rem' }}
                    onClick={() => {
                      checkHealth()
                      fetchPopularAuthors()
                    }}
                  >
                    🔄 Retry Connection
                  </button>
                </div>
              ) : popularAuthors.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'var(--bg-surface)', borderRadius: '20px', border: '1px dashed var(--border-warm)' }}>
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', color: 'var(--forest-deep)', marginBottom: '0.4rem' }}>
                    No authors found matching "{authorSearchQuery}"
                  </p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Try searching with a shorter name or common spelling.
                  </p>
                </div>
              ) : (
                <div id="authors-catalog-anchor">
                  <div style={{ textAlign: 'center', marginBottom: '1.4rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    {authorSearchQuery.trim() ? (
                      <div style={{ marginBottom: '0.35rem', color: 'var(--forest-deep)', fontWeight: 600 }}>
                        Found <strong>{popularAuthors.length}</strong> {popularAuthors.length === 1 ? 'author' : 'authors'} for "{authorSearchQuery}"
                      </div>
                    ) : null}
                    <span>Click any author to inspect all their published works.</span>
                  </div>
                  <div className="author-directory-grid">
                    {popularAuthors
                      .slice((authorsCatalogCurrentPage - 1) * AUTHORS_PER_PAGE, authorsCatalogCurrentPage * AUTHORS_PER_PAGE)
                      .map((author, i) => (
                        <div
                          key={i}
                          className="author-directory-card"
                          onClick={() => handleSelectAuthor(author.name)}
                          title={`Click to view all books by ${author.name}`}
                        >
                          <div className="author-avatar-badge">
                            {getAuthorInitials(author.name)}
                          </div>
                          <div className="author-info-content">
                            <div className="author-info-name">{author.name}</div>
                            <div className="author-books-count-row">
                              {author.book_count} {author.book_count === 1 ? 'book' : 'books'}
                            </div>
                          </div>
                          <span style={{ color: 'var(--forest-deep)', fontWeight: 'bold', fontSize: '1.05rem', marginLeft: 'auto', paddingLeft: '0.4rem', flexShrink: 0 }}>→</span>
                        </div>
                      ))}
                  </div>

                  {/* Pagination Bar for Authors Directory (8 authors per page) */}
                  {Math.ceil(popularAuthors.length / AUTHORS_PER_PAGE) > 1 && (
                    <div className="genre-pagination-bar author-pagination-bar">
                      <div className="genre-pagination-info">
                        Page <strong>{authorsCatalogCurrentPage}</strong> of <strong>{Math.ceil(popularAuthors.length / AUTHORS_PER_PAGE)}</strong>
                      </div>

                      <div className="genre-pagination-controls">
                        <button
                          className="pagination-nav-btn"
                          disabled={authorsCatalogCurrentPage === 1}
                          onClick={() => {
                            const prevP = authorsCatalogCurrentPage - 1
                            setAuthorsCatalogCurrentPage(prevP)
                          }}
                        >
                          PREV
                        </button>

                        {getAuthorsCatalogPageNumbers().map((p, idx) => {
                          if (p === '...') {
                            return (
                              <span key={`authors-ellipsis-${idx}`} className="pagination-ellipsis">
                                …
                              </span>
                            )
                          }
                          return (
                            <button
                              key={p}
                              className={`pagination-page-btn ${authorsCatalogCurrentPage === p ? 'active' : ''}`}
                              onClick={() => {
                                setAuthorsCatalogCurrentPage(p)
                              }}
                            >
                              {p}
                            </button>
                          )
                        })}

                        <button
                          className="pagination-nav-btn"
                          disabled={authorsCatalogCurrentPage === Math.ceil(popularAuthors.length / AUTHORS_PER_PAGE)}
                          onClick={() => {
                            const nextP = authorsCatalogCurrentPage + 1
                            setAuthorsCatalogCurrentPage(nextP)
                          }}
                        >
                          NEXT
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Back Button */}
              <button
                className="btn-back-authors"
                onClick={() => {
                  setSelectedAuthor(null)
                  setAuthorCurrentPage(1)
                }}
              >
                ← Back to All Authors
              </button>

              {/* Author Details Header */}
              <div className="author-selected-header">
                <div>
                  <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.4rem', color: 'var(--forest-deep)', margin: 0 }}>
                    The {selectedAuthor} Collection
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.35rem' }}>
                    Explore celebrated books, reader favorites, and hidden gems curated for your shelf.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                  <span className="nav-shelf-badge" style={{ padding: '0.55rem 1.2rem', fontSize: '0.88rem' }}>
                    {authorBooks.length} {authorBooks.length === 1 ? 'Book' : 'Books'} Found
                  </span>
                </div>
              </div>

              {/* Author Books List in identical horizontal card format */}
              {loadingAuthorBooks ? (
                <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
                  <div className="atelier-spinner" style={{ margin: '0 auto 1.2rem auto' }}></div>
                  <p style={{ fontFamily: 'var(--font-heading)', fontStyle: 'italic', fontSize: '1.2rem', color: 'var(--forest-deep)' }}>
                    Retrieving all cataloged works by {selectedAuthor}...
                  </p>
                </div>
              ) : authorBooks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'var(--bg-surface)', borderRadius: '20px', border: '1px dashed var(--border-warm)' }}>
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', color: 'var(--forest-deep)' }}>
                    No books found for this author in current dataset slice.
                  </p>
                </div>
              ) : (
                <div id="author-books-anchor" className="author-books-container">
                  <div className="books-editorial-grid">
                    {authorBooks
                      .slice((authorCurrentPage - 1) * AUTHOR_BOOKS_PER_PAGE, authorCurrentPage * AUTHOR_BOOKS_PER_PAGE)
                      .map((book, idx) => {
                        const saved = isBookSaved(book)
                        return (
                          <div
                            key={book.book_id || idx}
                            className="book-card-atelier"
                          >
                            {/* Left Cover */}
                            <div className="card-top-cover-wrap">
                              {book.image_url ? (
                                <img
                                  src={book.image_url}
                                  alt={book.title}
                                  className="card-cover-image"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div
                                className="card-cover-fallback"
                                style={{ display: book.image_url ? 'none' : 'flex' }}
                              >
                                {book.title}
                              </div>

                              {/* Ribbon Bookmark Button */}
                              <button
                                className={`ribbon-bookmark-btn ${saved ? 'saved' : ''}`}
                                title={saved ? 'Remove from My Shelf' : 'Save to My Shelf'}
                                onClick={(e) => toggleSaveBook(book, e)}
                              >
                                {saved ? '★' : '★'}
                              </button>
                            </div>

                            {/* Right Body Content */}
                            <div className="card-body-atelier">
                              <h3 className="card-book-title">{book.title}</h3>
                              <div className="card-book-author">By {book.authors || selectedAuthor}</div>

                              <div className="card-rating-strip">
                                <span className="rating-star-gold">★</span>
                                <span>{book.average_rating ? Number(book.average_rating).toFixed(2) : '4.0'} / 5.0</span>
                              </div>

                              {/* Book Synopsis Box with Expand/Collapse */}
                              <div className="curator-note-card">
                                <div className="curator-box-header">BOOK SYNOPSIS</div>
                                <p className={`curator-note-text ${expandedBoxes[`${book.book_id || book.title}_author_syn`] ? 'expanded' : ''}`}>
                                  {book.description || "Detailed synopsis available in catalog edition."}
                                </p>
                                {(book.description || '').length > 170 && (
                                  <button
                                    className="btn-read-more-toggle"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      toggleBoxExpand(`${book.book_id || book.title}_author_syn`)
                                    }}
                                  >
                                    {expandedBoxes[`${book.book_id || book.title}_author_syn`] ? 'Show Less ▴' : 'Read More ▾'}
                                  </button>
                                )}
                              </div>

                              {/* Interactive Bottom Actions */}
                              <div className="card-actions-row" onClick={(e) => e.stopPropagation()}>
                                <button
                                  className={`btn-card-action btn-save-shelf ${saved ? 'saved' : ''}`}
                                  onClick={(e) => toggleSaveBook(book, e)}
                                >
                                  {saved ? '★ Saved on Shelf' : '☆ Save to My Shelf'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>

                  {/* E-Commerce Pagination Bar for Author Books (5 books per page) */}
                  {Math.ceil(authorBooks.length / AUTHOR_BOOKS_PER_PAGE) > 1 && (
                    <div className="genre-pagination-bar author-pagination-bar">
                      <div className="genre-pagination-info">
                        Page <strong>{authorCurrentPage}</strong> of <strong>{Math.ceil(authorBooks.length / AUTHOR_BOOKS_PER_PAGE)}</strong>
                      </div>

                      <div className="genre-pagination-controls">
                        <button
                          className="pagination-nav-btn"
                          disabled={authorCurrentPage === 1}
                          onClick={() => {
                            const prevP = authorCurrentPage - 1
                            setAuthorCurrentPage(prevP)
                            document.getElementById('author-books-anchor')?.scrollIntoView({ behavior: 'smooth' })
                          }}
                        >
                          PREV
                        </button>

                        {getAuthorPageNumbers().map((p, idx) => {
                          if (p === '...') {
                            return (
                              <span key={`ellipsis-${idx}`} className="pagination-ellipsis">
                                …
                              </span>
                            )
                          }
                          return (
                            <button
                              key={p}
                              className={`pagination-page-btn ${authorCurrentPage === p ? 'active' : ''}`}
                              onClick={() => {
                                setAuthorCurrentPage(p)
                                document.getElementById('author-books-anchor')?.scrollIntoView({ behavior: 'smooth' })
                              }}
                            >
                              {p}
                            </button>
                          )
                        })}

                        <button
                          className="pagination-nav-btn"
                          disabled={authorCurrentPage === Math.ceil(authorBooks.length / AUTHOR_BOOKS_PER_PAGE)}
                          onClick={() => {
                            const nextP = authorCurrentPage + 1
                            setAuthorCurrentPage(nextP)
                            document.getElementById('author-books-anchor')?.scrollIntoView({ behavior: 'smooth' })
                          }}
                        >
                          NEXT
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      )}

      {/* ================= PAGE: ARTICLES ================= */}
      {currentPage === 'articles' && (
        <main className="editorial-page-container">
          {!selectedArticle ? (
            <>
              <div className="editorial-page-hero">
                <h1 className="editorial-page-title">The Reading Room</h1>
                <p className="editorial-page-subtitle">
                  If you write about your reading experiences and how books have shaped your life, your perspective, or the way you see the world—we would love to read your words here too.
                </p>
                <div style={{ marginTop: '1.8rem', display: 'flex', justifyContent: 'center' }}>
                  <button
                    className="btn-search-atelier"
                    onClick={() => {
                      setShowShareEssayForm(!showShareEssayForm)
                      if (!essayAuthor) {
                        setEssayAuthor(profile?.full_name || user?.user_metadata?.full_name || 'Simran Chaudhary')
                      }
                    }}
                    style={{ padding: '0.8rem 2.4rem', fontSize: '0.94rem', fontWeight: 700 }}
                  >
                    {showShareEssayForm ? '✕ Close Form' : 'Share it with your fellow readers →'}
                  </button>
                </div>
              </div>

              {/* Expandable Form: Share an Essay with Reading Room */}
              {showShareEssayForm && (
                <div className="recommend-card-box essay-share-card-box" style={{ maxWidth: '880px', marginBottom: '3.5rem', animation: 'fadeIn 0.3s ease' }}>
                  <div style={{ marginBottom: '1.4rem', borderBottom: '1px solid var(--border-warm)', paddingBottom: '0.9rem' }}>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.45rem', color: 'var(--forest-deep)', margin: 0 }}>
                      Share What You've Written, We'd Love to Read It ❤️
                    </h3>
                  </div>

                  <form onSubmit={handlePublishReadingRoomEssay}>
                    {/* 1. Literary Category / Shelf */}
                    <div style={{ marginBottom: '1.3rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--forest-deep)', marginBottom: '0.55rem' }}>
                        <span>Literary Category / Shelf</span> <span style={{ color: '#E11D48' }}>*</span>
                      </label>
                      <select
                        required
                        value={essayCategory}
                        onChange={(e) => setEssayCategory(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem 2.5rem 0.75rem 1rem',
                          borderRadius: '12px',
                          border: '1.5px solid var(--border-warm)',
                          background: 'var(--bg-surface-soft)',
                          fontFamily: 'inherit',
                          fontSize: '0.9rem',
                          color: essayCategory ? 'var(--text-dark)' : 'var(--text-muted)',
                          cursor: 'pointer',
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%232D3748' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 0.9rem center',
                          backgroundSize: '1.1rem'
                        }}
                      >
                        <option value="" disabled>Select a literary shelf...</option>
                        {READING_ROOM_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Article URL */}
                    <div style={{ marginBottom: '1.3rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--forest-deep)', marginBottom: '0.55rem', flexWrap: 'wrap' }}>
                        <span>Article URL (Substack, Medium, or LinkedIn)</span> <span style={{ color: '#E11D48' }}>*</span>
                      </label>
                      <input
                        type="url"
                        required
                        placeholder="Paste your article URL here..."
                        value={essayUrl}
                        onChange={(e) => {
                          const val = e.target.value
                          setEssayUrl(val)
                          if (val.trim().length > 10 && !isFetchingPreview) {
                            clearTimeout(window._essayFetchTimer)
                            window._essayFetchTimer = setTimeout(() => {
                              fetchArticleMetadata(val)
                            }, 600)
                          }
                        }}
                        onPaste={(e) => {
                          const pasted = e.clipboardData.getData('text')
                          if (pasted) {
                            setTimeout(() => fetchArticleMetadata(pasted), 50)
                          }
                        }}
                        onBlur={() => {
                          if (essayUrl && !essayTitle) {
                            fetchArticleMetadata(essayUrl)
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          borderRadius: '12px',
                          border: '1.5px solid var(--border-warm)',
                          background: 'var(--bg-surface-soft)',
                          fontFamily: 'inherit',
                          fontSize: '0.92rem'
                        }}
                      />
                    </div>

                    {/* Relevance Warning Notice */}
                    {relevanceWarning && (
                      <div style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        borderLeft: '3.5px solid #EF4444',
                        padding: '0.75rem 1rem',
                        borderRadius: '0 10px 10px 0',
                        marginBottom: '1.2rem',
                        fontSize: '0.84rem',
                        color: '#B91C1C',
                        lineHeight: 1.5
                      }}>
                        {relevanceWarning}
                      </div>
                    )}

                    {/* Fetch Status Messages (Zero emojis) */}
                    {isFetchingPreview && (
                      <div style={{ marginBottom: '1.2rem', fontSize: '0.84rem', color: 'var(--forest-deep)', display: 'flex', alignItems: 'center' }}>
                        <span>Extracting cover image, title and synopsis from {essayPlatform}...</span>
                      </div>
                    )}
                    {previewFetchStatus === 'success' && (
                      <div style={{ marginBottom: '1.2rem', fontSize: '0.84rem', color: '#059669', display: 'flex', alignItems: 'center' }}>
                        <span>Cover image and details extracted automatically. Here is how your card will appear:</span>
                      </div>
                    )}
                    {previewFetchStatus === 'fallback' && (
                      <div style={{ marginBottom: '1.2rem', fontSize: '0.84rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                        <span>Article recognized on {essayPlatform}. Card preview generated below:</span>
                      </div>
                    )}

                    {/* Live Preview Card */}
                    {(essayTitle || essayUrl) && (
                      <div style={{ marginBottom: '1.8rem' }}>
                        <div className="article-page-card" style={{ pointerEvents: 'none', transform: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                          <div className="article-card-cover-wrap" style={{ width: '100%', minWidth: '100%', maxWidth: '100%', height: '220px' }}>
                            <img
                              src={essayCoverImage || '/articles/article1.jpeg'}
                              alt="Preview"
                              className="article-card-cover-img"
                              onError={(e) => {
                                e.currentTarget.onerror = null
                                e.currentTarget.src = '/articles/article1.jpeg'
                              }}
                            />
                          </div>
                          <div className="article-card-body-content" style={{ padding: '1.4rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <span className="article-category-badge">{essayCategory || 'LITERARY ESSAY'}</span>
                            </div>
                            <h3 className="article-card-title" style={{ fontSize: '1.15rem', marginBottom: '0.4rem' }}>
                              {essayTitle || 'Your Article Title'}
                            </h3>
                            <p className="article-card-teaser" style={{ fontSize: '0.85rem', marginBottom: '0.8rem', WebkitLineClamp: 2 }}>
                              {essayTeaser || 'Your essay teaser will appear here...'}
                            </p>
                            <div className="article-card-footer" style={{ marginTop: 'auto', paddingTop: '0.6rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <img
                                  src={currentAvatarSrc}
                                  alt="Author"
                                  style={{ width: '24px', height: '24px', borderRadius: '50%' }}
                                />
                                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>By {essayAuthor || profile?.full_name || 'Simran Chaudhary'}</span>
                              </div>
                              <span className="article-read-btn" style={{ fontSize: '0.8rem' }}>
                                Read on {essayPlatform} ↗
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Publication Notice */}
                    <p style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '0.94rem',
                      fontStyle: 'italic',
                      lineHeight: 1.6,
                      color: 'var(--forest-deep)',
                      margin: '1.2rem 0 1.6rem 0',
                      opacity: 0.9
                    }}>
                      Your article will be published directly in The Reading Room for all fellow readers to read and discover.
                    </p>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'center' }}>
                      <button
                        type="submit"
                        className="btn-search-atelier"
                        disabled={!essayUrl.trim() || isFetchingPreview}
                        style={{
                          padding: '0.75rem 2.2rem',
                          fontSize: '0.92rem',
                          fontWeight: 700,
                          opacity: !essayUrl.trim() || isFetchingPreview ? 0.6 : 1,
                          cursor: !essayUrl.trim() || isFetchingPreview ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Publish to The Reading Room
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowShareEssayForm(false)
                          setEssayUrl('')
                          setEssayTitle('')
                          setEssayTeaser('')
                          setEssayCoverImage('')
                          setPreviewFetchStatus(null)
                        }}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border-warm)',
                          padding: '0.75rem 1.4rem',
                          borderRadius: '9999px',
                          cursor: 'pointer',
                          fontSize: '0.88rem'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Empty State */}
              {readingRoomArticles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4.5rem 1.5rem', background: 'var(--bg-surface)', borderRadius: '24px', border: '1px dashed var(--border-warm)', maxWidth: '980px', margin: '0 auto' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>✍️</div>
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', color: 'var(--forest-deep)', marginBottom: '0.5rem' }}>
                    The Reading Room is quiet... for now.
                  </p>
                  <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: '520px', margin: '0 auto 1.5rem auto' }}>
                    Share your Substack newsletter, book reflections, or Medium essays with fellow readers!
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                    <button
                      className="btn-search-atelier"
                      style={{ padding: '0.7rem 1.8rem', fontSize: '0.88rem' }}
                      onClick={() => {
                        setShowShareEssayForm(true)
                        if (!essayAuthor) {
                          setEssayAuthor(profile?.full_name || user?.user_metadata?.full_name || 'Simran Chaudhary')
                        }
                      }}
                    >
                      Share it with your fellow readers →
                    </button>
                    <button
                      type="button"
                      style={{ background: 'transparent', border: '1px solid var(--border-warm)', padding: '0.7rem 1.4rem', borderRadius: '9999px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-muted)' }}
                      onClick={() => setReadingRoomArticles(articlesData)}
                    >
                      Restore Default Articles
                    </button>
                  </div>
                </div>
              ) : (
                <div className="articles-page-grid">
                  {readingRoomArticles.map((article) => {
                    const isExternal = Boolean(article.url)
                    const platformName = article.platform || (isExternal ? 'Substack' : null)
                    const isSeedArticle = articlesData.some((a) => a.id === article.id)
                    const isOwnArticle = Boolean(
                      (user && article.author_id && article.author_id === user.id) ||
                      userArticles.some((a) => a.id === article.id) ||
                      (user && profile?.full_name && article.author === profile.full_name)
                    )
                    const canManage = !isSeedArticle && (isOwnArticle || isCreatorOrAdmin)

                    return (
                      <article
                        key={article.id}
                        className="article-page-card"
                        onClick={() => {
                          if (isExternal) {
                            window.open(article.url, '_blank', 'noopener,noreferrer')
                          } else {
                            handleOpenArticle(article)
                          }
                        }}
                        style={{ cursor: 'pointer', position: 'relative' }}
                      >
                        {article.coverImage && (
                          <div className="article-card-cover-wrap">
                            <img
                              src={article.coverImage}
                              alt={article.title}
                              className="article-card-cover-img"
                              style={article.coverPosition ? { objectPosition: article.coverPosition } : undefined}
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.onerror = null
                                e.currentTarget.src = '/articles/article1.jpeg'
                              }}
                            />
                          </div>
                        )}

                        <div className="article-card-body-content">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span className="article-category-badge">{article.category}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                              {article.readTime && !platformName && (
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{article.readTime}</span>
                              )}
                              {canManage && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (window.confirm('Are you sure you want to remove this essay from The Reading Room?')) {
                                      handleDeleteReadingRoomArticle(article.id)
                                    }
                                  }}
                                  className="article-delete-btn"
                                  title="Remove essay from The Reading Room"
                                >
                                  ✕ Remove
                                </button>
                              )}
                            </div>
                          </div>

                          <h3 className="article-card-title">
                            {article.title}
                          </h3>

                          <p className="article-card-teaser">
                            {article.teaser}
                          </p>

                          <div className="article-card-footer">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <img
                                src={getAuthorAvatar(article.author, article.avatar, article.gender)}
                                alt={article.author}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  border: '1.5px solid var(--border-warm)',
                                  background: 'var(--bg-surface-soft)',
                                  flexShrink: 0
                                }}
                              />
                              <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-dark)' }}>By {article.author}</span>
                            </div>

                            {isExternal ? (
                              <a
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="article-read-btn"
                                onClick={(e) => e.stopPropagation()}
                                style={{ textDecoration: 'none' }}
                              >
                                Read on {platformName} ↗
                              </a>
                            ) : (
                              <span className="article-read-btn">Read Full Article →</span>
                            )}
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="article-reader-container">
              <button
                className="btn-back-authors"
                style={{ marginBottom: '2.2rem' }}
                onClick={handleCloseArticle}
              >
                ← Back to The Reading Room
              </button>

              <header className="article-reader-header">
                {(selectedArticle.readTime || selectedArticle.date) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
                    {selectedArticle.readTime && (
                      <span style={{ fontSize: '0.86rem', color: 'var(--text-muted)', fontWeight: 600 }}>{selectedArticle.readTime}</span>
                    )}
                    {selectedArticle.readTime && selectedArticle.date && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>•</span>
                    )}
                    {selectedArticle.date && (
                      <span style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>{selectedArticle.date}</span>
                    )}
                  </div>
                )}

                <h1 className="article-reader-title">{selectedArticle.title}</h1>

                <div className="article-reader-author-strip">
                  <img
                    src={getAuthorAvatar(selectedArticle.author, selectedArticle.avatar, selectedArticle.gender)}
                    alt={selectedArticle.author}
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid var(--border-warm)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      background: 'var(--bg-surface-soft)',
                      flexShrink: 0
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--forest-deep)', fontSize: '0.98rem' }}>{selectedArticle.author}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{getAuthorHeadline(selectedArticle.author, selectedArticle.role)}</div>
                  </div>
                </div>
              </header>

              {selectedArticle.coverImage && (
                <div className="article-reader-cover-wrap">
                  <img
                    src={selectedArticle.coverImage}
                    alt={selectedArticle.title}
                    className="article-reader-cover-img"
                    style={selectedArticle.coverPosition ? { objectPosition: selectedArticle.coverPosition } : undefined}
                  />
                  {selectedArticle.imageCaption && (
                    <p className="article-reader-image-caption">
                      <span>✦</span> {selectedArticle.imageCaption}
                    </p>
                  )}
                </div>
              )}

              <div className="article-reader-body">
                {Array.isArray(selectedArticle.content) && selectedArticle.content.length > 0 ? (
                  selectedArticle.content.map((block, idx) => {
                  if (block.type === 'lead') {
                    return <p key={idx} className="article-body-lead">{renderFormattedText(block.text)}</p>
                  }
                  if (block.type === 'heading') {
                    return <h2 key={idx} className="article-body-heading">{renderFormattedText(block.text)}</h2>
                  }
                  if (block.type === 'subheading') {
                    return <h3 key={idx} className="article-body-subheading">{renderFormattedText(block.text)}</h3>
                  }
                  if (block.type === 'quote') {
                    return (
                      <blockquote key={idx} className="article-body-pullquote">
                        “{renderFormattedText(block.text)}”
                      </blockquote>
                    )
                  }
                  if (block.type === 'center-quote') {
                    const extraSpacingClass = block.endOfSection || block.spacing === 'large' ? 'quote-end-of-section' : ''
                    return (
                      <div key={idx} className={`article-body-center-quote ${extraSpacingClass}`}>
                        <p className="center-quote-text">“{renderFormattedText(block.text)}”</p>
                        {block.author && <span className="center-quote-author">— {block.author}</span>}
                      </div>
                    )
                  }
                  if (block.type === 'box' || block.type === 'callout') {
                    return (
                      <div key={idx} className="article-body-box">
                        {renderFormattedText(block.text)}
                      </div>
                    )
                  }
                  if (block.type === 'note') {
                    return (
                      <div key={idx} className="article-body-note">
                        <div className="article-note-badge">
                          {block.title || 'From Simran To You'}
                        </div>
                        <p className="article-note-text">{renderFormattedText(block.text)}</p>
                      </div>
                    )
                  }
                  if (block.type === 'stat') {
                    return (
                      <div key={idx} className="article-body-stat">
                        <div className="article-stat-number">{block.number || block.stat}</div>
                        <div className="article-stat-label">{renderFormattedText(block.label || block.text)}</div>
                      </div>
                    )
                  }
                  if (block.type === 'versus') {
                    return (
                      <div key={idx} className="article-body-versus">
                        <div className="versus-col versus-left">
                          <span className="versus-pill">{block.leftLabel || '🧠 My Brain'}</span>
                          <p>{renderFormattedText(block.leftText || block.left)}</p>
                        </div>
                        <div className="versus-divider">VS</div>
                        <div className="versus-col versus-right">
                          <span className="versus-pill reality">{block.rightLabel || '🥱 Reality'}</span>
                          <p>{renderFormattedText(block.rightText || block.right)}</p>
                        </div>
                      </div>
                    )
                  }
                  if (block.type === 'step') {
                    return (
                      <div key={idx} className="article-body-step">
                        <div className="article-step-number">{block.step || idx + 1}</div>
                        <div className="article-step-content">
                          {block.title && <h4 className="article-step-title">{renderFormattedText(block.title)}</h4>}
                          <p className="article-step-text">{renderFormattedText(block.text)}</p>
                        </div>
                      </div>
                    )
                  }
                  if (block.type === 'definition') {
                    return (
                      <div key={idx} className="article-body-definition">
                        <div className="definition-header">
                          <span className="definition-term">{block.term}</span>
                          {block.pronunciation && <span className="definition-phonetic">/{block.pronunciation}/</span>}
                        </div>
                        <p className="definition-meaning">{renderFormattedText(block.meaning || block.text)}</p>
                      </div>
                    )
                  }
                  if (block.type === 'divider') {
                    return (
                      <div key={idx} className="article-body-divider">
                        <span>✦</span>
                        <span>✦</span>
                        <span>✦</span>
                      </div>
                    )
                  }
                  return <p key={idx} className="article-body-p">{renderFormattedText(block.text)}</p>
                })
                ) : (
                  <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', background: 'var(--bg-surface-soft)', borderRadius: '24px', border: '1.5px solid var(--border-warm)', margin: '2rem 0' }}>
                    <p style={{ fontSize: '1.15rem', lineHeight: 1.7, color: 'var(--text-dark)', maxWidth: '680px', margin: '0 auto 2rem auto', fontStyle: 'italic' }}>
                      "{selectedArticle.teaser}"
                    </p>
                    {selectedArticle.url && (
                      <a
                        href={selectedArticle.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-search-atelier"
                        style={{ padding: '0.85rem 2.4rem', fontSize: '0.96rem', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        <span>Read Full Essay on {selectedArticle.platform || 'Substack'}</span>
                        <span>↗</span>
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Reader Bottom Actions & Discovery */}
              <footer className="article-reader-footer">
                <div className="article-footer-card">
                  <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.96rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                    I hope you enjoyed your visit to <strong>The Reading Room</strong>. Deepen your reading journey by discovering celebrated books from our 50,000 Goodreads library.
                  </p>
                  <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap' }}>
                    <button
                      className="btn-search-atelier"
                      style={{ padding: '0.65rem 1.4rem', fontSize: '0.86rem' }}
                      onClick={handleCloseArticle}
                    >
                      ← Back to The Reading Room
                    </button>
                    <button
                      className="inspiration-chip-btn"
                      style={{ padding: '0.65rem 1.4rem', fontSize: '0.86rem' }}
                      onClick={() => {
                        navigateTo('home')
                      }}
                    >
                      Discover Your Next Read ↗
                    </button>
                  </div>
                </div>
              </footer>
            </div>
          )}
        </main>
      )}

      {/* ================= PAGE: ABOUT SHELFKNOWS ================= */}
      {currentPage === 'about' && (
        <main className="editorial-page-container">
          {/* Hero Header */}
          <div className="editorial-page-hero" style={{ marginBottom: '2.5rem' }}>
            <h1 className="editorial-page-title">About ShelfKnows</h1>
            <p className="editorial-page-subtitle" style={{ maxWidth: '640px', margin: '0 auto', fontSize: '1.05rem', lineHeight: 1.7 }}>
              A quiet, thoughtful corner for book lovers who discover stories through moods, feelings, and themes.
            </p>
          </div>

          {/* Section 1: The Story Behind ShelfKnows */}
          <div id="why-we-built-shelfknows" style={{ marginBottom: '3rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.2rem', color: 'var(--forest-deep)', margin: 0 }}>
                The Story Behind ShelfKnows
              </h2>
            </div>

            <div style={{
              background: 'var(--bg-surface)',
              border: '1.5px solid var(--border-warm)',
              borderRadius: '24px',
              padding: '2.4rem 2.5rem',
              boxShadow: 'var(--shadow-card)',
              position: 'relative'
            }}>
              <p style={{ color: 'var(--text-dark)', lineHeight: 1.8, fontSize: '1.02rem', marginBottom: '1.2rem', marginTop: 0 }}>
                As readers, our desire to pick up a book usually comes from where we are in life — a mood, an unanswered question, or a specific phase we are navigating.
              </p>
              <p style={{ color: 'var(--text-dark)', lineHeight: 1.8, fontSize: '1.02rem', marginBottom: '1.2rem' }}>
                Whenever things feel a bit stuck or aren't working out, I find myself looking for books on habits, focus, and ways to get back on track. When I'm curious to learn something new — like tech, machine learning, or a new skill — I look for books that teach me something useful. And on days when I feel low, tired, or simply want to relax with a cup of chai, I just want a good story to get lost in — whether that's a warm, comforting read or a thrilling mystery.
              </p>
              <p style={{ color: 'var(--text-dark)', lineHeight: 1.8, fontSize: '1.02rem', marginBottom: '1.2rem' }}>
                The funny thing is, in all these moments, we rarely know an exact book title or author. We just know what we're going through, how we want to feel, or what we need help with.
              </p>
              <p style={{ color: 'var(--text-dark)', lineHeight: 1.8, fontSize: '1.02rem', marginBottom: '1.2rem' }}>
                That's really the whole reason I built <strong>ShelfKnows</strong>.
              </p>
              <p style={{ color: 'var(--text-dark)', lineHeight: 1.8, fontSize: '1.02rem', marginBottom: '1.2rem' }}>
                I wanted a place where you don't have to worry about search keywords or book titles. You can just type whatever is on your mind in your own everyday words — a feeling, a goal, a mood, or a phase of life — and find real, thoughtful books that actually fit that moment.
              </p>
              <p style={{ color: 'var(--text-dark)', lineHeight: 1.8, fontSize: '1.02rem', margin: 0 }}>
                And beyond finding books, it's also a quiet little corner to save your favorites to your personal shelf, recommend a book and talk about stories with other readers in <strong>The Community</strong>, and share your reading experiences and how books have shaped your life in <strong>The Reading Room</strong>.
              </p>
            </div>
          </div>

          {/* Section 2: How It Works */}
          <div id="how-it-works" style={{ marginBottom: '3.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.2rem', color: 'var(--forest-deep)', margin: '0 0 0.5rem 0' }}>
                How Does It Work?
              </h2>
              <p style={{ fontSize: '1.02rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
                Talk to it like you'd talk to a friend who reads a lot.
              </p>
            </div>

            <div className="arch-story-card" style={{ marginBottom: '2rem' }}>
              <div style={{
                background: 'var(--bg-surface-soft)',
                border: '1px solid var(--border-warm)',
                borderRadius: '16px',
                padding: '1.4rem 1.6rem',
                margin: 0
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--forest-deep)', marginBottom: '0.75rem' }}>
                  Instead of rigid keywords, you can literally search:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {[
                    "A cozy mystery set in a small village where everyone has a secret",
                    "A book that feels like a quiet rainy Sunday morning with chai",
                    "A thoughtful story about someone starting over in their twenties",
                    "An emotional adventure where family bonds triumph over tough odds"
                  ].map((example, idx) => (
                    <div
                      key={idx}
                      onClick={() => onChipClick(example)}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid var(--border-warm)',
                        borderRadius: '10px',
                        padding: '0.75rem 1.15rem',
                        fontSize: '0.94rem',
                        color: 'var(--forest-deep)',
                        fontStyle: 'italic',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--forest-deep)'
                        e.currentTarget.style.transform = 'translateX(4px)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-warm)'
                        e.currentTarget.style.transform = 'translateX(0)'
                      }}
                    >
                      <span>“{example}”</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--forest-deep)', fontWeight: 700, fontStyle: 'normal', flexShrink: 0 }}>Try this ➔</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>


          {/* Section: A Note from the Creator */}
          <div id="creator-note" style={{ marginBottom: '4rem' }}>
            <div className="literary-quote-atelier" style={{ margin: '0 auto', maxWidth: '840px', padding: '1rem 1.5rem' }}>
              <div className="quote-badge-pill">
                <span>A Note from the Creator</span>
              </div>

              <div style={{ maxWidth: '800px', textAlign: 'center', width: '100%' }}>
                <p
                  className="literary-quote-text"
                  style={{
                    fontSize: '1.26rem',
                    lineHeight: 1.72,
                    marginBottom: '1.6rem',
                    maxWidth: '100%'
                  }}
                >
                  “At the end of the day, a good book is like a quiet conversation that changes you just a little bit. I hope ShelfKnows leads you to a story that stays with you long after the last page — welcome to ShelfKnows. Happy reading.”
                </p>

                <div className="literary-quote-author">
                  — SIMRAN CHAUDHARY
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Frequently Asked Questions */}
          <div style={{ marginBottom: '3.5rem' }}>
            <div className="arch-story-card">
              <div style={{ display: 'inline-block', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Got Questions?
              </div>
              <h2 className="arch-card-title">
                Frequently Asked Questions
              </h2>
              <p className="arch-card-subtitle">
                A few common questions about using ShelfKnows to discover your next read:
              </p>

              <div className="arch-faq-list">
                {[
                  {
                    q: "How detailed or specific can my search prompt be?",
                    a: "As detailed as you'd like! You can describe an atmosphere, an emotional craving, a character dynamic, or even a scenario — such as 'a slow-burn mystery set in a stormy coastal town with rainy evening vibes' or 'a thoughtful book about starting over in your twenties'. You never have to compress your thoughts into rigid keywords."
                  },
                  {
                    q: "Does ShelfKnows only show famous bestsellers, or can I find hidden gems too?",
                    a: "You will discover both! Because recommendations are ranked by thematic depth and genuine community ratings rather than advertising budgets, ShelfKnows frequently uncovers quiet literary masterpieces and overlooked gems alongside celebrated classics."
                  },
                  {
                    q: "Can I search for exact book titles and authors as well?",
                    a: "Yes, absolutely! While ShelfKnows specializes in mood and theme discovery, it also balances keyword retrieval — so if you search for an author like 'Franz Kafka' or a title like 'Pride and Prejudice', it will find it right away."
                  },
                  {
                    q: "How does 'My Shelf' work, and can I access it across devices?",
                    a: "You can save any book to your personal shelf with a single click. When browsing as a guest, your saved books stay safely stored in your browser. When you create a free account, your shelf syncs seamlessly across your phone, tablet, and laptop in real time."
                  },
                  {
                    q: "Can I recommend books or share my own writing on ShelfKnows?",
                    a: "Yes, absolutely! ShelfKnows is built for fellow readers. You can recommend books that touched you in The Community, or share your own essays, reading reflections, and Substack newsletters directly in The Reading Room."
                  }
                ].map((faq, idx) => (
                  <div key={idx} className="arch-faq-item">
                    <button className="arch-faq-question" onClick={() => toggleArchFaq(idx)}>
                      <span>{faq.q}</span>
                      <span className={`arch-faq-chevron ${openArchFaq === idx ? 'open' : ''}`}>▼</span>
                    </button>
                    {openArchFaq === idx && (
                      <div className="arch-faq-answer">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 6: Open Source & Developer Note */}
          <div style={{
            background: 'var(--bg-surface-soft)',
            border: '1px solid var(--border-warm)',
            borderRadius: '20px',
            padding: '1.8rem 2.2rem',
            marginBottom: '3rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.2rem'
          }}>
            <div style={{ flex: '1 1 360px' }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--forest-deep)', marginBottom: '0.35rem' }}>
                Explore the Code
              </div>
              <p style={{ fontSize: '0.94rem', color: 'var(--text-muted)', lineHeight: 1.65, margin: 0 }}>
                If you are curious to see how the recommendation engine, neural rerankers, and full-stack architecture are built behind the scenes, feel free to explore the ShelfKnows repository on GitHub.
              </p>
            </div>
            <a
              href="https://github.com/its-simran-ch/ShelfKnows"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'var(--forest-deep)',
                color: '#FFFFFF',
                padding: '0.75rem 1.4rem',
                borderRadius: '9999px',
                fontSize: '0.88rem',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <span>Explore on GitHub</span>
              <span>↗</span>
            </a>
          </div>

          {/* Section 7: Bottom CTA Banner */}
          <div className="arch-cta-banner">
            <h3 className="arch-cta-title">Ready to Find Your Next Read?</h3>
            <p className="arch-cta-subtitle">
              Describe a mood, a favorite storyline, or a feeling, and let ShelfKnows find your next reading obsession.
            </p>
            <button
              className="arch-cta-btn"
              onClick={() => navigateTo('home')}
            >
              Try a Search Now
            </button>
          </div>
        </main>
      )}

      {/* ================= PAGE: DEDICATED READER PROFILE ================= */}
      {currentPage === 'profile' && (
        <main className="editorial-page-container profile-page-container">
          {!user ? (
            <div style={{ textAlign: 'center', padding: '5rem 1.5rem', background: 'var(--bg-surface)', borderRadius: '24px', border: '1.5px solid var(--border-warm)', maxWidth: '580px', margin: '3rem auto' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🕯️</div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', color: 'var(--forest-deep)', marginBottom: '0.6rem' }}>
                Reader Sanctuary
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '1.8rem' }}>
                Please sign in to access your personal reading shelf, track books you are currently reading, link your published essays, and save memorable passages.
              </p>
              <button
                className="btn-search-atelier"
                onClick={() => {
                  setAuthMode('signin')
                  setShowAuthModal(true)
                }}
              >
                Sign In to Open Profile
              </button>
            </div>
          ) : (
            <>
              {/* Profile Identity Card */}
              <div className="profile-hero-card">
                <div className="profile-identity-group">
                  <img
                    src={currentAvatarSrc}
                    alt="Reader Profile"
                    className="profile-avatar-large"
                  />
                  <div className="profile-info-block">
                    <h1 className="profile-name-title">
                      {profile?.full_name || user?.user_metadata?.full_name || 'Reader'}
                    </h1>
                    <div style={{ fontSize: '0.92rem', color: 'var(--forest-deep)', fontWeight: 600, marginTop: '0.2rem', marginBottom: '0.25rem' }}>
                      {profile?.headline || user?.user_metadata?.headline || 'Reader & Story Explorer'}
                    </div>
                    <div className="profile-email-sub">
                      {user?.email}
                    </div>

                    {/* Clean controls right below email: Edit Profile & Sign Out */}
                    <div className="profile-actions-inline">
                      <button
                        type="button"
                        onClick={() => {
                          setEditName(profile?.full_name || user?.user_metadata?.full_name || '')
                          setEditGender(userAvatar || 'female')
                          setEditHeadline(profile?.headline || user?.user_metadata?.headline || '')
                          setEditBio(profile?.bio || '')
                          setShowEditProfileModal(true)
                        }}
                        className="profile-edit-btn"
                      >
                        Edit Profile
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowResetPasswordModal(true)}
                        className="profile-edit-btn"
                      >
                        Change Password
                      </button>

                      <button
                        onClick={handleSignOut}
                        className="profile-signout-btn"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Tabs Navigation */}
              <div className="profile-tabs-nav">
                <button
                  className={`profile-tab-btn ${profileActiveTab === 'shelf' ? 'active' : ''}`}
                  onClick={() => setProfileActiveTab('shelf')}
                >
                  <span>Your Shelf</span>
                  <span className="profile-tab-counter">{savedBooks.length}</span>
                </button>

                <button
                  className={`profile-tab-btn ${profileActiveTab === 'writing' ? 'active' : ''}`}
                  onClick={() => setProfileActiveTab('writing')}
                >
                  <span>Your Essays & Writing Corner</span>
                  <span className="profile-tab-counter">{userArticles.length}</span>
                </button>

                <button
                  className={`profile-tab-btn ${profileActiveTab === 'quotes' ? 'active' : ''}`}
                  onClick={() => setProfileActiveTab('quotes')}
                >
                  <span>Your Favorite Book Quotes & Passages</span>
                  <span className="profile-tab-counter">{userQuotes.length}</span>
                </button>
              </div>

              {/* TAB 1: THE PERSONAL SHELF */}
              {profileActiveTab === 'shelf' && (
                <div>
                  {/* Shelf Sub-Filters */}
                  <div className="shelf-subfilters-bar">
                    <button
                      className={`shelf-subfilter-btn ${shelfFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setShelfFilter('all')}
                    >
                      All Books ({savedBooks.length})
                    </button>
                    <button
                      className={`shelf-subfilter-btn ${shelfFilter === 'saved' ? 'active' : ''}`}
                      onClick={() => setShelfFilter('saved')}
                    >
                      Want to Read ({savedBooks.filter(b => (shelfBooksStatus[b.title] || 'saved') === 'saved').length})
                    </button>
                    <button
                      className={`shelf-subfilter-btn ${shelfFilter === 'reading' ? 'active' : ''}`}
                      onClick={() => setShelfFilter('reading')}
                    >
                      Currently Reading ({savedBooks.filter(b => shelfBooksStatus[b.title] === 'reading').length})
                    </button>
                    <button
                      className={`shelf-subfilter-btn ${shelfFilter === 'finished' ? 'active' : ''}`}
                      onClick={() => setShelfFilter('finished')}
                    >
                      Finished ({savedBooks.filter(b => shelfBooksStatus[b.title] === 'finished').length})
                    </button>
                  </div>

                  {/* Books List / Grid */}
                  {savedBooks.filter(b => shelfFilter === 'all' || (shelfBooksStatus[b.title] || 'saved') === shelfFilter).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4.5rem 1.5rem', background: 'var(--bg-surface)', borderRadius: '20px', border: '1px dashed var(--border-warm)' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>📖</div>
                      <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', color: 'var(--forest-deep)', marginBottom: '0.4rem' }}>
                        {shelfFilter === 'all'
                          ? 'Your reading shelf is currently empty.'
                          : `No books marked as "${shelfFilter === 'saved' ? 'Want to Read' : shelfFilter === 'reading' ? 'Currently Reading' : 'Finished'}".`}
                      </p>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.4rem' }}>
                        Discover stories across 50,000+ real books and tap the bookmark star to save them here.
                      </p>
                      <button
                        className="btn-search-atelier"
                        style={{ padding: '0.6rem 1.6rem', fontSize: '0.86rem' }}
                        onClick={() => navigateTo('home')}
                      >
                        Discover Books by Mood
                      </button>
                    </div>
                  ) : (
                    <div className="profile-shelf-grid">
                      {savedBooks
                        .filter(b => shelfFilter === 'all' || (shelfBooksStatus[b.title] || 'saved') === shelfFilter)
                        .map((book, idx) => (
                          <div key={idx} className={`profile-book-card ${openStatusMenuBook === book.title ? 'dropdown-open' : ''}`}>
                            <button
                              type="button"
                              className="profile-book-remove-btn"
                              onClick={() => toggleSaveBook(book)}
                              title="Remove from your shelf"
                            >
                              Remove
                            </button>

                            {book.image_url ? (
                              <img src={book.image_url} alt={book.title} className="profile-book-cover" />
                            ) : (
                              <div className="profile-book-cover-fallback">📖</div>
                            )}

                            <div className="profile-book-info">
                              <div className="profile-book-genre">{book.published_year ? `Published ${book.published_year}` : 'Saved Read'}</div>
                              <div
                                className="profile-book-title"
                                onClick={() => setSelectedBook(book)}
                              >
                                {book.title}
                              </div>
                              <div className="profile-book-author">By {book.authors}</div>

                              <div className="profile-book-status-row">
                                <span className="profile-status-external-label">Reading Status:</span>
                                <div className="profile-status-dropdown-wrap">
                                  <button
                                    type="button"
                                    className="profile-status-dropdown-trigger"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setOpenStatusMenuBook(openStatusMenuBook === book.title ? null : book.title)
                                    }}
                                    title="Click to change reading status"
                                  >
                                    <span className="profile-status-trigger-value">
                                      {(shelfBooksStatus[book.title] || 'saved') === 'reading'
                                        ? 'Currently Reading'
                                        : (shelfBooksStatus[book.title] || 'saved') === 'finished'
                                          ? 'Finished'
                                          : 'Want to Read'}
                                    </span>
                                    <span className="profile-status-trigger-arrow">
                                      {openStatusMenuBook === book.title ? '▴' : '▾'}
                                    </span>
                                  </button>

                                  {openStatusMenuBook === book.title && (
                                    <div className="profile-status-menu" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        type="button"
                                        className={`profile-status-menu-item ${(shelfBooksStatus[book.title] || 'saved') === 'saved' ? 'active' : ''}`}
                                        onClick={() => {
                                          setBookShelfStatus(book.title, 'saved')
                                          setOpenStatusMenuBook(null)
                                        }}
                                      >
                                        <span>Want to Read</span>
                                        {(shelfBooksStatus[book.title] || 'saved') === 'saved' && (
                                          <span className="profile-status-check">✓</span>
                                        )}
                                      </button>

                                      <button
                                        type="button"
                                        className={`profile-status-menu-item ${(shelfBooksStatus[book.title] || 'saved') === 'reading' ? 'active' : ''}`}
                                        onClick={() => {
                                          setBookShelfStatus(book.title, 'reading')
                                          setOpenStatusMenuBook(null)
                                        }}
                                      >
                                        <span>Currently Reading</span>
                                        {(shelfBooksStatus[book.title] || 'saved') === 'reading' && (
                                          <span className="profile-status-check">✓</span>
                                        )}
                                      </button>

                                      <button
                                        type="button"
                                        className={`profile-status-menu-item ${(shelfBooksStatus[book.title] || 'saved') === 'finished' ? 'active' : ''}`}
                                        onClick={() => {
                                          setBookShelfStatus(book.title, 'finished')
                                          setOpenStatusMenuBook(null)
                                        }}
                                      >
                                        <span>Finished</span>
                                        {(shelfBooksStatus[book.title] || 'saved') === 'finished' && (
                                          <span className="profile-status-check">✓</span>
                                        )}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: WRITING CORNER */}
              {profileActiveTab === 'writing' && (
                <div>
                  <div className="profile-section-topbar">
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', color: 'var(--forest-deep)', margin: 0 }}>
                        Your Essays & Writing Corner
                      </h3>
                      <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '0.3rem 0 0 0' }}>
                        Showcase your Substack newsletters, book essays, and published reflections.
                      </p>
                    </div>

                    <button
                      className="btn-search-atelier"
                      style={{ padding: '0.55rem 1.3rem', fontSize: '0.84rem' }}
                      onClick={() => setShowAddArticleForm(!showAddArticleForm)}
                    >
                      {showAddArticleForm ? '✕ Close Form' : '+ Link an Article'}
                    </button>
                  </div>

                  {/* Add Article Form */}
                  {showAddArticleForm && (
                    <form onSubmit={handleAddArticle} className="profile-form-box">
                      <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', color: 'var(--forest-deep)', margin: '0 0 1rem 0' }}>
                        Link a New Article or Essay
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                            Article Title
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. The Quiet Magic of Reading Classics"
                            value={newArticleTitle}
                            onChange={(e) => setNewArticleTitle(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.65rem 0.9rem',
                              borderRadius: '10px',
                              border: '1.5px solid var(--border-warm)',
                              background: 'var(--bg-surface-soft)',
                              fontFamily: 'inherit',
                              fontSize: '0.9rem'
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                            Platform
                          </label>
                          <select
                            value={newArticlePlatform}
                            onChange={(e) => setNewArticlePlatform(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.65rem 0.9rem',
                              borderRadius: '10px',
                              border: '1.5px solid var(--border-warm)',
                              background: 'var(--bg-surface-soft)',
                              fontFamily: 'inherit',
                              fontSize: '0.9rem'
                            }}
                          >
                            <option value="Substack">Substack</option>
                            <option value="Medium">Medium</option>
                            <option value="LinkedIn">LinkedIn</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ marginBottom: '1.2rem' }}>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                          Article URL
                        </label>
                        <input
                          type="url"
                          required
                          placeholder="https://substack.com/@username/your-essay"
                          value={newArticleUrl}
                          onChange={(e) => setNewArticleUrl(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.9rem',
                            borderRadius: '10px',
                            border: '1.5px solid var(--border-warm)',
                            background: 'var(--bg-surface-soft)',
                            fontFamily: 'inherit',
                            fontSize: '0.9rem'
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '0.8rem' }}>
                        <button type="submit" className="btn-search-atelier" style={{ padding: '0.55rem 1.4rem', fontSize: '0.85rem' }}>
                          Save to Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddArticleForm(false)}
                          style={{ background: 'transparent', border: '1px solid var(--border-warm)', padding: '0.55rem 1.2rem', borderRadius: '9999px', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Articles Grid */}
                  {userArticles.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4.5rem 1.5rem', background: 'var(--bg-surface)', borderRadius: '20px', border: '1px dashed var(--border-warm)' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>✍️</div>
                      <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', color: 'var(--forest-deep)', marginBottom: '0.4rem' }}>
                        No articles or essays linked yet.
                      </p>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.4rem' }}>
                        Share your published thoughts, reviews, or Substack essays with readers.
                      </p>
                      <button
                        className="btn-search-atelier"
                        style={{ padding: '0.6rem 1.6rem', fontSize: '0.86rem' }}
                        onClick={() => setShowAddArticleForm(true)}
                      >
                        + Link Your First Article
                      </button>
                    </div>
                  ) : (
                    <div className="profile-articles-grid">
                      {userArticles.map((art) => (
                        <div key={art.id} className="profile-article-card">
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                              <span className={`profile-platform-tag profile-platform-${art.platform?.toLowerCase().replace(/\s+/g, '') || 'other'}`}>
                                {art.platform || 'Article'}
                              </span>
                              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                {art.date}
                              </span>
                            </div>

                            <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', color: 'var(--forest-deep)', margin: '0 0 0.5rem 0', lineHeight: 1.35 }}>
                              {art.title}
                            </h4>

                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {art.url}
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.8rem', borderTop: '1px solid var(--border-warm)' }}>
                            <a
                              href={art.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: 'var(--forest-deep)',
                                textDecoration: 'none',
                                fontSize: '0.84rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem'
                              }}
                            >
                              <span>Read on {art.platform}</span>
                              <span style={{ fontSize: '0.9rem' }}>↗</span>
                            </a>

                            <button
                              onClick={() => handleDeleteArticle(art.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#DC2626',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                padding: '0.2rem 0.4rem'
                              }}
                              title="Remove article"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: FAVORITE BOOK QUOTES */}
              {profileActiveTab === 'quotes' && (
                <div>
                  <div className="profile-section-topbar">
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', color: 'var(--forest-deep)', margin: 0 }}>
                        Your Favorite Book Quotes & Passages
                      </h3>
                      <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '0.3rem 0 0 0' }}>
                        Your quiet journal of memorable lines, passages, and words that stayed with you.
                      </p>
                    </div>

                    <button
                      className="btn-search-atelier"
                      style={{ padding: '0.55rem 1.3rem', fontSize: '0.84rem' }}
                      onClick={() => setShowAddQuoteForm(!showAddQuoteForm)}
                    >
                      {showAddQuoteForm ? '✕ Close Form' : '+ Save a Quote'}
                    </button>
                  </div>

                  {/* Add Quote Form */}
                  {showAddQuoteForm && (
                    <form onSubmit={handleAddQuote} className="profile-form-box">
                      <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', color: 'var(--forest-deep)', margin: '0 0 1rem 0' }}>
                        Add a Memorable Passage
                      </h4>

                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                          Quote or Passage Text
                        </label>
                        <textarea
                          required
                          rows={3}
                          placeholder="Paste the lines that touched your soul..."
                          value={newQuoteText}
                          onChange={(e) => setNewQuoteText(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.75rem 0.9rem',
                            borderRadius: '10px',
                            border: '1.5px solid var(--border-warm)',
                            background: 'var(--bg-surface-soft)',
                            fontFamily: 'inherit',
                            fontSize: '0.9rem',
                            lineHeight: 1.6
                          }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                            Author
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Donna Tartt"
                            value={newQuoteAuthor}
                            onChange={(e) => setNewQuoteAuthor(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.65rem 0.9rem',
                              borderRadius: '10px',
                              border: '1.5px solid var(--border-warm)',
                              background: 'var(--bg-surface-soft)',
                              fontFamily: 'inherit',
                              fontSize: '0.9rem'
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                            Book Title (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. The Secret History"
                            value={newQuoteBook}
                            onChange={(e) => setNewQuoteBook(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.65rem 0.9rem',
                              borderRadius: '10px',
                              border: '1.5px solid var(--border-warm)',
                              background: 'var(--bg-surface-soft)',
                              fontFamily: 'inherit',
                              fontSize: '0.9rem'
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.8rem' }}>
                        <button type="submit" className="btn-search-atelier" style={{ padding: '0.55rem 1.4rem', fontSize: '0.85rem' }}>
                          Save Quote
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddQuoteForm(false)}
                          style={{ background: 'transparent', border: '1px solid var(--border-warm)', padding: '0.55rem 1.2rem', borderRadius: '9999px', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Quotes Grid */}
                  {userQuotes.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4.5rem 1.5rem', background: 'var(--bg-surface)', borderRadius: '20px', border: '1px dashed var(--border-warm)' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>🕯️</div>
                      <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', color: 'var(--forest-deep)', marginBottom: '0.4rem' }}>
                        Your quote collection is quiet.
                      </p>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.4rem' }}>
                        Save lines, passages, and thoughts from books that stayed with you.
                      </p>
                      <button
                        className="btn-search-atelier"
                        style={{ padding: '0.6rem 1.6rem', fontSize: '0.86rem' }}
                        onClick={() => setShowAddQuoteForm(true)}
                      >
                        + Save Your First Quote
                      </button>
                    </div>
                  ) : (
                    <div className="profile-quotes-grid">
                      {userQuotes.map((q) => (
                        <div key={q.id} className="profile-quote-card">
                          <span className="profile-quote-mark">“</span>
                          <div className="profile-quote-text">
                            "{q.quote}"
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '0.8rem', borderTop: '1px solid var(--border-warm)' }}>
                            <div>
                              <div className="profile-quote-author">
                                — {q.author || 'Unknown Author'}
                              </div>
                              {q.book && (
                                <div className="profile-quote-book">
                                  from {q.book}
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => handleDeleteQuote(q.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#DC2626',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                padding: '0.2rem 0.4rem'
                              }}
                              title="Delete quote"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      )}

      {/* ================= PAGE: THE READER COMMUNITY ================= */}
      {currentPage === 'community' && (
        <main className="editorial-page-container">
          {/* Hero Header */}
          <div className="editorial-page-hero" style={{ marginBottom: '3.5rem', textAlign: 'center' }}>
            <h1 className="editorial-page-title">
              The Community
            </h1>

            <p className="editorial-page-subtitle" style={{ maxWidth: '680px', margin: '0 auto 2.2rem auto', fontSize: '1.08rem', lineHeight: 1.8 }}>
              A shared space where book lovers discover new reads through each other, and chat about the lines that stayed with them.
            </p>

            <div>
              <button
                className="btn-search-atelier"
                onClick={() => setShowCommunityForm(!showCommunityForm)}
                style={{ padding: '0.85rem 2.2rem', fontSize: '0.94rem', fontWeight: 700 }}
              >
                {showCommunityForm ? '✕ Close Recommendation Form' : 'Recommend a Book to Fellow Readers →'}
              </button>
            </div>
          </div>

          {/* Expandable Form: Share a Book with Community */}
          {showCommunityForm && (
            <div className="recommend-card-box" style={{ marginBottom: '3.5rem', animation: 'fadeIn 0.3s ease' }}>
              <form onSubmit={handleCreateCommunityPost}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '1.2rem',
                  marginBottom: '2rem',
                  borderBottom: '1.5px solid var(--border-warm)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <h3 style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '1.35rem',
                      color: 'var(--forest-deep)',
                      margin: 0
                    }}>
                      Talk About Your Favourite Books with the Community ❤️
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCommunityForm(false)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}
                  >
                    ✕
                  </button>
                </div>

                {/* 2x2 Symmetrical Grid: 4 Input Boxes */}
                <div className="recommend-grid-even" style={{ gap: '1.6rem 1.5rem', marginBottom: '1.8rem' }}>
                  {/* Box 1: Book Title */}
                  <div>
                    <label className="recommend-label">
                      <span>Book Title</span> <span style={{ color: '#E11D48' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="recommend-input"
                      placeholder="e.g. Atomic Habits"
                      value={commBookTitle}
                      onChange={(e) => setCommBookTitle(e.target.value)}
                    />
                  </div>

                  {/* Box 2: Author Name */}
                  <div>
                    <label className="recommend-label">
                      <span>Author Name</span> <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
                    </label>
                    <input
                      type="text"
                      className="recommend-input"
                      placeholder="e.g. James Clear"
                      value={commBookAuthor}
                      onChange={(e) => setCommBookAuthor(e.target.value)}
                    />
                  </div>

                  {/* Box 3: Theme */}
                  <div>
                    <label className="recommend-label">
                      <span>Reading Theme / Category</span> <span style={{ color: '#E11D48' }}>*</span>
                    </label>
                    <select
                      required
                      className="recommend-input"
                      value={commGenre}
                      onChange={(e) => setCommGenre(e.target.value)}
                    >
                      <option value="" disabled>Select a Theme...</option>
                      {COMMUNITY_GENRES.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  {/* Box 4: Favorite Quote */}
                  <div>
                    <label className="recommend-label">
                      <span>Favorite Line / Quote</span> <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
                    </label>
                    <input
                      type="text"
                      className="recommend-input"
                      placeholder='e.g. "1% better every day."'
                      value={commQuote}
                      onChange={(e) => setCommQuote(e.target.value)}
                      style={{ fontStyle: 'italic' }}
                    />
                  </div>
                </div>

                {/* Row 3: Why it stayed with you */}
                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--forest-deep)', marginBottom: '0.55rem' }}>
                    A few words on this read <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <textarea
                    rows={5}
                    required
                    className="recommend-textarea"
                    placeholder="Tell us like you're recommending it to a friend over chai — did it change your perspective, make you smile, or stay with you long after the last page? No fancy review needed, just your honest thoughts..."
                    value={commWhyLoved}
                    onChange={(e) => setCommWhyLoved(e.target.value)}
                  />
                </div>

                {/* Row 4: Your Name & Reader Headline */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.2rem', marginBottom: '1.6rem' }}>
                  <div>
                    <label className="recommend-label">
                      <span>Your Name or Alias</span> <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
                    </label>
                    <input
                      type="text"
                      className="recommend-input"
                      placeholder="e.g. Simran Chaudhary"
                      value={commAuthorName}
                      onChange={(e) => setCommAuthorName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="recommend-label">
                      <span>Reader Headline / Tagline</span> <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
                    </label>
                    <input
                      type="text"
                      className="recommend-input"
                      placeholder="e.g. Student, Software Engineer, Avid Reader"
                      value={commAuthorRole}
                      onChange={(e) => setCommAuthorRole(e.target.value)}
                    />
                  </div>
                </div>

                <p style={{
                  fontFamily: 'var(--font-heading)',
                  fontStyle: 'italic',
                  fontVariationSettings: "'SOFT' 100, 'WONK' 0",
                  fontSize: '1.05rem',
                  lineHeight: 1.6,
                  color: 'var(--forest-deep)',
                  margin: '0.6rem 0 2.2rem 0',
                  opacity: 0.9
                }}>
                  Your recommendation will be published directly on this community feed with your chosen name.
                </p>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <button
                    type="submit"
                    className="btn-search-atelier"
                    style={{ padding: '0.85rem 2.4rem', fontSize: '0.96rem', fontWeight: 700 }}
                  >
                    Share with the Community
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCommunityForm(false)}
                    style={{
                      background: 'transparent',
                      border: '1.5px solid var(--border-warm)',
                      padding: '0.85rem 1.8rem',
                      borderRadius: '9999px',
                      cursor: 'pointer',
                      fontSize: '0.92rem',
                      fontWeight: 600,
                      color: 'var(--text-muted)'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Genre Filter Pills */}
          <div style={{ maxWidth: '820px', margin: '0 auto 2.2rem auto' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.85rem',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.08em', color: 'var(--forest-deep)' }}>
                Browse by Theme
              </span>
              <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Showing {filteredCommunityPosts.length} {filteredCommunityPosts.length === 1 ? 'recommendation' : 'recommendations'}
              </span>
            </div>

            <div className="community-genre-pill-bar">
              <button
                className={`shelf-subfilter-btn ${communityGenreFilter === 'all' ? 'active' : ''}`}
                onClick={() => setCommunityGenreFilter('all')}
                style={{ whiteSpace: 'nowrap' }}
              >
                All ({communityPosts.length})
              </button>
              {COMMUNITY_GENRES.map((genre) => {
                const count = communityPosts.filter((p) => (p.genre || 'Other') === genre).length
                return (
                  <button
                    key={genre}
                    className={`shelf-subfilter-btn ${communityGenreFilter === genre ? 'active' : ''}`}
                    onClick={() => setCommunityGenreFilter(genre)}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {genre} {count > 0 ? `(${count})` : ''}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Community Feed Cards */}
          <div className="community-feed-container">
            {filteredCommunityPosts.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3.5rem 1.8rem',
                background: 'var(--bg-surface)',
                border: '1.5px dashed var(--border-warm)',
                borderRadius: '24px'
              }}>
                <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem', color: 'var(--forest-deep)', marginBottom: '0.6rem' }}>
                  No recommendations in "{communityGenreFilter}" yet
                </p>
                <p style={{ fontSize: '0.94rem', color: 'var(--text-muted)', marginBottom: '1.6rem', maxWidth: '480px', margin: '0 auto 1.6rem auto', lineHeight: 1.6 }}>
                  Be the first fellow reader to share a book that moved you in this category!
                </p>
                <button
                  className="btn-search-atelier"
                  onClick={() => {
                    setCommGenre(communityGenreFilter)
                    setShowCommunityForm(true)
                  }}
                  style={{ padding: '0.8rem 2rem', fontSize: '0.92rem' }}
                >
                  Recommend a {communityGenreFilter} Book
                </button>
                {communityPosts.length === 0 && (
                  <button
                    type="button"
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-warm)',
                      padding: '0.75rem 1.6rem',
                      borderRadius: '9999px',
                      cursor: 'pointer',
                      fontSize: '0.88rem',
                      color: 'var(--text-muted)',
                      marginLeft: '0.8rem'
                    }}
                    onClick={() => setCommunityPosts(INITIAL_COMMUNITY_POSTS)}
                  >
                    Restore Sample Recommendations
                  </button>
                )}
              </div>
            ) : (
              filteredCommunityPosts.map((post) => {
                const isSaved = savedBooks.some(
                  (b) => b.title && b.title.toLowerCase() === post.book_title.toLowerCase()
                )

                return (
                  <article key={post.id} className="community-post-card">
                    {/* Author Header */}
                    <div className="community-author-row">
                      <div className="community-author-info">
                        <img
                          src={getAuthorAvatar(post.author_name, post.avatar, post.gender)}
                          alt={post.author_name || 'Reader'}
                          className="community-avatar-img"
                        />

                        <div>
                          <div style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: 'var(--text-muted)',
                            marginBottom: '0.18rem',
                            lineHeight: 1
                          }}>
                            Recommended by
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-dark)' }}>
                              {post.author_name || 'Reader'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            {post.author_role || 'Reader'}{post.date ? ` • ${post.date}` : ''}
                          </div>
                        </div>
                      </div>

                      <span className="community-genre-badge">
                        {post.genre || 'Other'}
                      </span>
                    </div>

                    {/* Highlighted 3D Book & Info Showcase */}
                    <div className="community-book-box">
                      <CommunityBookCover
                        cover={post.book_cover}
                        title={post.book_title}
                        author={post.book_author}
                        genre={post.genre}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{
                          fontFamily: 'var(--font-heading)',
                          fontSize: '1.75rem',
                          lineHeight: 1.22,
                          color: 'var(--forest-deep)',
                          margin: '0 0 0.45rem 0',
                          letterSpacing: '-0.015em'
                        }}>
                          {post.book_title}
                        </h3>
                        <div style={{ fontSize: '0.98rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                          by {post.book_author}
                        </div>
                      </div>
                    </div>

                    {/* Reader's Thoughts */}
                    <div style={{ marginTop: '1.4rem', marginBottom: '1.4rem', textAlign: 'center', padding: '0.2rem 0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.85rem' }}>
                        <span className="quote-badge-pill" style={{ marginBottom: 0, padding: '0.35rem 0.95rem', fontSize: '0.68rem', letterSpacing: '0.12em' }}>
                          A Few Words on This Read
                        </span>
                      </div>
                      <p style={{
                        fontSize: '0.96rem',
                        lineHeight: 1.72,
                        color: 'var(--text-dark)',
                        margin: '0 auto',
                        maxWidth: '100%',
                        textAlign: 'center'
                      }}>
                        {post.why_loved}
                      </p>
                    </div>

                    {/* Favorite Quote (styled elegantly like A Note from the Creator) */}
                    {post.favorite_quote && (
                      <div style={{ marginTop: '1.5rem', marginBottom: '1.6rem', textAlign: 'center', padding: '0.4rem 0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                          <span className="quote-badge-pill" style={{ marginBottom: 0, padding: '0.35rem 0.95rem', fontSize: '0.68rem', letterSpacing: '0.12em' }}>
                            Favorite Line / Quote
                          </span>
                        </div>
                        <p
                          className="literary-quote-text"
                          style={{
                            fontSize: '1.22rem',
                            lineHeight: 1.68,
                            margin: '0 auto',
                            maxWidth: '100%',
                            textAlign: 'center'
                          }}
                        >
                          “{post.favorite_quote.replace(/^[“"']+|[”"']+$/g, '')}”
                        </p>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="community-actions-bar">
                      <div
                        className={`community-action-btn ${post.user_liked ? 'liked' : ''}`}
                        style={{ padding: 0, display: 'inline-flex', alignItems: 'center', userSelect: 'none' }}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleLike(post.id)}
                          title={post.user_liked ? 'Unlike' : 'Like'}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '0.55rem 0.15rem 0.55rem 1.05rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            color: 'inherit',
                            fontFamily: 'inherit'
                          }}
                        >
                          <span style={{ fontSize: '0.96rem' }}>{post.user_liked ? '❤️' : '🤍'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowLikesModal(post)
                          }}
                          title="See who liked this"
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '0.55rem 1.05rem 0.55rem 0.25rem',
                            cursor: 'pointer',
                            color: 'inherit',
                            fontFamily: 'inherit',
                            fontSize: '0.86rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                        >
                          {post.likes} {post.likes === 1 ? 'Like' : 'Likes'}
                        </button>
                      </div>

                      <button
                        className="community-action-btn"
                        onClick={() => handleToggleComments(post.id)}
                      >
                        <span>💬</span>
                        <span>{post.comments?.length || 0} {post.comments?.length === 1 ? 'Thought' : 'Thoughts'}</span>
                      </button>

                      <button
                        className={`community-action-btn ${isSaved ? 'saved' : ''}`}
                        onClick={() => toggleSaveBook({
                          title: post.book_title,
                          authors: post.book_author,
                          genres: 'Community Recommendation',
                          description: post.why_loved,
                          average_rating: 4.5
                        })}
                      >
                        <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>{isSaved ? '★' : '☆'}</span>
                        <span>{isSaved ? 'On Your Shelf' : 'Save to My Shelf'}</span>
                      </button>

                      {canManageCommunityPost(post) && (
                        <button
                          type="button"
                          className="community-action-btn"
                          style={{ color: '#DC2626', marginLeft: 'auto' }}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (window.confirm(`Are you sure you want to delete "${post.book_title}" from the community?`)) {
                              handleDeleteCommunityPost(post.id)
                            }
                          }}
                          title="Delete recommendation"
                        >
                          <span style={{ fontSize: '0.95rem' }}>🗑️</span>
                          <span>Delete</span>
                        </button>
                      )}
                    </div>

                    {/* Instagram-Style Thoughts / Comments Thread */}
                    {openComments[post.id] && (
                      <div className="community-comments-thread">
                        {/* Comment Items */}
                        {post.comments && post.comments.length > 0 ? (() => {
                          const { topLevel, repliesByParent } = getCommentThreads(post.comments)
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                              {topLevel.map((comment) => (
                                <div key={comment.id}>
                                  {/* Top-Level Comment */}
                                  <div className="community-comment-row">
                                    <img
                                      src={getCommentAvatar(comment)}
                                      alt={comment.author_name || 'Reader'}
                                      className="community-comment-avatar-img"
                                    />
                                    <div className="community-comment-content">
                                      <div style={{ fontSize: '0.9rem', lineHeight: 1.55, color: 'var(--text-dark)' }}>
                                        <span style={{ fontWeight: 700, color: 'var(--forest-deep)', marginRight: '0.45rem' }}>
                                          {comment.author_name || comment.author || 'Reader'}
                                        </span>
                                        {comment.text || comment.content}
                                      </div>
                                      <div className="community-comment-meta">
                                        <span>{comment.date || 'Recently'}</span>
                                        <button
                                          type="button"
                                          className="community-reply-btn"
                                          onClick={() => {
                                            setReplyingTo((prev) => ({ ...prev, [post.id]: { id: comment.id, name: comment.author_name || comment.author || 'Reader' } }))
                                            setCommentInputs((prev) => ({
                                              ...prev,
                                              [post.id]: `@${comment.author_name || comment.author || 'Reader'} `
                                            }))
                                            const inputEl = document.getElementById(`comment-input-${post.id}`)
                                            if (inputEl) inputEl.focus()
                                          }}
                                        >
                                          Reply
                                        </button>
                                        {canDeleteComment(post, comment) && (
                                          <button
                                            type="button"
                                            className="community-delete-btn"
                                            onClick={() => handleDeleteComment(post.id, comment.id)}
                                          >
                                            Delete
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Nested Replies (4-Tab Spaces / Indented like Instagram) */}
                                  {repliesByParent[comment.id] && repliesByParent[comment.id].map((reply) => (
                                    <div key={reply.id} className="community-comment-row reply-nested">
                                      <img
                                        src={getCommentAvatar(reply)}
                                        alt={reply.author_name || 'Reader'}
                                        className="community-comment-avatar-img reply-avatar-img"
                                      />
                                      <div className="community-comment-content">
                                        <div style={{ fontSize: '0.88rem', lineHeight: 1.55, color: 'var(--text-dark)' }}>
                                          <span style={{ fontWeight: 700, color: 'var(--forest-deep)', marginRight: '0.45rem' }}>
                                            {reply.author_name || reply.author || 'Reader'}
                                          </span>
                                          {reply.text || reply.content}
                                        </div>
                                        <div className="community-comment-meta">
                                          <span>{reply.date || 'Recently'}</span>
                                          <button
                                            type="button"
                                            className="community-reply-btn"
                                            onClick={() => {
                                              setReplyingTo((prev) => ({ ...prev, [post.id]: { id: comment.id, name: reply.author_name || reply.author || 'Reader' } }))
                                              setCommentInputs((prev) => ({
                                                ...prev,
                                                [post.id]: `@${reply.author_name || reply.author || 'Reader'} `
                                              }))
                                              const inputEl = document.getElementById(`comment-input-${post.id}`)
                                              if (inputEl) inputEl.focus()
                                            }}
                                          >
                                            Reply
                                          </button>
                                          {canDeleteComment(post, reply) && (
                                            <button
                                              type="button"
                                              className="community-delete-btn"
                                              onClick={() => handleDeleteComment(post.id, reply.id)}
                                            >
                                              Delete
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )
                        })() : (
                          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0.4rem 0 0.8rem 0' }}>
                            No thoughts shared yet. Be the first to share one!
                          </p>
                        )}

                        {/* Replying indicator */}
                        {replyingTo[post.id] && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.35rem 0.85rem',
                            background: 'rgba(18, 30, 23, 0.05)',
                            borderRadius: '10px',
                            fontSize: '0.78rem',
                            color: 'var(--forest-deep)',
                            marginTop: '0.8rem',
                            marginBottom: '-0.4rem'
                          }}>
                            <span>Replying to <strong>@{replyingTo[post.id]?.name || 'Reader'}</strong></span>
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingTo((prev) => ({ ...prev, [post.id]: null }))
                                setCommentInputs((prev) => ({ ...prev, [post.id]: '' }))
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                color: 'var(--text-muted)'
                              }}
                            >
                              ✕ Cancel
                            </button>
                          </div>
                        )}

                        {/* Sleek Instagram-style Input Bar */}
                        <form
                          onSubmit={(e) => handleAddComment(post.id, e)}
                          className="community-input-bar"
                        >
                          <img
                            src={currentAvatarSrc}
                            alt="Your profile"
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              flexShrink: 0,
                              marginRight: '0.65rem',
                              border: '1.5px solid var(--border-warm)'
                            }}
                          />
                          <input
                            id={`comment-input-${post.id}`}
                            type="text"
                            required
                            placeholder={`Add a thought on "${post.book_title}"...`}
                            value={commentInputs[post.id] || ''}
                            onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                            className="community-input-field"
                          />
                          <button
                            type="submit"
                            className="community-post-btn"
                          >
                            Post
                          </button>
                        </form>
                      </div>
                    )}
                  </article>
                )
              })
            )}
          </div>
        </main>
      )}

      {/* 8. Multi-Column Luxury Footer */}
      <footer className="footer-atelier">
        <div className="footer-top-grid">
          <div className="footer-brand" style={{ maxWidth: '380px' }}>
            <h4>ShelfKnows</h4>
            <p style={{ fontSize: '0.88rem', lineHeight: 1.75, color: 'rgba(255, 255, 255, 0.75)', margin: 0 }}>
              Step into an intelligent library crafted for lovers of deep reading. Tell us what you love or how you feel, and let ShelfKnows uncover the stories meant for you.
            </p>
          </div>

          <div className="footer-col footer-col-center">
            <h5>Explore</h5>
            <ul className="footer-links-list">
              <li><button onClick={() => navigateTo('home')}>Home</button></li>
              <li><button onClick={() => navigateTo('authors')}>Authors</button></li>
              <li><button onClick={() => navigateTo('articles')}>The Reading Room</button></li>
              <li><button onClick={() => navigateTo('about')}>About ShelfKnows</button></li>
            </ul>
          </div>

          <div className="footer-brand" style={{ maxWidth: '380px', justifySelf: 'end' }}>
            <h5 style={{
              fontSize: '0.88rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--gold-accent)',
              margin: '0 0 1rem 0'
            }}>
              The Community
            </h5>
            <p style={{ fontSize: '0.88rem', lineHeight: 1.75, color: 'rgba(255, 255, 255, 0.75)', margin: 0 }}>
              A warm, quiet corner where book lovers leave behind the stories that touched their lives, share favorite lines, and connect over thoughtful reads.
            </p>
            <div style={{ marginTop: '0.85rem', fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.75)', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span>Visit the</span>
              <button
                className="footer-about-link-btn"
                onClick={() => {
                  navigateTo('community')
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              >
                <span>Community</span>
                <span style={{ fontSize: '0.85rem' }}>→</span>
              </button>
            </div>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <div className="footer-social-icons">
            <a
              href="https://www.linkedin.com/in/simranchaudhary07/"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-icon-btn"
              title="Connect on LinkedIn"
              aria-label="LinkedIn"
            >
              <svg width="25" height="25" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
            </a>
            <a
              href="https://github.com/its-simran-ch"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-icon-btn"
              title="View GitHub Profile"
              aria-label="GitHub"
            >
              <svg width="25" height="25" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
            </a>
          </div>

          <div className="footer-copyright-text">
            © 2026 ShelfKnows. Where intuition meets the stories you were looking for.
          </div>

          <button
            className="footer-scroll-top-btn"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            title="Back to Top"
            aria-label="Back to Top"
          >
            ↑
          </button>
        </div>
      </footer>

      {/* --- MODAL 1: Book Detail Modal Popup --- */}
      {selectedBook && (
        <div
          className="modal-backdrop-atelier book-detail-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedBook(null) }}
        >
          <div className="modal-card-atelier">
            <div className="modal-header-atelier">
              <span className="hero-editorial-badge" style={{ margin: 0 }}>
                {selectedBook.published_year ? `Published ${selectedBook.published_year}` : 'Goodreads Edition'}
              </span>
              <button className="modal-close-round" onClick={() => setSelectedBook(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div style={{ width: '180px', height: '260px', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-hover)', background: 'var(--bg-surface-soft)' }}>
                {selectedBook.image_url ? (
                  <img src={selectedBook.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-light)' }}>
                    No Cover
                  </div>
                )}
              </div>

              <div style={{ flex: 1, minWidth: '280px' }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', color: 'var(--forest-deep)', marginBottom: '0.4rem' }}>
                  {selectedBook.title}
                </h2>
                <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  By {selectedBook.authors || 'Unknown Author'}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', fontWeight: 700 }}>
                  <span className="rating-star-gold">★</span>
                  <span>{selectedBook.average_rating ? Number(selectedBook.average_rating).toFixed(2) : '4.0'} / 5.0</span>
                </div>

                <div style={{ background: 'var(--bg-surface-soft)', border: '1px solid var(--border-warm)', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem', maxHeight: '160px', overflowY: 'auto' }}>
                  <strong style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--forest-deep)', marginBottom: '0.35rem' }}>
                    Plot Synopsis
                  </strong>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    {selectedBook.description || "Detailed synopsis available in catalog edition."}
                  </p>
                </div>

                {selectedBook.ai_explanation && (
                  <div className="curator-note-card" style={{ marginBottom: '1.5rem' }}>
                    <div className="curator-note-title">Why This Was Picked For You?</div>
                    <div className="curator-note-text">{selectedBook.ai_explanation}</div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.8rem' }}>
                  <button
                    className="btn-search-atelier"
                    style={{ background: isBookSaved(selectedBook) ? 'var(--gold-ribbon)' : 'var(--forest-deep)' }}
                    onClick={() => toggleSaveBook(selectedBook)}
                  >
                    {isBookSaved(selectedBook) ? '★ On Your Shelf' : '☆ Save to My Shelf'}
                  </button>

                  <button
                    className="inspiration-chip-btn"
                    style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
                    onClick={() => {
                      const nextQ = `books like ${selectedBook.title}`
                      setQuery(nextQ)
                      setSelectedBook(null)
                      handleSearch(nextQ)
                    }}
                  >
                    Discover More Like This
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: My Reading Shelf Modal --- */}
      {showShelfModal && (
        <div
          className="modal-backdrop-atelier"
          onClick={(e) => { if (e.target === e.currentTarget) setShowShelfModal(false) }}
        >
          <div className="modal-card-atelier" style={{ maxWidth: '650px' }}>
            <div className="modal-header-atelier">
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', color: 'var(--forest-deep)' }}>
                  My Reading Shelf
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {savedBooks.length} saved {savedBooks.length === 1 ? 'title' : 'titles'} in your local library
                </span>
              </div>
              <button className="modal-close-round" onClick={() => setShowShelfModal(false)}>✕</button>
            </div>

            {savedBooks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                <p style={{ fontFamily: 'var(--font-heading)', fontStyle: 'italic', fontSize: '1.2rem', color: 'var(--forest-deep)', marginBottom: '0.4rem' }}>
                  Your shelf is currently empty.
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  Click the bookmark ribbon on any book card to save it here for later.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '55vh', overflowY: 'auto' }}>
                {savedBooks.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'var(--bg-surface-soft)',
                      border: '1px solid var(--border-warm)',
                      borderRadius: '12px',
                      padding: '0.75rem 1rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      {item.image_url ? (
                        <img src={item.image_url} alt="" style={{ width: '42px', height: '60px', borderRadius: '6px', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '42px', height: '60px', borderRadius: '6px', background: 'var(--border-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>📖</div>
                      )}
                      <div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--forest-deep)', fontSize: '1rem' }}>{item.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>By {item.authors}</div>
                      </div>
                    </div>

                    <button
                      style={{ background: 'transparent', border: 'none', color: '#DC2626', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: '0.3rem 0.6rem' }}
                      onClick={() => toggleSaveBook(item)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL 3: Auth Modal (Login / Sign Up / Forgot Password) --- */}
      {showAuthModal && (
        <div
          className="modal-backdrop-atelier"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAuthModal(false) }}
        >
          <div className="modal-card-atelier" style={{ maxWidth: '440px', padding: '2.2rem 2rem' }}>
            <div className="modal-header-atelier" style={{ marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.65rem', color: 'var(--forest-deep)', margin: 0 }}>
                  {authMode === 'signin' ? 'Welcome Back' : authMode === 'signup' ? 'Join ShelfKnows' : 'Reset Password'}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.3rem 0 0 0' }}>
                  {authMode === 'signin'
                    ? 'Sign in to access your synced reading shelf.'
                    : authMode === 'signup'
                    ? 'Create your personal corner for thoughtful reading.'
                    : 'Enter your registered email address to receive a password reset link.'}
                </p>
              </div>
              <button
                className="modal-close-round"
                onClick={() => {
                  setShowAuthModal(false)
                  setAuthError(null)
                  setAuthSuccessMsg(null)
                }}
              >
                ✕
              </button>
            </div>

            {/* Switch Tabs: Sign In vs Sign Up (hidden in forgot mode) */}
            {authMode !== 'forgot' && (
              <div style={{
                display: 'flex',
                background: 'var(--bg-surface-soft)',
                padding: '0.3rem',
                borderRadius: '9999px',
                marginBottom: '1.6rem',
                border: '1px solid var(--border-warm)'
              }}>
                <button
                  type="button"
                  onClick={() => { setAuthMode('signin'); setAuthError(null); setAuthSuccessMsg(null); }}
                  style={{
                    flex: 1,
                    padding: '0.55rem',
                    border: 'none',
                    borderRadius: '9999px',
                    background: authMode === 'signin' ? 'var(--forest-deep)' : 'transparent',
                    color: authMode === 'signin' ? '#FFFFFF' : 'var(--text-dark)',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('signup'); setAuthError(null); setAuthSuccessMsg(null); }}
                  style={{
                    flex: 1,
                    padding: '0.55rem',
                    border: 'none',
                    borderRadius: '9999px',
                    background: authMode === 'signup' ? 'var(--forest-deep)' : 'transparent',
                    color: authMode === 'signup' ? '#FFFFFF' : 'var(--text-dark)',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Create Account
                </button>
              </div>
            )}

            {/* Error & Success Messages */}
            {authError && (
              <div style={{
                background: '#FEF2F2',
                border: '1.2px solid #FCA5A5',
                color: '#991B1B',
                padding: '0.8rem 1rem',
                borderRadius: '12px',
                fontSize: '0.86rem',
                marginBottom: '1.2rem',
                lineHeight: 1.55
              }}>
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: authMode === 'signin' || (authMode === 'signup' && (authError.toLowerCase().includes('already registered') || authError.toLowerCase().includes('already exists'))) ? '0.45rem' : '0' }}>
                  <span>⚠️</span>
                  <span>{authError}</span>
                </div>
                {authMode === 'signin' && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-dark)', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.35rem' }}>
                    <div>
                      Forgot your password?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('forgot')
                          setAuthError(null)
                          setAuthSuccessMsg(null)
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--forest-deep)',
                          fontWeight: 800,
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '0.82rem'
                        }}
                      >
                        Reset Password ➔
                      </button>
                    </div>
                    <div>
                      Haven't created an account yet?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('signup')
                          setAuthError(null)
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--forest-deep)',
                          fontWeight: 800,
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '0.82rem'
                        }}
                      >
                        Click here to Create Account ➔
                      </button>
                    </div>
                  </div>
                )}
                {authMode === 'signup' && (authError.toLowerCase().includes('already registered') || authError.toLowerCase().includes('already exists')) && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-dark)', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.35rem' }}>
                    <div>
                      Already registered with this email?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('signin')
                          setAuthError(null)
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--forest-deep)',
                          fontWeight: 800,
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '0.82rem'
                        }}
                      >
                        Sign In here ➔
                      </button>
                    </div>
                    <div>
                      Forgot your password?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('forgot')
                          setAuthError(null)
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--forest-deep)',
                          fontWeight: 800,
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '0.82rem'
                        }}
                      >
                        Reset Password ➔
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {authSuccessMsg && (
              <div style={{
                background: '#D1FAE5',
                border: '1px solid #6EE7B7',
                color: '#065F46',
                padding: '0.65rem 0.9rem',
                borderRadius: '10px',
                fontSize: '0.84rem',
                marginBottom: '1.2rem',
                lineHeight: 1.5
              }}>
                {authSuccessMsg}
              </div>
            )}

            {/* Form */}
            <form onSubmit={authMode === 'signin' ? handleSignIn : authMode === 'signup' ? handleSignUp : handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="reader@shelfknows.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1.2px solid var(--border-warm)',
                    background: 'var(--bg-surface)',
                    fontSize: '0.92rem',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                />
                {authMode === 'signup' && authEmail.trim() && knownEmails.includes(authEmail.trim().toLowerCase()) && (
                  <div style={{
                    marginTop: '0.45rem',
                    padding: '0.55rem 0.85rem',
                    background: '#FEF3C7',
                    border: '1.2px solid #FCD34D',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    color: '#92400E',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.6rem',
                    lineHeight: 1.4
                  }}>
                    <span>⚠️ An account with this email already exists!</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signin')
                        setAuthError(null)
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#78350F',
                        fontWeight: 800,
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        padding: 0,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Sign In instead ➔
                    </button>
                  </div>
                )}
              </div>

              {authMode !== 'forgot' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dark)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Password
                    </label>
                    {authMode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('forgot')
                          setAuthError(null)
                          setAuthSuccessMsg(null)
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--forest-deep)',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      border: '1.2px solid var(--border-warm)',
                      background: 'var(--bg-surface)',
                      fontSize: '0.92rem',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              {/* Reader Profile Details (Only on Sign Up) */}
              {authMode === 'signup' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Simran"
                      value={authFullName}
                      onChange={(e) => setAuthFullName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        border: '1.2px solid var(--border-warm)',
                        background: 'var(--bg-surface)',
                        fontSize: '0.92rem',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Gender
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={() => setAuthGender('female')}
                        style={{
                          padding: '0.72rem 1rem',
                          borderRadius: '10px',
                          border: authGender === 'female' ? '2px solid var(--forest-deep)' : '1.2px solid var(--border-warm)',
                          background: authGender === 'female' ? 'var(--forest-deep)' : 'var(--bg-surface)',
                          color: authGender === 'female' ? '#FFFFFF' : 'var(--text-dark)',
                          fontSize: '0.92rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.18s ease',
                          textAlign: 'center'
                        }}
                      >
                        Female
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthGender('male')}
                        style={{
                          padding: '0.72rem 1rem',
                          borderRadius: '10px',
                          border: authGender === 'male' ? '2px solid var(--forest-deep)' : '1.2px solid var(--border-warm)',
                          background: authGender === 'male' ? 'var(--forest-deep)' : 'var(--bg-surface)',
                          color: authGender === 'male' ? '#FFFFFF' : 'var(--text-dark)',
                          fontSize: '0.92rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.18s ease',
                          textAlign: 'center'
                        }}
                      >
                        Male
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Reader Headline <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Student, Software Engineer, Avid Reader"
                      value={authHeadline}
                      onChange={(e) => setAuthHeadline(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        border: '1.2px solid var(--border-warm)',
                        background: 'var(--bg-surface)',
                        fontSize: '0.92rem',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="btn-search-atelier"
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  fontSize: '0.92rem',
                  marginTop: '0.4rem',
                  opacity: authLoading ? 0.7 : 1
                }}
              >
                {authLoading ? 'Please wait...' : (authMode === 'signin' ? 'Sign In to ShelfKnows' : authMode === 'signup' ? 'Create My Account' : 'Send Reset Link')}
              </button>
            </form>

            {/* Bottom Switcher Link */}
            <div style={{ textAlign: 'center', marginTop: '1.3rem', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              {authMode === 'forgot' ? (
                <span>
                  Remember your password?{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signin'); setAuthError(null); setAuthSuccessMsg(null); }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--forest-deep)', fontWeight: 800, cursor: 'pointer', padding: 0 }}
                  >
                    Sign In here ➔
                  </button>
                </span>
              ) : authMode === 'signin' ? (
                <span>
                  New to ShelfKnows?{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signup'); setAuthError(null); setAuthSuccessMsg(null); }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--forest-deep)', fontWeight: 800, cursor: 'pointer', padding: 0 }}
                  >
                    Create a free account
                  </button>
                </span>
              ) : (
                <span>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signin'); setAuthError(null); setAuthSuccessMsg(null); }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--forest-deep)', fontWeight: 800, cursor: 'pointer', padding: 0 }}
                  >
                    Sign In here
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: Update / Reset New Password --- */}
      {showResetPasswordModal && (
        <div
          className="modal-backdrop-atelier"
          onClick={(e) => { if (e.target === e.currentTarget && !resetPasswordSuccess) setShowResetPasswordModal(false) }}
        >
          <div
            className="modal-card-atelier"
            style={{ maxWidth: '440px', padding: '2.2rem 2rem' }}
          >
            <div className="modal-header-atelier" style={{ marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.65rem', color: 'var(--forest-deep)', margin: 0 }}>
                  Set a New Password
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.3rem 0 0 0' }}>
                  Please enter a new secure password for your ShelfKnows account.
                </p>
              </div>
              {!resetPasswordSuccess && (
                <button
                  className="modal-close-round"
                  onClick={() => setShowResetPasswordModal(false)}
                >
                  ✕
                </button>
              )}
            </div>

            {resetPasswordError && (
              <div style={{
                background: '#FEF2F2',
                border: '1.2px solid #FCA5A5',
                color: '#991B1B',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                fontSize: '0.86rem',
                marginBottom: '1.2rem'
              }}>
                ⚠️ {resetPasswordError}
              </div>
            )}

            {resetPasswordSuccess ? (
              <div style={{
                background: '#D1FAE5',
                border: '1px solid #6EE7B7',
                color: '#065F46',
                padding: '1.1rem',
                borderRadius: '12px',
                fontSize: '0.9rem',
                textAlign: 'center',
                lineHeight: 1.55
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>✓</div>
                <b>Password updated successfully!</b>
                <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.82rem', color: '#047857' }}>
                  You are now securely signed in with your new password.
                </p>
              </div>
            ) : (
              <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      border: '1.2px solid var(--border-warm)',
                      background: 'var(--bg-surface)',
                      fontSize: '0.92rem',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      border: '1.2px solid var(--border-warm)',
                      background: 'var(--bg-surface)',
                      fontSize: '0.92rem',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={resetPasswordLoading}
                  className="btn-search-atelier"
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    fontSize: '0.92rem',
                    marginTop: '0.4rem',
                    opacity: resetPasswordLoading ? 0.7 : 1
                  }}
                >
                  {resetPasswordLoading ? 'Updating password...' : 'Update Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL: Edit Reader Profile --- */}
      {showEditProfileModal && (
        <div
          className="modal-backdrop-atelier"
          onClick={(e) => { if (e.target === e.currentTarget) setShowEditProfileModal(false) }}
        >
          <div className="modal-card-atelier" style={{ maxWidth: '480px', padding: '2.2rem 2rem' }}>
            <div className="modal-header-atelier" style={{ marginBottom: '1.4rem' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.65rem', color: 'var(--forest-deep)', margin: 0 }}>
                  Edit Profile
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.3rem 0 0 0' }}>
                  Update your reader name, gender avatar, and bio anytime.
                </p>
              </div>
              <button
                className="modal-close-round"
                onClick={() => setShowEditProfileModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {/* Full Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Simran Chaudhary"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1.2px solid var(--border-warm)',
                    background: 'var(--bg-surface)',
                    fontSize: '0.92rem',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Gender */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Gender
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setEditGender('female')}
                    style={{
                      padding: '0.72rem 1rem',
                      borderRadius: '10px',
                      border: editGender === 'female' ? '2px solid var(--forest-deep)' : '1.2px solid var(--border-warm)',
                      background: editGender === 'female' ? 'var(--forest-deep)' : 'var(--bg-surface)',
                      color: editGender === 'female' ? '#FFFFFF' : 'var(--text-dark)',
                      fontSize: '0.92rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      textAlign: 'center'
                    }}
                  >
                    Female
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditGender('male')}
                    style={{
                      padding: '0.72rem 1rem',
                      borderRadius: '10px',
                      border: editGender === 'male' ? '2px solid var(--forest-deep)' : '1.2px solid var(--border-warm)',
                      background: editGender === 'male' ? 'var(--forest-deep)' : 'var(--bg-surface)',
                      color: editGender === 'male' ? '#FFFFFF' : 'var(--text-dark)',
                      fontSize: '0.92rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      textAlign: 'center'
                    }}
                  >
                    Male
                  </button>
                </div>
              </div>

              {/* Reader Headline */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Reader Headline <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>(Optional)</span>
                </label>
                <input
                  type="text"
                  value={editHeadline}
                  onChange={(e) => setEditHeadline(e.target.value)}
                  placeholder="e.g. Student, Software Engineer, Avid Reader, Creator of ShelfKnows"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1.2px solid var(--border-warm)',
                    background: 'var(--bg-surface)',
                    fontSize: '0.92rem',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Bio / Reflection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Reader Bio (Optional)
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Share a short note about your reading tastes or favorite books..."
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1.2px solid var(--border-warm)',
                    background: 'var(--bg-surface)',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-warm)',
                    color: 'var(--text-dark)',
                    padding: '0.55rem 1.2rem',
                    borderRadius: '9999px',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="btn-search-atelier"
                  style={{
                    padding: '0.55rem 1.5rem',
                    fontSize: '0.84rem',
                    borderRadius: '9999px',
                    opacity: editLoading ? 0.7 : 1
                  }}
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 4: Reader Profile Modal --- */}
      {showProfileModal && (
        <div
          className="modal-backdrop-atelier"
          onClick={(e) => { if (e.target === e.currentTarget) setShowProfileModal(false) }}
        >
          <div className="modal-card-atelier" style={{ maxWidth: '520px', padding: '2.2rem 2rem' }}>
            <div className="modal-header-atelier" style={{ marginBottom: '1.4rem' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.65rem', color: 'var(--forest-deep)', margin: 0 }}>
                  Reader Profile
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.3rem 0 0 0' }}>
                  Your personal reading identity and tastes on ShelfKnows.
                </p>
              </div>
              <button
                className="modal-close-round"
                onClick={() => setShowProfileModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Profile Avatar & Info Card */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.2rem',
              background: 'var(--bg-surface-soft)',
              padding: '1.2rem 1.4rem',
              borderRadius: '16px',
              border: '1px solid var(--border-warm)',
              marginBottom: '1.5rem'
            }}>
              <img
                src={currentAvatarSrc}
                alt="Profile Avatar"
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: 'none',
                  boxShadow: 'var(--shadow-sm)',
                  flexShrink: 0
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800, color: 'var(--forest-deep)' }}>
                  {profile?.full_name || user?.user_metadata?.full_name || 'Reader'}
                </div>
                <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {user?.email}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--forest-deep)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.3rem' }}>
                  Reader since November 2026
                </div>
              </div>
            </div>

            {/* Avatar Switcher */}
            <div style={{ marginBottom: '1.4rem' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.45rem' }}>
                Profile Avatar
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => handleAvatarChange('female')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.55rem 0.85rem',
                    borderRadius: '12px',
                    border: userAvatar === 'female' ? '2px solid var(--forest-deep)' : '1px solid var(--border-warm)',
                    background: userAvatar === 'female' ? '#FFFFFF' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: userAvatar === 'female' ? 'var(--shadow-sm)' : 'none'
                  }}
                >
                  <img src={FEMALE_AVATAR_SRC} alt="Female" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--forest-deep)' }}>Female</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{userAvatar === 'female' ? 'Active' : 'Switch'}</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleAvatarChange('male')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.55rem 0.85rem',
                    borderRadius: '12px',
                    border: userAvatar === 'male' ? '2px solid var(--forest-deep)' : '1px solid var(--border-warm)',
                    background: userAvatar === 'male' ? '#FFFFFF' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: userAvatar === 'male' ? 'var(--shadow-sm)' : 'none'
                  }}
                >
                  <img src={MALE_AVATAR_SRC} alt="Male" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--forest-deep)' }}>Male</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{userAvatar === 'male' ? 'Active' : 'Switch'}</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Reader Bio */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Reader Reflection & Bio
              </div>
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-warm)',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                fontSize: '0.9rem',
                fontStyle: 'italic',
                color: 'var(--text-dark)',
                lineHeight: 1.6
              }}>
                "{profile?.bio || 'A curious reader exploring quiet mysteries, thoughtful stories, and the secret psychology of books.'}"
              </div>
            </div>

            {/* 2026 Reading Goal Challenge */}
            <div style={{
              background: 'var(--bg-surface-soft)',
              border: '1px solid var(--border-warm)',
              borderRadius: '14px',
              padding: '1.1rem 1.25rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--forest-deep)' }}>
                  2026 Reading Challenge
                </span>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-dark)' }}>
                  {savedBooks.length} / {profile?.reading_goal || 12} Books Saved
                </span>
              </div>
              {/* Progress Bar */}
              <div style={{ width: '100%', height: '8px', background: 'var(--border-warm)', borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, Math.round((savedBooks.length / (profile?.reading_goal || 12)) * 100))}%`,
                  height: '100%',
                  background: 'var(--forest-deep)',
                  borderRadius: '9999px',
                  transition: 'width 0.4s ease'
                }} />
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                {savedBooks.length === 0
                  ? 'Start adding books to your reading shelf to track your progress.'
                  : `${Math.min(100, Math.round((savedBooks.length / (profile?.reading_goal || 12)) * 100))}% of your annual reading goal reached.`}
              </div>
            </div>

            {/* Reader Tastes */}
            <div style={{ marginBottom: '1.8rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Curated Tastes & Interests
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {['Fiction', 'Psychology & Non-Fiction', 'Mystery & Crime', 'Thought-Provoking'].map((theme, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-warm)',
                      color: 'var(--forest-deep)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      padding: '0.35rem 0.75rem',
                      borderRadius: '9999px'
                    }}
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', gap: '0.85rem' }}>
              <button
                type="button"
                className="btn-search-atelier"
                style={{ flex: 1, padding: '0.75rem', fontSize: '0.88rem' }}
                onClick={() => {
                  setShowProfileModal(false)
                  setShowShelfModal(true)
                }}
              >
                Open My Reading Shelf ({savedBooks.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false)
                  handleSignOut()
                }}
                style={{
                  padding: '0.75rem 1.2rem',
                  borderRadius: '9999px',
                  border: '1.2px solid #FCA5A5',
                  background: '#FEF2F2',
                  color: '#991B1B',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 5: Community Post Likes Modal --- */}
      {showLikesModal && (
        <div
          className="modal-backdrop-atelier"
          style={{ zIndex: 9999 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowLikesModal(null) }}
        >
          <div
            className="modal-card-atelier"
            style={{ maxWidth: '440px', padding: 0, overflow: 'hidden' }}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.2rem 1.4rem',
              borderBottom: '1px solid var(--border-warm)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <span style={{ fontSize: '1.2rem' }}>❤️</span>
                <h3 style={{
                  margin: 0,
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.25rem',
                  color: 'var(--forest-deep)',
                  fontWeight: 700
                }}>
                  Likes ({showLikesModal.liked_by?.length || showLikesModal.likes || 0})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLikesModal(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  lineHeight: 1,
                  padding: '0.2rem'
                }}
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Context Subtitle */}
            <div style={{
              padding: '0.65rem 1.4rem',
              background: 'rgba(197, 160, 89, 0.08)',
              fontSize: '0.82rem',
              color: 'var(--forest-deep)',
              borderBottom: '1px solid var(--border-warm)'
            }}>
              Readers who loved <strong>"{showLikesModal.book_title}"</strong>
            </div>

            {/* Scrollable Reader List */}
            <div style={{
              padding: '0.8rem 1.4rem 1.4rem 1.4rem',
              maxHeight: '380px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}>
              {showLikesModal.liked_by && showLikesModal.liked_by.length > 0 ? (
                showLikesModal.liked_by.map((liker, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <img
                        src={getAuthorAvatar(liker.name, liker.avatar, liker.gender)}
                        alt={liker.name || 'Reader'}
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--forest-deep)' }}>
                          {liker.name}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          {liker.role || 'Fellow Reader'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No likes yet on this recommendation.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default App
