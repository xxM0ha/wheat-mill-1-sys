import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSession } from '../contexts/SessionContext'
import {
    Sprout,
    ClipboardList,
    ArrowRight,
    ArrowLeft,
    Plus,
    LogOut,
    Mailbox,
    AlertCircle,
    ChevronLeft,
    Trash2
} from 'lucide-react'
import { formatDate } from '../utils/dateUtils'

function SessionSelectPage() {
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const { sessions, loading, fetchSessions, createSession, selectSession, deleteSession } = useSession()

    // Step 1: Select system type
    // Step 2: Select quota/batch number or view existing sessions
    // Step 3: Set start date and create
    const [step, setStep] = useState(1)
    const [selectedType, setSelectedType] = useState(null)
    const [selectedQuota, setSelectedQuota] = useState(null)
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
    const [defaultSilo, setDefaultSilo] = useState('')
    const [error, setError] = useState('')
    const [showNewSession, setShowNewSession] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState(null)

    useEffect(() => {
        fetchSessions()
    }, [])

    const handleTypeSelect = (type) => {
        setSelectedType(type)
        setStep(2)
        setShowNewSession(false)
        fetchSessions({ session_type: type })
    }

    const handleQuotaSelect = (num) => {
        setSelectedQuota(num)
        setStep(3)
    }

    const handleCreateSession = async () => {
        setError('')
        try {
            const session = await createSession({
                session_type: selectedType,
                quota_number: selectedQuota,
                start_date: startDate,
                default_silo: defaultSilo,
            })
            selectSession(session)
            navigate('/dashboard')
        } catch (err) {
            setError(err.response?.data?.error || 'حدث خطأ في إنشاء الجلسة')
        }
    }

    const handleSessionClick = (session) => {
        selectSession(session)
        navigate('/dashboard')
    }

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    const handleDeleteSession = async (sessionId, sessionLabel) => {
        if (deleteConfirm !== sessionId) {
            setDeleteConfirm(sessionId)
            return
        }

        try {
            await deleteSession(sessionId)
            setDeleteConfirm(null)
            setError('')
        } catch (err) {
            setError(err.response?.data?.error || 'حدث خطأ في حذف بيانات الجلسة')
        }
    }

    const handleBack = () => {
        if (step === 3) {
            setStep(2)
            setSelectedQuota(null)
        } else if (step === 2) {
            setStep(1)
            setSelectedType(null)
            setShowNewSession(false)
        }
    }

    const quotaLabel = selectedType === 'ration_card' ? 'حصة' : 'دفعة'
    const typeLabel = selectedType === 'ration_card' ? 'نظام البطاقة التموينية' : 'نظام الطحين الصفر التجاري'

    const filteredSessions = sessions
        .filter(s => s.session_type === selectedType)
        .sort((a, b) => a.quota_number - b.quota_number)

    return (
        <div className="dashboard-layout">
            {/* Header */}
            <header className="dashboard-header">
                <div className="flex justify-between items-center" style={{ maxWidth: '1400px', margin: '0 auto' }}>
                    <div className="flex items-center gap-4">
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
                            <Sprout size={24} />
                        </div>
                        <div>
                            <h4 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>النبراس لطحن الحبوب</h4>
                            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--gray-500)' }}>
                                مرحباً، {user?.full_name_ar || user?.username}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="btn btn-secondary flex items-center gap-2">
                        <LogOut size={18} />
                        تسجيل الخروج
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="dashboard-content">
                {/* Error Alert */}
                {error && (
                    <div className="alert alert-error mb-6 animate-fadeIn">
                        <AlertCircle size={20} />
                        <span>{error}</span>
                        <button
                            onClick={() => setError('')}
                            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* Step indicator */}
                {step > 1 && (
                    <button
                        onClick={handleBack}
                        className="btn btn-secondary mb-6 animate-fadeIn flex items-center gap-2"
                    >
                        <ArrowRight size={18} />
                        <span>رجوع</span>
                    </button>
                )}

                {/* Step 1: Select System Type */}
                {step === 1 && (
                    <div className="animate-slideUp">
                        <div className="text-center mb-8">
                            <h2>اختر نوع النظام</h2>
                            <p style={{ color: 'var(--gray-500)' }}>حدد النظام الذي تريد العمل به</p>
                        </div>

                        <div className="selection-grid" style={{ maxWidth: '700px', margin: '0 auto' }}>
                            {/* Ration Card System */}
                            <div
                                className={`selection-card ${selectedType === 'ration_card' ? 'selected' : ''}`}
                                onClick={() => handleTypeSelect('ration_card')}
                            >
                                <div className="selection-card-icon"><ClipboardList size={40} /></div>
                                <h3>نظام البطاقة التموينية</h3>
                                <p>إدارة حصص البطاقة التموينية من 1 إلى 12</p>
                            </div>

                            {/* Commercial Flour System */}
                            <div
                                className={`selection-card ${selectedType === 'commercial_flour' ? 'selected' : ''}`}
                                onClick={() => handleTypeSelect('commercial_flour')}
                            >
                                <div className="selection-card-icon"><Sprout size={40} /></div>
                                <h3>نظام الطحين الصفر التجاري</h3>
                                <p>إدارة دفعات الطحين التجاري من 1 إلى 12</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Select Quota/Batch or View Sessions */}
                {step === 2 && (
                    <div className="animate-slideUp">
                        <div className="text-center mb-8">
                            <h2>{typeLabel}</h2>
                            <p style={{ color: 'var(--gray-500)' }}>اختر جلسة موجودة أو أنشئ جلسة جديدة</p>
                        </div>

                        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                            {/* Existing Sessions */}
                            {!showNewSession && (
                                <>
                                    {filteredSessions.length > 0 && (
                                        <div className="mb-6">
                                            <div className="flex justify-between items-center mb-4">
                                                <h4>الجلسات الموجودة</h4>
                                                <button
                                                    onClick={() => setShowNewSession(true)}
                                                    className="btn btn-primary flex items-center gap-2"
                                                >
                                                    <Plus size={18} />
                                                    جلسة جديدة
                                                </button>
                                            </div>
                                            <div className="session-list">
                                                {filteredSessions.map((session, index) => (
                                                    <div
                                                        key={session.id}
                                                        className="session-item animate-slideRight"
                                                        style={{ animationDelay: `${index * 100}ms` }}
                                                    >
                                                        <div
                                                            className="session-item-info"
                                                            onClick={() => handleSessionClick(session)}
                                                            style={{ cursor: 'pointer', flex: 1 }}
                                                        >
                                                            <div className="session-item-icon">
                                                                {selectedType === 'ration_card' ? <ClipboardList size={20} /> : <Sprout size={20} />}
                                                            </div>
                                                            <div className="session-item-details">
                                                                <h4>{session.quota_label}</h4>
                                                                <p>
                                                                    بدأت: {formatDate(session.start_date)}
                                                                    {session.end_date && ` | انتهت: ${formatDate(session.end_date)}`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="session-item-actions" style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center' }}>
                                                            <span className={`badge ${session.is_closed ? 'badge-closed' : 'badge-open'}`}>
                                                                {session.status_label}
                                                            </span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleDeleteSession(session.id, session.quota_label)
                                                                }}
                                                                className={`btn btn-icon ${deleteConfirm === session.id ? 'btn-danger' : 'btn-secondary'}`}
                                                                style={{
                                                                    padding: 'var(--spacing-2)',
                                                                    minWidth: 'auto'
                                                                }}
                                                                title={deleteConfirm === session.id ? 'اضغط مرة أخرى للتأكيد' : 'حذف بيانات الجلسة (عدا الديون)'}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                            <ChevronLeft size={20} style={{ color: 'var(--gray-400)' }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {filteredSessions.length === 0 && (
                                        <div className="card text-center" style={{ padding: 'var(--spacing-12)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--spacing-4)', color: 'var(--gray-300)' }}>
                                                <Mailbox size={64} />
                                            </div>
                                            <h3>لا توجد جلسات</h3>
                                            <p style={{ color: 'var(--gray-500)', marginBottom: 'var(--spacing-6)' }}>
                                                لم يتم إنشاء أي جلسات بعد لهذا النظام
                                            </p>
                                            <button
                                                onClick={() => setShowNewSession(true)}
                                                className="btn btn-primary btn-lg flex items-center gap-2 justify-center"
                                                style={{ margin: '0 auto' }}
                                            >
                                                <Plus size={20} />
                                                إنشاء جلسة جديدة
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Create New Session */}
                            {showNewSession && (
                                <div className="card animate-fadeIn">
                                    <div className="flex items-center gap-4 mb-6">
                                        <button
                                            onClick={() => setShowNewSession(false)}
                                            className="btn btn-icon btn-secondary"
                                        >
                                            <ArrowRight size={20} />
                                        </button>
                                        <h3 style={{ margin: 0 }}>إنشاء جلسة جديدة</h3>
                                    </div>

                                    <h4 className="mb-4">اختر رقم ال{quotaLabel}</h4>
                                    <div className="quota-grid">
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                                            <div
                                                key={num}
                                                className={`quota-item ${selectedQuota === num ? 'selected' : ''}`}
                                                onClick={() => handleQuotaSelect(num)}
                                            >
                                                {quotaLabel} {num}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 3: Set Start Date */}
                {step === 3 && (
                    <div className="animate-slideUp">
                        <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
                            <div className="text-center mb-6">
                                <h3>{typeLabel}</h3>
                                <p style={{
                                    color: 'var(--primary-600)',
                                    fontWeight: '600',
                                    fontSize: 'var(--font-size-xl)',
                                    margin: 0
                                }}>
                                    {quotaLabel} {selectedQuota}
                                </p>
                            </div>

                            {error && (
                                <div className="alert alert-error mb-4">
                                    <AlertCircle size={20} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="form-group mb-6">
                                <label className="form-label" htmlFor="startDate">
                                    تاريخ البدء
                                </label>
                                <input
                                    id="startDate"
                                    type="date"
                                    className="form-date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="defaultSilo">
                                    اسم السايلو لهذه الجلسة
                                </label>
                                <input
                                    id="defaultSilo"
                                    type="text"
                                    className="form-input"
                                    value={defaultSilo}
                                    onChange={(e) => setDefaultSilo(e.target.value)}
                                    placeholder="أدخل اسم السايلو (مثلاً سايلو الحلة)..."
                                />
                                <p style={{
                                    fontSize: 'var(--font-size-sm)',
                                    color: 'var(--gray-500)',
                                    marginTop: 'var(--spacing-2)'
                                }}>
                                    سيتم تعبئة هذا الاسم تلقائياً في صفحة السواق
                                </p>
                            </div>

                            <div className="flex gap-4 mt-6">
                                <button
                                    onClick={handleBack}
                                    className="btn btn-secondary"
                                    style={{ flex: 1 }}
                                >
                                    رجوع
                                </button>
                                <button
                                    onClick={handleCreateSession}
                                    className="btn btn-primary btn-lg flex items-center justify-center gap-2"
                                    style={{ flex: 2 }}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <div className="spinner spinner-sm"></div>
                                            <span>جاري الإنشاء...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>فتح الجلسة</span>
                                            <ArrowLeft size={20} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}

export default SessionSelectPage
