import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, UserPlus, Check, XIcon, UserMinus, Users } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useFriends } from '../hooks/useFriends'
import { useFriendFlights } from '../hooks/useFriendFlights'
import { searchProfiles } from '../lib/friendships'
import { loadFriendMileages } from '../utils/mileageSupabase'
import { FriendFlightCard } from './FriendFlightCard'
import { FriendTripHistory } from './FriendTripHistory'
import type { Profile, FriendWithProfile, ActiveFlight } from '../types'

interface Props {
  onClose: () => void
  presenceMap: Map<string, { status: 'online' | 'flying'; userId: string; username: string }>
}

export function FriendsPanel({ onClose, presenceMap }: Props) {
  const { user } = useAuth()
  const userId = user?.id
  const { acceptedFriends, pendingReceived, pendingSent, friendUserIds, getFriendUserId, send, accept, reject, remove } = useFriends(userId)
  const { flights } = useFriendFlights(friendUserIds)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null)
  const [selectedFriendship, setSelectedFriendship] = useState<FriendWithProfile | null>(null)
  const [friendMileages, setFriendMileages] = useState<Map<string, { balance: number; totalEarned: number }>>(new Map())

  useEffect(() => {
    if (friendUserIds.length === 0) return
    loadFriendMileages(friendUserIds).then(setFriendMileages)
  }, [friendUserIds.join(',')])

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q)
    if (q.trim().length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    const results = await searchProfiles(q.trim())
    const allRelatedIds = new Set<string>()
    if (userId) allRelatedIds.add(userId)
    setSearchResults(results.filter(p => !allRelatedIds.has(p.id)))
    setSearching(false)
  }, [userId])

  const handleSelectFriend = useCallback((friendship: FriendWithProfile) => {
    const fid = friendship.user_id === userId ? friendship.friend_id : friendship.user_id
    setSelectedFriendId(fid)
    setSelectedFriendship(friendship)
  }, [userId])

  const isFriendOrPending = useCallback((profileId: string) => {
    return [...acceptedFriends, ...pendingSent, ...pendingReceived].some(
      f => f.user_id === profileId || f.friend_id === profileId
    )
  }, [acceptedFriends, pendingSent, pendingReceived])

  const getPresenceStatus = useCallback((uid: string): 'online' | 'flying' | 'offline' => {
    if (flights.has(uid)) return 'flying'
    const p = presenceMap.get(uid)
    if (p) return p.status
    return 'offline'
  }, [presenceMap, flights])

  const statusDotClass = (s: 'online' | 'flying' | 'offline') => {
    if (s === 'flying') return 'status-dot-flying'
    if (s === 'online') return 'status-dot-online'
    return 'status-dot-offline'
  }

  const selectedFlight: ActiveFlight | undefined = selectedFriendId ? flights.get(selectedFriendId) : undefined

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 z-20 bg-night-950"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[1001] w-8 h-8 flex items-center justify-center rounded-full bg-white/10 border border-white/10 hover:bg-white/20 transition-colors"
      >
        <X className="w-4 h-4 text-white/60" />
      </button>

      <div className="h-full flex">
        {/* Left sidebar */}
        <div className="w-[280px] h-full flex flex-col border-r border-white/10 bg-night-900">
          {/* Header */}
          <div className="px-4 pt-5 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-sky-400/70" />
              <span className="text-[13px] font-mono font-semibold text-white/70 tracking-wider">친구</span>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 bg-white/[0.08] border border-white/10 rounded-xl px-3 py-2.5">
              <Search className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
              <input
                type="text"
                placeholder="유저 검색"
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                className="flex-1 bg-transparent text-[13px] font-mono text-white/80 placeholder:text-white/30 outline-none"
              />
            </div>

            {/* Search results dropdown */}
            <AnimatePresence>
              {searchQuery.trim().length >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="mt-2 rounded-xl bg-night-800 border border-white/10 overflow-hidden max-h-[160px] overflow-y-auto"
                >
                  {searching ? (
                    <div className="px-3 py-3 text-[11px] text-white/40 text-center">검색 중...</div>
                  ) : searchResults.length === 0 ? (
                    <div className="px-3 py-3 text-[11px] text-white/40 text-center">결과 없음</div>
                  ) : (
                    searchResults.map(profile => (
                      <div key={profile.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-white/[0.06]">
                        <span className="text-[12px] font-mono text-white/70">{profile.username}</span>
                        {isFriendOrPending(profile.id) ? (
                          <span className="text-[10px] text-white/30">요청됨</span>
                        ) : (
                          <button
                            onClick={() => { send(profile.id); setSearchQuery(''); setSearchResults([]) }}
                            className="flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300 transition-colors"
                          >
                            <UserPlus className="w-3 h-3" />
                            요청
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Pending received requests */}
          {pendingReceived.length > 0 && (
            <div className="px-4 pt-3 pb-2 border-b border-white/10">
              <p className="text-[10px] font-mono text-sky-400/70 tracking-wider mb-2">받은 요청</p>
              <div className="space-y-1.5">
                {pendingReceived.map(f => (
                  <div key={f.id} className="flex items-center justify-between py-1">
                    <span className="text-[12px] font-mono text-white/60">{f.profile.username}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => accept(f.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
                        title="수락"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      </button>
                      <button
                        onClick={() => reject(f.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-red-500/10 hover:bg-red-500/20 transition-colors"
                        title="거절"
                      >
                        <XIcon className="w-3.5 h-3.5 text-red-400/60" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Friend list */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <p className="text-[10px] font-mono text-white/40 tracking-wider mb-3">
              친구 목록 <span className="text-sky-400/60">{acceptedFriends.length}</span>
            </p>

            {acceptedFriends.length === 0 ? (
              <div className="text-center py-10">
                <Users className="w-8 h-8 text-white/10 mx-auto mb-3" />
                <p className="text-[12px] text-white/30">아직 친구가 없습니다</p>
                <p className="text-[11px] text-white/20 mt-1">위에서 유저를 검색해 보세요</p>
              </div>
            ) : (
              <div className="space-y-1">
                {acceptedFriends.map(f => {
                  const fid = getFriendUserId(f)
                  const status = getPresenceStatus(fid)
                  const isSelected = selectedFriendId === fid
                  return (
                    <button
                      key={f.id}
                      onClick={() => handleSelectFriend(f)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                        isSelected
                          ? 'bg-sky-400/10 border border-sky-400/20'
                          : 'hover:bg-white/[0.06] border border-transparent'
                      }`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusDotClass(status)}`} />

                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className={`text-[12px] font-mono tracking-wide ${isSelected ? 'text-white/90' : 'text-white/60'}`}>
                            {f.profile.username}
                          </span>
                          {friendMileages.has(fid) && (
                            <span className="text-[9px] font-mono text-sky-400/50">
                              {friendMileages.get(fid)!.balance.toLocaleString()}M
                            </span>
                          )}
                        </div>
                        {status === 'flying' && flights.has(fid) && (
                          <p className="text-[9px] text-sky-400/70 mt-0.5">
                            {flights.get(fid)!.from_code} → {flights.get(fid)!.to_code}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); remove(f.id) }}
                        className="w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500/15 transition-all"
                        title="친구 삭제"
                      >
                        <UserMinus className="w-3 h-3 text-red-400/50" />
                      </button>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Pending sent */}
            {pendingSent.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/[0.06]">
                <p className="text-[10px] font-mono text-white/30 tracking-wider mb-2">보낸 요청</p>
                {pendingSent.map(f => (
                  <div key={f.id} className="flex items-center justify-between px-3 py-2">
                    <span className="text-[11px] font-mono text-white/40">{f.profile.username}</span>
                    <span className="text-[9px] text-white/25">대기 중</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right content area */}
        <div className="flex-1 relative overflow-hidden">
          <AnimatePresence mode="wait">
            {selectedFriendId && selectedFriendship ? (
              selectedFlight ? (
                <motion.div
                  key={`flight-${selectedFriendId}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <FriendFlightCard
                    flight={selectedFlight}
                    username={selectedFriendship.profile.username}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key={`history-${selectedFriendId}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="h-full relative"
                >
                  <FriendTripHistory
                    friendId={selectedFriendId}
                    username={selectedFriendship.profile.username}
                    mileage={friendMileages.get(selectedFriendId)}
                  />
                </motion.div>
              )
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center"
              >
                <Users className="w-10 h-10 text-white/10 mb-3" />
                <p className="text-[13px] text-white/30">친구를 선택하세요</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
