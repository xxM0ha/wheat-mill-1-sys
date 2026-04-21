import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { SessionProvider } from './contexts/SessionContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import SessionSelectPage from './pages/SessionSelectPage'
import DashboardPage from './pages/DashboardPage'
import ExpensesPage from './pages/ExpensesPage'
import SalesPage from './pages/SalesPage'
import DebtsPage from './pages/DebtsPage'
import DriversPage from './pages/DriversPage'
import CheckPage from './pages/CheckPage'

import PartnersPage from './pages/PartnersPage'

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <SessionProvider>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route
                            path="/sessions"
                            element={
                                <ProtectedRoute>
                                    <SessionSelectPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute>
                                    <DashboardPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/expenses"
                            element={
                                <ProtectedRoute>
                                    <ExpensesPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/sales"
                            element={
                                <ProtectedRoute>
                                    <SalesPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/debts"
                            element={
                                <ProtectedRoute>
                                    <DebtsPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/drivers"
                            element={
                                <ProtectedRoute>
                                    <DriversPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/check"
                            element={
                                <ProtectedRoute>
                                    <CheckPage />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/partners"
                            element={
                                <ProtectedRoute>
                                    <PartnersPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route path="/" element={<Navigate to="/login" replace />} />
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </Routes>
                </SessionProvider>
            </AuthProvider>
        </BrowserRouter>
    )
}

export default App
