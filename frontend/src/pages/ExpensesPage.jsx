import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../contexts/SessionContext'
import api from '../api/axios'
import {
    ArrowRight,
    Wallet,
    AlertCircle,
    FolderOpen,
    Pencil,
    Trash2,
    PlusCircle,
    CheckCircle2,
    XCircle,
    Printer
} from 'lucide-react'
import { formatDate } from '../utils/dateUtils'

function ExpensesPage() {
    const navigate = useNavigate()
    const { currentSession } = useSession()

    const [expenses, setExpenses] = useState([])
    const [loading, setLoading] = useState(false)
    const [submitLoading, setSubmitLoading] = useState(false)
    const [error, setError] = useState('')
    const [editingId, setEditingId] = useState(null)

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        amount: ''
    })

    useEffect(() => {
        if (!currentSession) {
            navigate('/sessions')
            return
        }
        fetchExpenses()
    }, [currentSession])

    const fetchExpenses = async () => {
        setLoading(true)
        try {
            const response = await api.get(`/sessions/expenses/?session_id=${currentSession.id}`)
            setExpenses(response.data)
        } catch (err) {
            console.error('Error fetching expenses:', err)
            setError('حدث خطأ في تحميل البيانات')
        } finally {
            setLoading(false)
        }
    }

    // Formatting utility: add commas to numbers
    const formatNumber = (num) => {
        if (!num && num !== 0) return ''
        const val = parseFloat(num)
        if (isNaN(val)) return num.toString()
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(val)
    }

    // Clean formatting: remove commas for calculation/sending to API
    const cleanNumber = (str) => {
        return str.toString().replace(/,/g, '')
    }

    const handleAmountChange = (e) => {
        const value = e.target.value.replace(/[^0-9.]/g, '') // Keep only digits and dot
        const cleanVal = cleanNumber(value)

        // Allow only one decimal point
        if ((cleanVal.match(/\./g) || []).length > 1) return

        setFormData({ ...formData, amount: cleanVal })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.name || !formData.amount) {
            setError('يرجى ملء الحقول المطلوبة')
            return
        }

        setSubmitLoading(true)
        setError('')
        try {
            const payload = {
                ...formData,
                session: currentSession.id,
                amount: parseFloat(formData.amount)
            }

            if (editingId) {
                const response = await api.put(`/sessions/expenses/${editingId}/`, payload)
                setExpenses(expenses.map(e => e.id === editingId ? response.data : e))
                setEditingId(null)
            } else {
                const response = await api.post('/sessions/expenses/', payload)
                setExpenses([response.data, ...expenses])
            }

            setFormData({ name: '', amount: '' })
        } catch (err) {
            console.error('Error saving expense:', err)
            setError(err.response?.data?.error || 'حدث خطأ في حفظ البيانات')
        } finally {
            setSubmitLoading(false)
        }
    }

    const handlePrint = () => {
        const url = `http://localhost:8000/api/sessions/print/expenses/?session=${currentSession.id}`
        window.open(url, '_blank')
    }


    const handleEdit = (expense) => {
        setEditingId(expense.id)
        setFormData({
            name: expense.name,
            amount: expense.amount.toString()
        })
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleCancelEdit = () => {
        setEditingId(null)
        setFormData({ name: '', amount: '' })
    }

    const handleDelete = async (id) => {
        if (editingId === id) {
            setError('لا يمكن حذف السجل أثناء التعديل')
            return
        }
        if (!window.confirm('هل أنت متأكد من حذف هذا المصروف؟')) return

        try {
            await api.delete(`/sessions/expenses/${id}/`)
            setExpenses(expenses.filter(e => e.id !== id))
        } catch (err) {
            setError('حدث خطأ في الحذف')
        }
    }

    return (
        <div className="dashboard-layout">
            {/* Header */}
            <header className="dashboard-header">
                <div className="flex justify-between items-center" style={{ maxWidth: '1400px', margin: '0 auto' }}>
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/dashboard')} className="btn btn-icon btn-secondary">
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
                            <Wallet size={24} />
                        </div>
                        <div>
                            <h4 style={{ margin: 0 }}>المصاريف</h4>
                            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--gray-500)' }}>
                                {currentSession?.quota_label} - {currentSession?.session_type_display}
                            </p>
                        </div>
                    </div>
                    <div className="no-print">
                        <button className="btn btn-secondary flex items-center gap-2" onClick={handlePrint}>
                            <Printer size={18} />
                            طباعة القائمة
                        </button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="dashboard-content">
                <div className="animate-fadeIn">
                    {/* Entry Form Card */}
                    <div className={`card mb-8 ${editingId ? 'ring-2 ring-primary-500 ring-offset-2' : ''}`}>
                        <h3 className="mb-6">{editingId ? 'تعديل المصروف' : 'إضافة مصروف جديد'}</h3>

                        {error && (
                            <div className="alert alert-error mb-4">
                                <AlertCircle size={20} />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="flex gap-4 items-end" style={{ flexWrap: 'wrap' }}>
                            <div className="form-group" style={{ flex: '2', minWidth: '200px', marginBottom: 0 }}>
                                <label className="form-label">الاسم/البيان</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="مثلاً: شراء وقود"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="form-group" style={{ flex: '1', minWidth: '150px', marginBottom: 0 }}>
                                <label className="form-label">المبلغ</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="0.00"
                                        value={formatNumber(formData.amount)}
                                        onChange={handleAmountChange}
                                        style={{ paddingLeft: '45px' }}
                                    />
                                    <span style={{
                                        position: 'absolute',
                                        left: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--gray-400)',
                                        fontSize: 'var(--font-size-sm)'
                                    }}>د.ع</span>
                                </div>
                            </div>



                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    className={`btn ${editingId ? 'btn-success' : 'btn-primary'} btn-lg flex items-center justify-center gap-2`}
                                    style={{ height: '48px', minWidth: '100px' }}
                                    disabled={submitLoading}
                                >
                                    {submitLoading ? (
                                        <div className="spinner spinner-sm"></div>
                                    ) : (
                                        editingId ? <CheckCircle2 size={20} /> : <PlusCircle size={20} />
                                    )}
                                    {submitLoading ? 'جاري الحفظ...' : (editingId ? 'تحديث' : '+ إضافة')}
                                </button>
                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        className="btn btn-secondary btn-lg flex items-center justify-center gap-2"
                                        style={{ height: '48px' }}
                                    >
                                        <XCircle size={20} />
                                        إلغاء
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* Excel-like Grid Card */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: 'var(--spacing-6) var(--spacing-8)', borderBottom: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>سجل المصاريف</h3>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray-500)', fontWeight: '600' }}>
                                إجمالي المصاريف: <span style={{ color: 'var(--primary-600)', fontSize: 'var(--font-size-lg)' }}>
                                    {formatNumber(expenses.reduce((acc, curr) => acc + parseFloat(curr.amount), 0))} د.ع
                                </span>
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                <thead>
                                    <tr style={{ background: 'var(--gray-50)', borderBottom: '2px solid var(--gray-100)' }}>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-8)', color: 'var(--gray-600)', fontWeight: '700' }}>المبلغ</th>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-8)', color: 'var(--gray-600)', fontWeight: '700' }}>الاسم/البيان</th>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-8)', color: 'var(--gray-600)', fontWeight: '700' }}>التاريخ</th>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-8)', color: 'var(--gray-600)', fontWeight: '700', textAlign: 'center' }}>إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="4" style={{ padding: 'var(--spacing-12)', textAlign: 'center' }}>
                                                <div className="spinner" style={{ margin: '0 auto' }}></div>
                                                <p className="mt-4">جاري تحميل المصاريف...</p>
                                            </td>
                                        </tr>
                                    ) : expenses.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" style={{ padding: 'var(--spacing-12)', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--spacing-4)', color: 'var(--gray-300)' }}>
                                                    <FolderOpen size={48} />
                                                </div>
                                                <p style={{ color: 'var(--gray-500)' }}>لا يوجد مصاريف مسجلة لهذه الجلسة</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        expenses.map((expense, index) => (
                                            <tr key={expense.id} className="animate-fadeIn" style={{
                                                borderBottom: '1px solid var(--gray-100)',
                                                transition: 'background var(--transition-fast)',
                                                background: editingId === expense.id ? 'var(--primary-50)' : 'transparent'
                                            }}>
                                                <td style={{ padding: 'var(--spacing-4) var(--spacing-8)', color: 'var(--primary-600)', fontWeight: '700' }}>
                                                    {formatNumber(expense.amount)}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-4) var(--spacing-8)', fontWeight: '600' }}>
                                                    {expense.name}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-4) var(--spacing-8)' }}>
                                                    {formatDate(expense.created_at)}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-4) var(--spacing-8)', textAlign: 'center' }}>
                                                    <div className="flex justify-center gap-2">
                                                        <button
                                                            onClick={() => handleEdit(expense)}
                                                            className="btn btn-icon"
                                                            style={{ color: 'var(--primary-500)', background: 'transparent' }}
                                                            title="تعديل"
                                                        >
                                                            <Pencil size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(expense.id)}
                                                            className="btn btn-icon"
                                                            style={{ color: 'var(--error-500)', background: 'transparent' }}
                                                            title="حذف"
                                                            disabled={editingId === expense.id}
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>

            <style>{`
                @media print {
                    * { margin: 0; padding: 0; }
                    body { margin: 0; padding: 20px; }
                    .no-print { display: none !important; }
                    .dashboard-layout { background: white !important; padding: 0 !important; margin: 0 !important; }
                    .dashboard-header { 
                        display: block !important;
                        background: white !important;
                        border-bottom: 2px solid #333 !important;
                        padding: 10px 0 !important;
                        margin-bottom: 20px !important;
                    }
                    .dashboard-content { padding: 0 !important; margin: 0 !important; }
                    .card { 
                        box-shadow: none !important; 
                        border: none !important; 
                        margin: 0 !important;
                        padding: 0 !important;
                        page-break-inside: avoid;
                    }
                    table { 
                        width: 100% !important; 
                        border-collapse: collapse !important;
                        page-break-inside: auto;
                    }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                    thead { display: table-header-group; }
                    tfoot { display: table-footer-group; }
                    th, td { 
                        border: 1px solid #333 !important; 
                        padding: 8px !important; 
                        font-size: 9pt !important;
                        text-align: right !important;
                    }
                    th { 
                        background-color: #f0f0f0 !important; 
                        font-weight: bold !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            `}</style>
        </div>
    )
}

export default ExpensesPage
