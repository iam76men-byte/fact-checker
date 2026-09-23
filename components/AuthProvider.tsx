'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import SimpleLoginModal from './SimpleLoginModal';

export interface AuthUser {
    id: string; // 고유 식별 ID
    displayId?: string; // 화면에 표시할 닉네임/ID
    maskedId: string;
    provider?: string;
}

interface AuthContextType {
    user: AuthUser | null;
    isLoggedIn: boolean;
    loading: boolean;
    login: (returnTo?: string) => void;
    logout: () => Promise<void>;
    requireAuth: (actionName: string, onAuthorized: () => void) => void;
    refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoggedIn: false,
    loading: true,
    login: () => {},
    logout: async () => {},
    requireAuth: () => {},
    refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    // 로그인 유도 모달 상태 및 로그인 후 대기 중인 액션
    const [promptActionName, setPromptActionName] = useState<string | null>(null);
    const pendingActionRef = useRef<(() => void) | null>(null);

    const refresh = useCallback(async () => {
        try {
            const res = await fetch('/api/auth/me', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                if (data.loggedIn && data.user) {
                    setUser(data.user);
                } else {
                    setUser(null);
                }
            } else {
                setUser(null);
            }
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const login = useCallback((_returnTo?: string) => {
        // 간편 로그인 모달 열기
        setPromptActionName('로그인');
    }, []);

    const logout = useCallback(async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            setUser(null);
            // 페이지 새로고침 또는 상태 리셋
            if (typeof window !== 'undefined') {
                window.location.reload();
            }
        } catch (e) {
            console.error('Logout error:', e);
        }
    }, []);

    const requireAuth = useCallback(
        (actionName: string, onAuthorized: () => void) => {
            if (user) {
                // 이미 로그인되어 있는 경우 즉시 허용
                onAuthorized();
            } else {
                // 비로그인 상태인 경우 모달 노출 및 로그인 완료 시 실행할 콜백 예약
                pendingActionRef.current = onAuthorized;
                setPromptActionName(actionName);
            }
        },
        [user]
    );

    const handleLoginSuccess = (newUser: AuthUser) => {
        setUser(newUser);
        setPromptActionName(null);

        // 만약 로그인 이전에 누른 액션(예: 추천 투표, 글쓰기 등)이 대기 중이었다면 즉시 실행
        if (pendingActionRef.current) {
            const action = pendingActionRef.current;
            pendingActionRef.current = null;
            setTimeout(() => {
                action();
            }, 100);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoggedIn: !!user,
                loading,
                login,
                logout,
                requireAuth,
                refresh,
            }}
        >
            {children}

            {/* Google reCAPTCHA v3 기반 간편 로그인 모달 */}
            <SimpleLoginModal
                isOpen={!!promptActionName}
                actionName={promptActionName || '이용'}
                onClose={() => {
                    setPromptActionName(null);
                    pendingActionRef.current = null;
                }}
                onSuccess={handleLoginSuccess}
            />
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}

