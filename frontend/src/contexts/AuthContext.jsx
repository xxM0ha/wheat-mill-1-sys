import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Check if user is already logged in
        const token = localStorage.getItem('accessToken')
        if (token) {
            fetchUser()
        } else {
            setLoading(false)
        }
    }, [])

    const fetchUser = async () => {
        try {
            const response = await api.get('/auth/me/')
            setUser(response.data)
        } catch (error) {
            // Token invalid, clear storage
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
        } finally {
            setLoading(false)
        }
    }

    const login = async (username, password) => {
        const response = await api.post('/auth/login/', { username, password })
        const { user: userData, tokens } = response.data

        localStorage.setItem('accessToken', tokens.access)
        localStorage.setItem('refreshToken', tokens.refresh)
        setUser(userData)

        return userData
    }

    const logout = async () => {
        try {
            const refreshToken = localStorage.getItem('refreshToken')
            await api.post('/auth/logout/', { refresh: refreshToken })
        } catch (error) {
            // Ignore logout errors
        } finally {
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
            setUser(null)
        }
    }

    const value = {
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
