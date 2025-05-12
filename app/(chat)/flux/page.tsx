'use client'

import { useState, useEffect, useRef } from 'react'
import { VoiceRecognition } from '@/components/voice-recognition'
import { ImageGenerator } from '@/components/image-generator'
import { ImageGallery } from '@/components/image-gallery'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Icons } from '@/components/ui/icons'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Mic, PenLine, ImageIcon, Info } from 'lucide-react'

export default function FluxPage() {
  const [transcribedText, setTranscribedText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [userId, setUserId] = useState<string | undefined>()
  const [activeTab, setActiveTab] = useState<'voice' | 'text'>('voice')
  const [resetKey, setResetKey] = useState(Date.now())

  useEffect(() => {
    // 사용자 세션 확인
    async function getSession() {
      const { data } = await supabase.auth.getSession()
      if (data.session?.user) {
        setUserId(data.session.user.id)
      }
    }
    
    getSession()
    
    // 페이지 로드 시 resetKey 업데이트로 컴포넌트 초기화
    setResetKey(Date.now())
    
    // 이미지 생성기 초기화 이벤트 리스너 추가
    const handleResetImageGenerator = () => {
      console.log('이미지 생성기 초기화 이벤트 수신');
      setResetKey(Date.now());
      setTranscribedText('');
    };
    
    window.addEventListener('reset-image-generator', handleResetImageGenerator);
    
    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener('reset-image-generator', handleResetImageGenerator);
    };
  }, [])

  const handleTranscriptionComplete = (text: string) => {
    setTranscribedText(text)
  }

  const resetTranscribedText = () => {
    setTranscribedText('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-100 to-white dark:from-zinc-900 dark:to-zinc-800 pt-14">
      <div className="container mx-auto px-4 py-6 md:py-10">
        <div className="flex flex-row">
          {/* 메인 영역 (60%) */}
          <div className="flex-1 pr-0 lg:pr-6 lg:w-[60%]">
            <header className="mb-6 md:mb-8">
              <div className="flex items-center gap-4 mb-2">
                <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-r from-purple-500 to-blue-500">
                  <Icons.logo className="h-6 w-6 md:h-8 md:w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tighter">Flux</h1>
                  <p className="text-zinc-500 dark:text-zinc-400 text-base md:text-lg">
                    음성으로 아름다운 이미지를 생성하세요
                  </p>
                </div>
              </div>
            </header>

            <Tabs defaultValue="voice" className="mb-6" onValueChange={(value) => setActiveTab(value as 'voice' | 'text')}>
              <div className="flex justify-start mb-4">
                <TabsList className="grid grid-cols-2 w-full max-w-md">
                  <TabsTrigger value="voice" className="flex items-center gap-2">
                    <Mic className="h-4 w-4" />
                    <span>음성으로 생성</span>
                  </TabsTrigger>
                  <TabsTrigger value="text" className="flex items-center gap-2">
                    <PenLine className="h-4 w-4" />
                    <span>직접 입력</span>
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="voice" className="space-y-4">
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg shadow-sm border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center mb-2 text-sm text-zinc-500">
                    <Mic className="h-4 w-4 mr-2" />
                    <p>이미지로 만들고 싶은 장면을 음성으로 설명해주세요. 자세할수록 더 좋은 결과를 얻을 수 있습니다.</p>
                  </div>
                </div>
                
                <Card className="shadow-sm border border-zinc-100 dark:border-zinc-800">
                  <CardContent className="pt-4">
                    <VoiceRecognition 
                      onTranscriptionComplete={handleTranscriptionComplete}
                      isProcessing={isProcessing}
                    />
                  </CardContent>
                </Card>
                
                {transcribedText && (
                  <Card className="shadow-sm border border-zinc-100 dark:border-zinc-800">
                    <CardContent className="pt-4">
                      <ImageGenerator 
                        initialPrompt={transcribedText} 
                        userId={userId}
                        key={resetKey}
                      />
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="text" className="space-y-4">
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg shadow-sm border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center mb-2 text-sm text-zinc-500">
                    <ImageIcon className="h-4 w-4 mr-2" />
                    <p>이미지로 만들고 싶은 장면을 자세히 묘사해주세요. 자세할수록 더 좋은 결과를 얻을 수 있습니다.</p>
                  </div>
                </div>
                
                <Card className="shadow-sm border border-zinc-100 dark:border-zinc-800">
                  <CardContent className="pt-4">
                    <ImageGenerator 
                      userId={userId}
                      key={resetKey}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          {/* 오른쪽 사이드바: 내 갤러리 (40%) */}
          <div className="hidden lg:block lg:w-[40%]">
            <div className="pl-6 h-full">
              <Card className="shadow-sm border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 h-[calc(100vh-100px)] flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle>내 갤러리</CardTitle>
                  <CardDescription>생성하고 저장한 이미지를 확인하세요</CardDescription>
                </CardHeader>
                <CardContent className="pt-2 flex-1 overflow-y-auto">
                  <ImageGallery userId={userId} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        
        {/* 모바일 화면에서만 보이는 갤러리 */}
        <div className="mt-8 lg:hidden">
          <Card className="shadow-sm border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle>내 갤러리</CardTitle>
              <CardDescription>생성하고 저장한 이미지를 확인하세요</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <ImageGallery userId={userId} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 