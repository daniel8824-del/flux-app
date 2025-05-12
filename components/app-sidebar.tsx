'use client';

import { useState, useEffect } from 'react';
import type { User } from 'next-auth';
import { useRouter } from 'next/navigation';
import { useSidebarToggle, usePathname } from '../hooks/use-sidebar';
import { cn } from '@/lib/utils';
import { PlusIcon } from '@/components/icons';
import { SidebarHistory } from '@/components/sidebar-history';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Home, LogOut, Heart, User as UserIcon } from 'lucide-react';
import { VersionFooter } from '@/components/version-footer';
import { signOut, getCurrentUser } from '@/lib/supabase';

// 임시 타입 정의
type Chat = User;

type AppSidebarProps = {
  user?: User | null;
  chat?: Chat | null;
  chats?: Chat[] | null;
  isSession?: boolean;
  chatHistoryUrl?: string;
  setChatId?: (id: string) => void;
};

export function AppSidebar({
  user,
  chat,
  chats,
  isSession,
  chatHistoryUrl,
  setChatId
}: AppSidebarProps) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const { isSidebarOpen, toggleSidebar } = useSidebarToggle();
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  // user가 전달되었으면 chat으로 사용
  const actualChat = chat || user;
  const actualIsSession = isSession ?? !!user;

  // Supabase에서 현재 로그인한 사용자 정보 가져오기
  useEffect(() => {
    const fetchUserInfo = async () => {
      const { user } = await getCurrentUser();
      if (user && user.email) {
        // 이메일에서 사용자 이름 추출 (@ 앞 부분)
        const username = user.email.split('@')[0];
        setUserEmail(username);
      }
    };
    
    fetchUserInfo();
  }, []);

  // 로그인 상태 확인
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  useEffect(() => {
    const checkLoginStatus = async () => {
      const { user } = await getCurrentUser();
      setIsLoggedIn(!!user);
    };
    
    checkLoginStatus();
  }, []);

  return (
    <div className="h-screen sticky top-0 left-0">
      <div
        className={cn(
          'h-full bg-muted/40 border-r border-zinc-200 dark:border-zinc-800 transition-all',
          {
            'w-48': isSidebarOpen,
            'w-14': !isSidebarOpen
          }
        )}
      >
        <div
          className={cn('flex flex-col w-full h-full', {
            'p-3 pb-0': isSidebarOpen,
            'p-1 pb-0': !isSidebarOpen
          })}
        >
          <div className="pt-28 flex flex-col gap-2">
            {/* 홈 버튼 - 링크를 /flux로 변경 */}
            <Button
              variant="outline"
              size="sm"
              className="bg-background justify-start h-8"
              onClick={() => {
                // 커스텀 이벤트를 발생시켜 이미지 생성 상태만 초기화
                const resetEvent = new CustomEvent('reset-image-generator');
                window.dispatchEvent(resetEvent);
                
                // 현재 페이지가 /flux가 아닌 경우에만 페이지 이동
                if (pathname !== '/flux') {
                  router.push('/flux');
                }
              }}
            >
              <Home className="mr-1 h-3.5 w-3.5" />
              <span className={cn('text-xs', { hidden: !isSidebarOpen })}>
                홈 화면
              </span>
            </Button>
            
            {/* 로그인/로그아웃 버튼 */}
            {isLoggedIn ? (
              <Button
                variant="outline"
                size="sm"
                className="bg-background justify-start h-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={async () => {
                  await signOut();
                  // 로컬 스토리지에서 로그인 상태 제거
                  localStorage.removeItem('supabaseLoggedIn');
                  // 페이지 새로고침하여 UI 상태 업데이트
                  window.location.href = '/login';
                }}
              >
                <LogOut className="mr-1 h-3.5 w-3.5" />
                <span className={cn('text-xs', { hidden: !isSidebarOpen })}>
                  로그아웃
                </span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="bg-background justify-start h-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                asChild
              >
                <Link href="/login">
                  <UserIcon className="mr-1 h-3.5 w-3.5" />
                  <span className={cn('text-xs', { hidden: !isSidebarOpen })}>
                    로그인
                  </span>
                </Link>
              </Button>
            )}
            
            {/* 크레딧 정보 */}
            <div className={cn("mt-auto pt-6 pb-3", 
              { "opacity-0": !isSidebarOpen }
            )}>
              <div className="px-2 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
                <div className="flex items-center justify-center gap-1.5">
                  <Heart className="h-3 w-3 text-pink-500" />
                  <p className="text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">
                    Created by <span className="text-purple-600 dark:text-purple-400">daniel8824</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* 채팅 히스토리 관련 부분 제거 */}
          <div className="mt-3"></div>
        </div>
      </div>
    </div>
  );
}
