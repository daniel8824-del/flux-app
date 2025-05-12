'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { getUserImages, deleteUserImage } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Trash2, Download, ExternalLink, Loader2, Copy, Check, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'

interface ImageGalleryProps {
  userId?: string;
}

interface GalleryImage {
  id: string;
  image_url: string;
  prompt: string;
  created_at: string;
}

export function ImageGallery({ userId }: ImageGalleryProps) {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isCopying, setIsCopying] = useState(false)
  const { toast } = useToast()

  // 이미지 로드 함수 정의
  const loadImages = async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await getUserImages(userId)
      
      if (error) {
        throw new Error(error.message)
      }
      
      setImages(data || [])
    } catch (err) {
      setError('이미지를 불러오는 중 오류가 발생했습니다.')
      console.error('갤러리 로드 오류:', err)
    } finally {
      setLoading(false)
    }
  }

  // 초기 로드
  useEffect(() => {
    loadImages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])
  
  // 갤러리 업데이트 이벤트 리스너
  useEffect(() => {
    // 갤러리 업데이트 이벤트 핸들러
    const handleGalleryUpdate = (event: CustomEvent<{userId?: string}>) => {
      // 이벤트의 userId가 현재 컴포넌트의 userId와 일치하는지 확인
      if (event.detail?.userId === userId) {
        // 갤러리 이미지를 다시 로드
        loadImages();
      }
    };

    // 이벤트 리스너 등록
    window.addEventListener('gallery:update', handleGalleryUpdate as EventListener);

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener('gallery:update', handleGalleryUpdate as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(id)
      const { error } = await deleteUserImage(id)
      
      if (error) {
        throw new Error(error.message)
      }
      
      setImages(prev => prev.filter(img => img.id !== id))
      
      // 삭제한 이미지가 현재 선택된 이미지라면 선택 해제
      if (selectedImage?.id === id) {
        setSelectedImage(null)
      }
    } catch (err) {
      setError('이미지를 삭제하는 중 오류가 발생했습니다.')
      console.error('이미지 삭제 오류:', err)
    } finally {
      setIsDeleting(null)
    }
  }

  const handleDownload = (url: string, prompt: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = `flux-${prompt.substring(0, 20).replace(/\s+/g, '-')}-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  const formatCreatedAt = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleCopyPrompt = async (prompt: string) => {
    try {
      setIsCopying(true);
      await navigator.clipboard.writeText(prompt);
      
      toast({
        title: "프롬프트 복사 완료",
        description: "프롬프트가 클립보드에 복사되었습니다.",
        variant: "default"
      });
    } catch (err) {
      console.error('프롬프트 복사 오류:', err);
      toast({
        title: "복사 실패",
        description: "프롬프트를 클립보드에 복사하지 못했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsCopying(false);
      // 1초 후에 복사 상태 초기화
      setTimeout(() => setIsCopying(false), 1000);
    }
  };

  // 이미지 URL을 새 창에서 안전하게 열기 위한 함수 추가
  const openImageInNewTab = (imageUrl: string) => {
    try {
      // Data URL인지 확인 (base64 이미지)
      if (imageUrl.startsWith('data:')) {
        // Data URL을 Blob으로 변환
        fetch(imageUrl)
          .then(res => res.blob())
          .then(blob => {
            // Blob URL 생성
            const blobUrl = URL.createObjectURL(blob);
            
            // 새 탭에서 Blob URL 열기
            window.open(blobUrl, '_blank');
            
            // 메모리 누수 방지를 위해 일정 시간 후 Blob URL 해제
            setTimeout(() => {
              URL.revokeObjectURL(blobUrl);
            }, 60000); // 1분 후 해제
          })
          .catch(err => {
            console.error('이미지 열기 오류:', err);
            toast({
              title: "이미지 열기 실패",
              description: "이미지를 새 창에서 열 수 없습니다.",
              variant: "destructive"
            });
          });
      } else {
        // 일반 URL은 그대로 새 창에서 열기
        window.open(imageUrl, '_blank');
      }
    } catch (error) {
      console.error('이미지 열기 오류:', error);
      toast({
        title: "이미지 열기 실패",
        description: "이미지를 새 창에서 열 수 없습니다.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="text-center py-12 px-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
        <div className="max-w-md mx-auto">
          <h3 className="text-lg font-medium mb-2">로그인이 필요합니다</h3>
          <p className="text-zinc-500 dark:text-zinc-400 mb-4">
            이미지를 갤러리에 저장하고 관리하려면 로그인해주세요.
          </p>
          <Button variant="outline" asChild>
            <a href="/login">로그인하기</a>
          </Button>
        </div>
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-12 px-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
        <div className="max-w-md mx-auto">
          <h3 className="text-lg font-medium mb-2">아직 저장된 이미지가 없습니다</h3>
          <p className="text-zinc-500 dark:text-zinc-400">
            이미지를 생성하고 갤러리에 저장해보세요!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      {error && (
        <div className="p-3 bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400 rounded-md text-sm">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image) => (
          <div 
            key={image.id} 
            className="relative overflow-hidden rounded-xl cursor-pointer bg-zinc-100 dark:bg-zinc-800 shadow-sm"
            onClick={() => setSelectedImage(image)}
            style={{ width: '100%', height: '0', paddingBottom: '100%' }}
          >
            <div className="absolute inset-0">
              <Image
                src={image.image_url}
                alt={image.prompt}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
            </div>
          </div>
        ))}
      </div>
      
      {selectedImage && (
        <div className="mt-8 p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-medium">이미지 상세 정보</h3>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
              onClick={() => setSelectedImage(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="relative aspect-square w-full md:w-1/2 max-w-lg mx-auto overflow-hidden rounded-lg shadow-md">
              <Image
                src={selectedImage.image_url}
                alt={selectedImage.prompt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 500px"
                priority
              />
              <div className="absolute bottom-2 right-2">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 bg-white/80 hover:bg-white dark:bg-zinc-800/80 dark:hover:bg-zinc-800"
                  onClick={(e) => {
                    e.stopPropagation(); // 이벤트 버블링 방지
                    openImageInNewTab(selectedImage.image_url);
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex-1 space-y-5">
              <div>
                <p className="text-xs text-zinc-500">
                  생성일: {formatCreatedAt(selectedImage.created_at)}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">프롬프트:</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                    onClick={() => handleCopyPrompt(selectedImage.prompt)}
                  >
                    {isCopying ? (
                      <>
                        <Check className="mr-1 h-3 w-3 text-green-500" />
                        <span className="text-green-500">복사됨</span>
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 h-3 w-3" />
                        <span>복사</span>
                      </>
                    )}
                  </Button>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-md text-xs whitespace-pre-wrap max-h-[150px] overflow-y-auto">
                  {selectedImage.prompt.includes('English Prompt:') 
                    ? selectedImage.prompt.split('English Prompt:')[1].trim()
                    : selectedImage.prompt}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 pt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(selectedImage.image_url, selectedImage.prompt)}
                  className="text-xs"
                >
                  <Download className="mr-1 h-3 w-3" />
                  다운로드
                </Button>
                
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isDeleting === selectedImage.id}
                  onClick={() => handleDelete(selectedImage.id)}
                  className="text-xs"
                >
                  {isDeleting === selectedImage.id ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="mr-1 h-3 w-3" />
                  )}
                  삭제
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 