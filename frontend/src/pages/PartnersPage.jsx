import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../contexts/SessionContext'
import api from '../api/axios'
import {
    ArrowRight,
    Users,
    TrendingUp,
    TrendingDown,
    PlusCircle,
    User,
    Calendar,
    Wallet,
    PieChart,
    AlertCircle,
    Pencil,
    Trash2,
    Printer
} from 'lucide-react'
import { formatDate } from '../utils/dateUtils'

function PartnersPage() {
    const navigate = useNavigate()
    const { currentSession } = useSession()

    const [transactions, setTransactions] = useState([])
    const [loading, setLoading] = useState(false)
    const [submitLoading, setSubmitLoading] = useState(false)
    const [error, setError] = useState('')

    const partners = [
        { id: 'mohammad_jamil', name: 'محمد جميل', share: 50 },
        { id: 'abdullah_khalid', name: 'عبدالله خالد', share: 40 },
        { id: 'bashir_sabhan', name: 'بشير سبهان', share: 10 },
    ]

    const [selectedPartnerId, setSelectedPartnerId] = useState(partners[0].id)

    const initialFormState = {
        partner_name: partners[0].id,
        type: 'deposit',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
    }

    const [form, setForm] = useState({ ...initialFormState })
    const [editingId, setEditingId] = useState(null)

    useEffect(() => {
        if (!currentSession) {
            navigate('/dashboard')
            return
        }
        fetchTransactions()
    }, [currentSession])

    useEffect(() => {
        setForm(prev => ({ ...prev, partner_name: selectedPartnerId }))
    }, [selectedPartnerId])

    const fetchTransactions = async () => {
        setLoading(true)
        try {
            const response = await api.get(`/sessions/partners/?session_id=${currentSession.id}`)
            setTransactions(response.data)
        } catch (err) {
            console.error('Error fetching transactions:', err)
            setError('حدث خطأ في تحميل البيانات')
        } finally {
            setLoading(false)
        }
    }

    const formatNumber = (num) => {
        if (!num) return '0'
        return new Intl.NumberFormat('en-US').format(parseFloat(num))
    }

    const handleAmountChange = (e) => {
        let value = e.target.value.replace(/,/g, '').replace(/[^0-9.]/g, '')
        if ((value.match(/\./g) || []).length > 1) return
        setForm({ ...form, amount: value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.amount) {
            setError('يرجى إدخال المبلغ')
            return
        }

        setSubmitLoading(true)
        setError('')
        try {
            const payload = {
                ...form,
                amount: parseFloat(form.amount),
                session: currentSession.id
            }

            if (editingId) {
                const response = await api.put(`/sessions/partners/${editingId}/`, payload)
                setTransactions(transactions.map(t => t.id === editingId ? response.data : t))
                setEditingId(null)
            } else {
                const response = await api.post('/sessions/partners/', payload)
                setTransactions([response.data, ...transactions])
            }

            setForm({
                ...initialFormState,
                partner_name: selectedPartnerId
            })
        } catch (err) {
            setError('حدث خطأ في الحفظ')
        } finally {
            setSubmitLoading(false)
        }
    }

    const handleEdit = (transaction) => {
        setEditingId(transaction.id)
        setSelectedPartnerId(transaction.partner_name)
        setForm({
            partner_name: transaction.partner_name,
            type: transaction.type,
            amount: transaction.amount.toString(),
            date: transaction.date,
            notes: transaction.notes || ''
        })
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleCancelEdit = () => {
        setEditingId(null)
        setForm({ ...initialFormState, partner_name: selectedPartnerId })
    }

    const handleDelete = async (id) => {
        if (!window.confirm('هل أنت متأكد من الحذف؟')) return
        try {
            await api.delete(`/sessions/partners/${id}/`)
            setTransactions(transactions.filter(t => t.id !== id))
        } catch (err) {
            setError('حدث خطأ في الحذف')
        }
    }

    const getPartnerStats = (partnerId) => {
        const partnerTrans = transactions.filter(t => t.partner_name === partnerId)
        const totalDeposits = partnerTrans
            .filter(t => t.type === 'deposit')
            .reduce((acc, t) => acc + parseFloat(t.amount), 0)
        const totalWithdrawals = partnerTrans
            .filter(t => t.type === 'withdrawal')
            .reduce((acc, t) => acc + parseFloat(t.amount), 0)
        const totalProfits = partnerTrans
            .filter(t => t.type === 'profit')
            .reduce((acc, t) => acc + parseFloat(t.amount), 0)
        return {
            totalDeposits,
            totalWithdrawals,
            totalProfits,
            net: (totalDeposits + totalProfits) - totalWithdrawals
        }
    }

    const selectedPartner = partners.find(p => p.id === selectedPartnerId)
    const selectedPartnerStats = getPartnerStats(selectedPartnerId)
    const filteredTransactions = transactions
        .filter(t => t.partner_name === selectedPartnerId)
        .sort((a, b) => {
            // Sort by date descending (Newest first, Older down at the bottom)
            const dateA = a.date || '';
            const dateB = b.date || '';
            if (dateA !== dateB) {
                return dateB.localeCompare(dateA);
            }
            // Secondary sort by created_at or ID to handle items on the same day
            const timeA = a.created_at || '';
            const timeB = b.created_at || '';
            if (timeA !== timeB) {
                return timeB.localeCompare(timeA);
            }
            return (b.id || 0) - (a.id || 0);
        });

    const handlePrintPartnerReport = () => {
        const url = `http://localhost:8000/api/sessions/print/partner/?partner=${selectedPartnerId}&session=${currentSession.id}`
        window.open(url, '_blank')
    }

    return (
        <div className="dashboard-layout">
            <header className="dashboard-header">
                <div className="flex justify-between items-center" style={{ maxWidth: '1400px', margin: '0 auto' }}>
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/dashboard')} className="btn btn-icon btn-secondary">
                            <ArrowRight size={20} />
                        </button>
                        <div style={{
                            width: '40px', height: '40px',
                            background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                            borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                        }}>
                            <Users size={24} />
                        </div>
                        <div>
                            <h4 style={{ margin: 0 }}>شؤون الشركاء</h4>
                            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--gray-500)' }}>
                                {selectedPartner?.name} - {currentSession?.quota_label}
                            </p>
                        </div>
                    </div>
                    <div className="no-print flex gap-3">
                        <button
                            className="btn btn-secondary flex items-center gap-2"
                            onClick={handlePrintPartnerReport}
                        >
                            <Printer size={18} />
                            طباعة كشف الشريك
                        </button>
                        <button
                            className="btn btn-primary flex items-center gap-2"
                            onClick={async () => {
                                if (!window.confirm('سيتم تحديث مبالغ الأرباح بناءً على أرقام التقارير الحالية. هل تريد المتابعة؟')) return
                                try {
                                    setLoading(true)
                                    await api.post(`/sessions/${currentSession.id}/sync_profits/`)
                                    await fetchTransactions()
                                    alert('تم تحديث الأرباح بنجاح')
                                } catch (err) {
                                    alert('حدث خطأ أثناء التحديث')
                                } finally {
                                    setLoading(false)
                                }
                            }}
                        >
                            <TrendingUp size={18} />
                            تحديث أرباح الجلسة
                        </button>
                    </div>
                </div>
            </header>

            <main className="dashboard-content">
                <div className="animate-fadeIn">

                    {/* Partner Selection Buttons */}
                    <div className="selection-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 'var(--spacing-8)' }}>
                        {partners.map(p => {
                            const stats = getPartnerStats(p.id)
                            return (
                                <div
                                    key={p.id}
                                    onClick={() => setSelectedPartnerId(p.id)}
                                    className={`selection-card ${selectedPartnerId === p.id ? 'selected' : ''}`}
                                    style={{
                                        borderTop: `4px solid ${p.share === 50 ? 'var(--primary-500)' : p.share === 40 ? '#6366f1' : 'var(--warning-500)'}`,
                                        padding: 'var(--spacing-4) var(--spacing-6)'
                                    }}
                                >
                                    <div className="selection-card-icon" style={{
                                        width: '48px',
                                        height: '48px',
                                        marginBottom: 'var(--spacing-3)',
                                        background: selectedPartnerId === p.id ? 'var(--primary-600)' : 'var(--primary-400)'
                                    }}>
                                        <User size={24} />
                                    </div>
                                    <h3 style={{ margin: '0 0 var(--spacing-1) 0', fontSize: 'var(--font-size-base)' }}>{p.name}</h3>
                                    <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: '600', opacity: 0.8 }}>حصة الشراكة {p.share}%</p>

                                    {selectedPartnerId === p.id && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '10px',
                                            right: '10px',
                                            width: '10px',
                                            height: '10px',
                                            borderRadius: '50%',
                                            background: 'var(--primary-500)',
                                            boxShadow: '0 0 0 2px white'
                                        }} className="animate-pulse" />
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Entry Form Card */}
                    <div className="card mb-8 no-print" style={{
                        padding: 'var(--spacing-6)',
                        border: editingId ? '2px solid var(--primary-500)' : '1px solid var(--glass-border)'
                    }}>
                        <h3 style={{ marginBottom: 'var(--spacing-6)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                            <PlusCircle className={editingId ? 'text-success-500' : 'text-primary-500'} size={24} />
                            {editingId ? 'تعديل الحركة المالية' : `تسجيل حركة لـ ${selectedPartner?.name}`}
                        </h3>
                        {error && <div className="alert alert-error mb-4"><AlertCircle size={18} /><span>{error}</span></div>}

                        <form onSubmit={handleSubmit}>
                            <div className="selection-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-6)' }}>
                                <div className="form-group mb-0">
                                    <label className="form-label">نوع العملية</label>
                                    <select className="form-input" style={{ padding: 'var(--spacing-2) var(--spacing-4)' }} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                        <option value="deposit">إيداع</option>
                                        <option value="withdrawal">سحب</option>
                                        <option value="profit">أرباح (حصة)</option>
                                    </select>
                                </div>
                                <div className="form-group mb-0">
                                    <label className="form-label">المبلغ</label>
                                    <div style={{ position: 'relative' }}>
                                        <input type="text" className="form-input" style={{ padding: 'var(--spacing-2) var(--spacing-4)' }} placeholder="0.00" value={formatNumber(form.amount)} onChange={handleAmountChange} />
                                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', fontSize: 'var(--font-size-xs)' }}>د.ع</span>
                                    </div>
                                </div>
                                <div className="form-group mb-0">
                                    <label className="form-label">التاريخ</label>
                                    <input type="date" className="form-date" style={{ padding: 'var(--spacing-2) var(--spacing-4)' }} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                                </div>
                                <div className="form-group mb-0">
                                    <label className="form-label">ملاحظات</label>
                                    <input type="text" className="form-input" style={{ padding: 'var(--spacing-2) var(--spacing-4)' }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="ملاحظات اختيارية..." />
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-3)' }}>
                                {editingId && (
                                    <button type="button" onClick={handleCancelEdit} className="btn btn-secondary">
                                        إلغاء
                                    </button>
                                )}
                                <button type="submit" className={`btn ${editingId ? 'btn-success' : 'btn-primary'}`} style={{ padding: 'var(--spacing-2) var(--spacing-10)' }} disabled={submitLoading}>
                                    {submitLoading ? 'جاري الحفظ...' : (editingId ? 'تحديث العملية' : 'تسجيل العملية')}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Transaction History Grid */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{
                            padding: 'var(--spacing-4) var(--spacing-6)',
                            borderBottom: '1px solid var(--gray-100)',
                            background: 'var(--gray-50)'
                        }}>
                            <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>سجل حركات {selectedPartner?.name}</h3>
                        </div>

                        {/* Net Balance Display - Moved above table */}
                        <div style={{
                            padding: 'var(--spacing-4) var(--spacing-6)',
                            borderBottom: '2px solid var(--gray-200)',
                            background: 'var(--white)'
                        }}>
                            {(() => {
                                const totalDeposits = filteredTransactions
                                    .filter(t => t.type === 'deposit')
                                    .reduce((acc, t) => acc + parseFloat(t.amount), 0);
                                const totalWithdrawals = filteredTransactions
                                    .filter(t => t.type === 'withdrawal')
                                    .reduce((acc, t) => acc + parseFloat(t.amount), 0);

                                const netBalance = totalDeposits - totalWithdrawals;
                                const isPositive = netBalance >= 0;

                                return (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: 'var(--spacing-3) var(--spacing-5)',
                                        border: isPositive ? '2px solid var(--success-500)' : '2px solid var(--error-500)',
                                        borderRadius: 'var(--radius-lg)',
                                        background: isPositive ? 'var(--success-50)' : 'var(--error-50)'
                                    }}>
                                        <span style={{
                                            color: 'var(--gray-700)',
                                            fontSize: 'var(--font-size-base)',
                                            fontWeight: '700'
                                        }}>
                                            الرصيد الصافي النهائي
                                        </span>
                                        <span style={{
                                            color: isPositive ? 'var(--success-600)' : 'var(--error-600)',
                                            fontSize: 'var(--font-size-xl)',
                                            fontWeight: 'bold'
                                        }}>
                                            {formatNumber(Math.abs(netBalance))} د.ع - {isPositive ? 'إيداع' : 'سحب'}
                                        </span>
                                    </div>
                                );
                            })()}
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                <thead>
                                    <tr style={{ background: 'var(--gray-100)', borderBottom: '2px solid var(--gray-200)' }}>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-8)', color: 'var(--gray-700)', fontWeight: '700' }}>التاريخ</th>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-8)', color: 'var(--gray-700)', fontWeight: '700' }}>نوع العملية</th>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-8)', color: 'var(--gray-700)', fontWeight: '700' }}>المبلغ</th>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-8)', color: 'var(--gray-700)', fontWeight: '700' }}>ملاحظات</th>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-8)', color: 'var(--gray-700)', fontWeight: '700', textAlign: 'center' }}>إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="5" style={{ padding: 'var(--spacing-12)', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div><p style={{ marginTop: 'var(--spacing-4)', color: 'var(--gray-500)' }}>جاري التحميل...</p></td></tr>
                                    ) : filteredTransactions.length === 0 ? (
                                        <tr><td colSpan="5" style={{ padding: 'var(--spacing-12)', textAlign: 'center', color: 'var(--gray-400)' }}>
                                            <PieChart size={48} style={{ margin: '0 auto var(--spacing-3) auto', opacity: 0.2 }} />
                                            <p>لا توجد عمليات مسجلة لهذا الشريك</p>
                                        </td></tr>
                                    ) : (
                                        filteredTransactions.map(t => (
                                            <tr key={t.id} style={{ borderBottom: '1px solid var(--gray-100)', background: editingId === t.id ? 'var(--primary-50)' : 'transparent' }}>
                                                <td style={{ padding: 'var(--spacing-4) var(--spacing-8)' }}>{formatDate(t.date)}</td>
                                                <td style={{ padding: 'var(--spacing-4) var(--spacing-8)' }}>
                                                    <span className={`badge ${t.type === 'deposit' ? 'badge-success' : (t.type === 'profit' ? 'badge-primary' : 'badge-danger')}`}>
                                                        {t.type_display}
                                                    </span>
                                                </td>
                                                <td style={{ padding: 'var(--spacing-4) var(--spacing-8)', fontWeight: 'bold' }} className={t.type === 'deposit' || t.type === 'profit' ? 'text-success-600' : 'text-error-600'}>
                                                    {t.type === 'withdrawal' ? '-' : ''}{formatNumber(t.amount)} د.ع
                                                </td>
                                                <td style={{ padding: 'var(--spacing-4) var(--spacing-8)', fontSize: 'var(--font-size-sm)', color: 'var(--gray-600)' }}>{t.notes || '-'}</td>
                                                <td style={{ padding: 'var(--spacing-4) var(--spacing-8)', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--spacing-2)' }}>
                                                        <button onClick={() => handleEdit(t)} className="btn btn-icon" style={{ color: 'var(--primary-600)' }} title="تعديل"><Pencil size={18} /></button>
                                                        <button onClick={() => handleDelete(t.id)} className="btn btn-icon" style={{ color: 'var(--error-500)' }} title="حذف"><Trash2 size={18} /></button>
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
                .glass-card {
                    background: rgba(255, 255, 255, 0.8);
                    backdrop-filter: blur(8px);
                    border: 1px solid rgba(255, 255, 255, 0.4);
                    transition: transform 0.2s;
                }
                .glass-card:hover {
                    transform: translateY(-4px);
                }
            `}</style>
        </div>
    )
}

export default PartnersPage
