'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Upload, FileAudio, Loader2 } from 'lucide-react'

interface VoiceRecognitionProps {
  onTranscriptionComplete: (text: string) => void
  isProcessing?: boolean
}

export function VoiceRecognition({
  onTranscriptionComplete,
  isProcessing = false
}: VoiceRecognitionProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingText, setRecordingText] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [isHovering, setIsHovering] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        if (timerRef.current) {
          clearInterval(timerRef.current)
        }
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await transcribeAudio(audioBlob)
        
        // 마이크 스트림 정리
        stream.getTracks().forEach(track => track.stop())
        
        // 녹음 시간 초기화
        setRecordingDuration(0)
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingText('음성 녹음 중...')
      
      // 녹음 시간 타이머 시작
      setRecordingDuration(0)
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('마이크 접근 오류:', error)
      setRecordingText('마이크 접근이 거부되었습니다.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setRecordingText('음성 분석 중...')
    }
  }

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData()
      formData.append('file', audioBlob, 'recording.webm')

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('서버 응답 오류')
      }

      const data = await response.json()
      if (data.text) {
        setRecordingText(data.text)
        
        // 한국어 텍스트를 영어 프롬프트로 자동 변환
        await translateToEnglishPrompt(data.text)
      } else {
        setRecordingText('음성을 인식할 수 없습니다.')
      }
    } catch (error) {
      console.error('음성 인식 오류:', error)
      setRecordingText('음성 인식 중 오류가 발생했습니다.')
    }
  }

  const translateToEnglishPrompt = async (koreanText: string) => {
    try {
      setIsTranslating(true)
      
      console.log("원본 텍스트:", koreanText);
      
      // GPT-4o API 호출 - 간결한 영어 프롬프트로 요약
      const response = await fetch('/api/translate-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: koreanText,
          summarize: true // 간결하게 요약 옵션 추가
        }),
      })

      if (!response.ok) {
        throw new Error('프롬프트 번역 실패')
      }

      const data = await response.json()
      console.log("API 응답:", data);
      
      // API 응답이 적절한 이미지 프롬프트가 아닌 경우 기본 프롬프트 사용
      if (data.prompt && (
          data.prompt.includes("적합하지 않습니다") || 
          data.prompt.includes("시각적") || 
          data.prompt.includes("예를 들어") ||
          data.prompt.includes("이미지 생성 프롬프트") ||
          data.prompt.includes("I'm sorry") ||
          data.prompt.includes("can't create")
      )) {
        console.log("GPT 응답이 유효한 프롬프트가 아닙니다. 기본 프롬프트 사용");
        // fallback: 기본 영어 프롬프트 생성
        const fallbackPrompt = `A visual representation of "${koreanText}" with vibrant colors, detailed composition, artistic style, high quality, 4K resolution, beautiful lighting.`;
        onTranscriptionComplete(fallbackPrompt);
        return;
      }
      
      // 정상적인 이미지 프롬프트인 경우
      console.log("정상 프롬프트 사용:", data.prompt);
      onTranscriptionComplete(data.prompt)
    } catch (error) {
      console.error('프롬프트 번역 오류:', error)
      
      // 오류 발생 시 기본 프롬프트 사용
      const fallbackPrompt = `A visual representation of "${koreanText}" with vibrant colors, detailed composition, artistic style, high quality, 4K resolution, beautiful lighting.`;
      console.log("오류 발생, 기본 프롬프트 사용:", fallbackPrompt);
      onTranscriptionComplete(fallbackPrompt);
      
      // 오류 메시지 표시
      setRecordingText(koreanText + "\n\n[오류: 프롬프트 변환 중 문제가 발생했습니다]")
    } finally {
      setIsTranslating(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    let file: File | null = null
    
    // 이벤트 타입 확인 (input change 또는 drag event)
    if ('dataTransfer' in event) {
      // 드래그 앤 드롭 이벤트
      event.preventDefault()
      setIsDragging(false)
      
      if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        file = event.dataTransfer.files[0]
      }
    } else {
      // 파일 선택 이벤트
      file = event.target.files?.[0] || null
    }
    
    if (!file) return

    // 지원하는 오디오 파일 형식 체크
    const supportedFormats = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/m4a', 'audio/mp4']
    if (!supportedFormats.includes(file.type) && !file.type.startsWith('audio/')) {
      setRecordingText('지원하지 않는 파일 형식입니다. MP3, WAV, WebM 등의 오디오 파일을 업로드해주세요.')
      return
    }

    try {
      setIsUploading(true)
      setRecordingText('오디오 파일 분석 중...')
      
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('서버 응답 오류')
      }

      const data = await response.json()
      if (data.text) {
        setRecordingText(data.text)
        
        // 한국어 텍스트를 영어 프롬프트로 자동 변환
        await translateToEnglishPrompt(data.text)
      } else {
        setRecordingText('음성을 인식할 수 없습니다.')
      }
    } catch (error) {
      console.error('파일 업로드 오류:', error)
      setRecordingText('오디오 파일 처리 중 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      <div 
        ref={dropZoneRef}
        className={`flex flex-col items-center gap-4 p-4 rounded-lg transition-colors
                   ${isDragging ? 'bg-purple-50 border-2 border-dashed border-purple-300 dark:bg-zinc-800 dark:border-zinc-600' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleFileUpload}
      >
        <div className="flex gap-4 justify-center">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!isRecording && (isProcessing || isUploading || isTranslating)}
            className={`
              relative flex flex-col items-center justify-center size-16 rounded-full 
              transition-all duration-300 focus:outline-none
              ${isRecording 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-purple-100 hover:bg-purple-200 dark:bg-zinc-800 dark:hover:bg-zinc-700'
              }
            `}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            {isRecording ? (
              <>
                <MicOff className="h-8 w-8" />
                <span className="text-[8px] mt-1 font-medium">녹음 중지</span>
              </>
            ) : (
              <Mic className={`h-8 w-8 ${isHovering ? 'text-purple-600 dark:text-purple-400' : 'text-purple-500 dark:text-zinc-400'}`} />
            )}
            
            {isRecording && (
              <div className="absolute -bottom-10 font-mono text-sm bg-red-500 text-white px-2 py-0.5 rounded-full shadow-md border border-red-600">
                <div className="flex items-center gap-1.5">
                  <span className="relative size-1.5 flex-shrink-0 bg-white rounded-full animate-pulse"></span>
                  <span className="font-medium tracking-wider">{formatTime(recordingDuration)}</span>
                </div>
              </div>
            )}
          </button>
          
          <button
            onClick={triggerFileUpload}
            disabled={isProcessing || isRecording || isUploading || isTranslating}
            className="flex flex-col items-center justify-center size-16 rounded-full 
                      bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 
                      transition-all duration-300 focus:outline-none"
          >
            <FileAudio className="h-8 w-8 text-zinc-500 dark:text-zinc-400" />
            <span className="text-[8px] mt-1 text-zinc-500">파일 업로드</span>
          </button>
        </div>
        
        <div className="text-center text-sm text-zinc-500 h-6">
          {!isRecording && (isUploading ? (
            <p>파일 처리 중...</p>
          ) : isTranslating ? (
            <p>텍스트 변환 중...</p>
          ) : (
            <p>{isDragging ? '파일을 여기에 놓으세요' : '음성 녹음 또는 오디오 파일 업로드'}</p>
          ))}
        </div>
        
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept="audio/*"
        />
      </div>

      {(isUploading || isTranslating) && (
        <div className="flex justify-center items-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
        </div>
      )}

      {recordingText && !isRecording && !isUploading && !isTranslating && (
        <div className="mt-4 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
            인식된 텍스트:
          </p>
          <p className="text-sm">{recordingText}</p>
        </div>
      )}
    </div>
  )
} 