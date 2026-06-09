import { useRef, useCallback, useEffect, useState } from 'react'

export function useAmbientNoise(initialVolume = 0.5) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [volume, setVolumeState] = useState(initialVolume)

  const ensureAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current
    const audio = new Audio('/airplane-cabin.mp3')
    audio.loop = true
    audio.volume = volume
    audioRef.current = audio
    return audio
  }, []) // eslint-disable-line

  const start = useCallback(() => {
    const audio = ensureAudio()
    audio.currentTime = 0
    audio.volume = volume
    audio.play().catch(() => {})
  }, [ensureAudio, volume])

  const stop = useCallback(() => {
    if (!audioRef.current) return
    audioRef.current.pause()
    audioRef.current.currentTime = 0
  }, [])

  const pause = useCallback(() => {
    audioRef.current?.pause()
  }, [])

  const resume = useCallback(() => {
    audioRef.current?.play().catch(() => {})
  }, [])

  const setVolume = useCallback((v: number) => {
    setVolumeState(v)
    if (audioRef.current) audioRef.current.volume = v
  }, [])

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [])

  return { start, stop, pause, resume, volume, setVolume }
}
