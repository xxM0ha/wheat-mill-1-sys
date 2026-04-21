import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSession } from '../contexts/SessionContext'
import {
    ArrowRight,
    ClipboardList,
    Sprout,
    Construction,
    Banknote,
    Wallet,
    BookOpen,
    Truck,
    AlertCircle,
    LogOut,
    CheckSquare,
    Users,
    Printer
} from 'lucide-react'
import { formatDate } from '../utils/dateUtils'

function DashboardPage() {
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const { currentSession, closeSession, reopenSession } = useSession()

    const [showCloseModal, setShowCloseModal] = useState(false)
    const [closeDate, setCloseDate] = useState(new Date().toISOString().split('T')[0])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    if (!currentSession) {
        navigate('/sessions')
        return null
    }

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    const handleBackToSessions = () => {
        navigate('/sessions')
    }

    const handleCloseSession = async () => {
        setError('')
        setLoading(true)
        try {
            await closeSession(currentSession.id, closeDate)
            setShowCloseModal(false)
        } catch (err) {
            setError(err.response?.data?.error || 'حدث خطأ في إغلاق الجلسة')
        } finally {
            setLoading(false)
        }
    }

    const handleReopenSession = async () => {
        setLoading(true)
        try {
            await reopenSession(currentSession.id)
        } catch (err) {
            setError(err.response?.data?.error || 'حدث خطأ في إعادة فتح الجلسة')
        } finally {
            setLoading(false)
        }
    }

    const handlePrintSession = () => {
        const url = `http://localhost:8000/api/sessions/print/session/${currentSession.id}/`
        window.open(url, '_blank')
    }


    return (
        <div className="dashboard-layout">
            {/* Header */}
            <header className="dashboard-header">
                <div className="flex justify-between items-center" style={{ maxWidth: '1400px', margin: '0 auto' }}>
                    <div className="flex items-center gap-4">
                        <button onClick={handleBackToSessions} className="btn btn-icon btn-secondary">
                            <ArrowRight size={20} />
                        </button>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            background: 'linear-gradient(135deg, var(--primary-500) 0%, var(--primary-600) 100%)',
                            borderRadius: 'var(--radius-lg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}>
                            {currentSession.session_type === 'ration_card' ? <ClipboardList size={24} /> : <Sprout size={24} />}
                        </div>
                        <div>
                            <h4 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>
                                {currentSession.session_type_display}
                            </h4>
                            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--gray-500)' }}>
                                {currentSession.quota_label}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className={`badge ${currentSession.is_closed ? 'badge-closed' : 'badge-open'}`}>
                            {currentSession.status_label}
                        </span>
                        <button onClick={handleLogout} className="btn btn-secondary flex items-center gap-2">
                            <LogOut size={18} />
                            تسجيل الخروج
                        </button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="dashboard-content">
                <div className="animate-slideUp">
                    {/* Main Dashboard Container */}
                    <div className="card text-center" style={{ padding: 'var(--spacing-8)' }}>
                        {/* Integrated Session Info Header */}
                        <div style={{
                            background: 'var(--gray-50)',
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--spacing-6)',
                            marginBottom: 'var(--spacing-10)',
                            border: '1px solid var(--gray-100)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            textAlign: 'right'
                        }}>
                            <div>
                                <h3 style={{ marginBottom: 'var(--spacing-2)' }}>معلومات الجلسة الحالية</h3>
                                <div className="flex gap-6" style={{ color: 'var(--gray-600)' }}>
                                    <div>
                                        <span style={{ fontWeight: '600' }}>تاريخ البدء: </span>
                                        <span>{formatDate(currentSession.start_date)}</span>
                                    </div>
                                    {currentSession.end_date && (
                                        <div>
                                            <span style={{ fontWeight: '600' }}>تاريخ الإغلاق: </span>
                                            <span>{formatDate(currentSession.end_date)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                {!currentSession.is_closed ? (
                                    <button onClick={() => setShowCloseModal(true)} className="btn btn-danger">إغلاق الجلسة</button>
                                ) : (
                                    <button onClick={handleReopenSession} className="btn btn-success" disabled={loading}>{loading ? 'جاري...' : 'إعادة فتح الجلسة'}</button>
                                )}
                            </div>
                            <div>
                                <button
                                    onClick={handlePrintSession}
                                    className="btn btn-secondary flex items-center gap-2"
                                    style={{ marginLeft: 'var(--spacing-2)' }}
                                >
                                    <Printer size={18} />
                                    طباعة التقرير
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--spacing-4)', color: 'var(--gray-300)' }}>
                            <Construction size={60} />
                        </div>
                        <h2>لوحة التحكم</h2>
                        <p style={{ color: 'var(--gray-500)', maxWidth: '500px', margin: '0 auto' }}>
                            مرحباً بك في النبراس لطحن الحبوب. اختر العملية التي تريد تنفيذها من القائمة أدناه.
                        </p>

                        <div className="mt-8">
                            {/* Row 1: 4 Buttons */}
                            <div className="selection-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: 'var(--spacing-6)' }}>
                                <div className="selection-card" onClick={() => navigate('/debts')}>
                                    <div className="selection-card-icon" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}><BookOpen size={32} /></div>
                                    <h3>الديون</h3>
                                    <p>متابعة ديون وتسديدات العملاء</p>
                                </div>
                                <div className="selection-card" onClick={() => navigate('/sales')}>
                                    <div className="selection-card-icon" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}><Banknote size={32} /></div>
                                    <h3>المبيعات</h3>
                                    <p>إدارة فواتير المبيعات</p>
                                </div>
                                <div className="selection-card" onClick={() => navigate('/expenses')}>
                                    <div className="selection-card-icon" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}><Wallet size={32} /></div>
                                    <h3>المصاريف</h3>
                                    <p>تسجيل وإدارة المصاريف</p>
                                </div>
                                <div className="selection-card" onClick={() => navigate('/drivers')}>
                                    <div className="selection-card-icon" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}><Truck size={32} /></div>
                                    <h3>المستلم (سواق)</h3>
                                    <p>إدارة سجلات السواق والحنطة والسلف</p>
                                </div>
                            </div>

                            {/* Row 2: 2 Buttons */}
                            <div className="selection-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', maxWidth: '700px', margin: '0 auto' }}>
                                <div className="selection-card" onClick={() => navigate('/partners')}>
                                    <div className="selection-card-icon" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}><Users size={32} /></div>
                                    <h3>الشركاء</h3>
                                    <p>إدارة حصص وعمليات الشركاء</p>
                                </div>
                                <div className="selection-card" onClick={() => navigate('/check')}>
                                    <div className="selection-card-icon" style={{ background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)' }}><CheckSquare size={32} /></div>
                                    <h3>المطابقة (Check)</h3>
                                    <p>تدقيق التوازن بين الحسابات</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Close Session Modal */}
            {showCloseModal && (
                <div
                    className="loading-overlay animate-fadeIn"
                    style={{ background: 'rgba(0, 0, 0, 0.5)' }}
                    onClick={() => setShowCloseModal(false)}
                >
                    <div
                        className="card animate-slideUp"
                        style={{ maxWidth: '400px', width: '100%', margin: 'var(--spacing-4)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 className="mb-4">إغلاق الجلسة</h3>
                        <p style={{ color: 'var(--gray-600)', marginBottom: 'var(--spacing-4)' }}>
                            هل أنت متأكد من إغلاق هذه الجلسة؟ يمكنك إعادة فتحها لاحقاً.
                        </p>

                        {error && (
                            <div className="alert alert-error mb-4">
                                <AlertCircle size={20} />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label" htmlFor="closeDate">
                                تاريخ الإغلاق
                            </label>
                            <input
                                id="closeDate"
                                type="date"
                                className="form-date"
                                value={closeDate}
                                onChange={(e) => setCloseDate(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowCloseModal(false)}
                                className="btn btn-secondary"
                                style={{ flex: 1 }}
                                disabled={loading}
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleCloseSession}
                                className="btn btn-danger"
                                style={{ flex: 1 }}
                                disabled={loading}
                            >
                                {loading ? 'جاري...' : 'إغلاق'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default DashboardPage
