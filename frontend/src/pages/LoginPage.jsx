import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
    Sprout,
    AlertCircle,
    User,
    Lock,
    LogIn,
    ArrowLeft
} from 'lucide-react'

function LoginPage() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const { login } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    const from = location.state?.from?.pathname || '/sessions'

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            await login(username, password)
            navigate(from, { replace: true })
        } catch (err) {
            setError(err.response?.data?.error || 'حدث خطأ في تسجيل الدخول')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="page-container">
            <div className="card animate-slideUp" style={{ width: '100%', maxWidth: '420px' }}>
                {/* Logo */}
                <div className="text-center mb-8">
                    <div style={{
                        width: '80px',
                        height: '80px',
                        margin: '0 auto var(--spacing-4)',
                        background: 'linear-gradient(135deg, var(--primary-500) 0%, var(--primary-600) 100%)',
                        borderRadius: 'var(--radius-2xl)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        boxShadow: '0 10px 30px rgba(37, 99, 235, 0.3)'
                    }}>
                        <Sprout size={48} />
                    </div>
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--spacing-2)' }}>
                        النبراس لطحن الحبوب
                    </h1>
                    <p style={{ color: 'var(--gray-500)', margin: 0 }}>
                        قم بتسجيل الدخول للمتابعة
                    </p>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="alert alert-error animate-fadeIn">
                        <AlertCircle size={20} />
                        <span>{error}</span>
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="username">
                            اسم المستخدم
                        </label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }}>
                                <User size={18} />
                            </div>
                            <input
                                id="username"
                                type="text"
                                className="form-input"
                                placeholder="أدخل اسم المستخدم"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                autoComplete="username"
                                disabled={loading}
                                style={{ paddingRight: '40px' }}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="password">
                            كلمة المرور
                        </label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }}>
                                <Lock size={18} />
                            </div>
                            <input
                                id="password"
                                type="password"
                                className="form-input"
                                placeholder="أدخل كلمة المرور"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                                disabled={loading}
                                style={{ paddingRight: '40px' }}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg btn-block mt-6 flex items-center justify-center gap-2"
                        disabled={loading || !username || !password}
                    >
                        {loading ? (
                            <>
                                <div className="spinner spinner-sm"></div>
                                <span>جاري تسجيل الدخول...</span>
                            </>
                        ) : (
                            <>
                                <span>تسجيل الدخول</span>
                                <ArrowLeft size={20} />
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <p className="text-center mt-6" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray-400)', margin: 0 }}>
                    النبراس لطحن الحبوب © {new Date().getFullYear()}
                </p>
            </div>
        </div>
    )
}

export default LoginPage
