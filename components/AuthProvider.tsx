'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import LoginPromptModal from './LoginPromptModal';

export interface AuthUser {
    id: string; // 네이버 고유 식별 ID
    displayId?: string; // 화면에 표시할 네이버 ID (예: iam76men)
    maskedId: string;
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

    // 로그인 유도 모달 상태
    const [promptActionName, setPromptActionName] = useState<string | null>(null);

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

    const login = useCallback((returnTo?: string) => {
        const dest = returnTo || (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/');
        window.location.href = `/api/auth/naver/login?returnTo=${encodeURIComponent(dest)}`;
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
                // 비로그인 상태인 경우 모달 노출
                setPromptActionName(actionName);
            }
        },
        [user]
    );

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

            {/* 비로그인 권한 요청 시 공통 안내 모달 */}
            <LoginPromptModal
                isOpen={!!promptActionName}
                actionName={promptActionName || '이용'}
                onClose={() => setPromptActionName(null)}
                onLogin={() => {
                    setPromptActionName(null);
                    login();
                }}
            />
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
