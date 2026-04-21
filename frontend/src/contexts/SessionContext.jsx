import { createContext, useContext, useState } from 'react'
import api from '../api/axios'

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
    const [sessions, setSessions] = useState([])
    const [currentSession, setCurrentSession] = useState(null)
    const [loading, setLoading] = useState(false)

    const fetchSessions = async (filters = {}) => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (filters.session_type) params.append('session_type', filters.session_type)
            if (filters.is_closed !== undefined) params.append('is_closed', filters.is_closed)

            const response = await api.get(`/sessions/?${params.toString()}`)
            setSessions(response.data)
            return response.data
        } catch (error) {
            console.error('Error fetching sessions:', error)
            throw error
        } finally {
            setLoading(false)
        }
    }

    const createSession = async (sessionData) => {
        setLoading(true)
        try {
            const response = await api.post('/sessions/', sessionData)
            setSessions(prev => [response.data, ...prev])
            return response.data
        } catch (error) {
            console.error('Error creating session:', error)
            throw error
        } finally {
            setLoading(false)
        }
    }

    const closeSession = async (sessionId, endDate) => {
        setLoading(true)
        try {
            const response = await api.post(`/sessions/${sessionId}/close/`, { end_date: endDate })
            setSessions(prev =>
                prev.map(s => s.id === sessionId ? response.data : s)
            )
            if (currentSession?.id === sessionId) {
                setCurrentSession(response.data)
            }
            return response.data
        } catch (error) {
            console.error('Error closing session:', error)
            throw error
        } finally {
            setLoading(false)
        }
    }

    const reopenSession = async (sessionId) => {
        setLoading(true)
        try {
            const response = await api.post(`/sessions/${sessionId}/reopen/`)
            setSessions(prev =>
                prev.map(s => s.id === sessionId ? response.data : s)
            )
            if (currentSession?.id === sessionId) {
                setCurrentSession(response.data)
            }
            return response.data
        } catch (error) {
            console.error('Error reopening session:', error)
            throw error
        } finally {
            setLoading(false)
        }
    }

    const deleteSession = async (sessionId) => {
        setLoading(true)
        try {
            const response = await api.post(`/sessions/${sessionId}/delete_session_data/`)
            // Optionally refresh sessions or remove from list
            await fetchSessions()
            return response.data
        } catch (error) {
            console.error('Error deleting session data:', error)
            throw error
        } finally {
            setLoading(false)
        }
    }

    const updateSession = async (sessionId, updateData) => {
        setLoading(true)
        try {
            const response = await api.patch(`/sessions/${sessionId}/`, updateData)
            setSessions(prev =>
                prev.map(s => s.id === sessionId ? response.data : s)
            )
            if (currentSession?.id === sessionId) {
                setCurrentSession(response.data)
            }
            return response.data
        } catch (error) {
            console.error('Error updating session:', error)
            throw error
        } finally {
            setLoading(false)
        }
    }

    const selectSession = (session) => {
        setCurrentSession(session)
        localStorage.setItem('currentSessionId', session?.id || '')
    }

    const value = {
        sessions,
        currentSession,
        loading,
        fetchSessions,
        createSession,
        closeSession,
        reopenSession,
        deleteSession,
        updateSession,
        selectSession,
    }

    return (
        <SessionContext.Provider value={value}>
            {children}
        </SessionContext.Provider>
    )
}

export function useSession() {
    const context = useContext(SessionContext)
    if (!context) {
        throw new Error('useSession must be used within a SessionProvider')
    }
    return context
}
