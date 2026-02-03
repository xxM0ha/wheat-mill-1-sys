import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../contexts/SessionContext'
import api from '../api/axios'
import {
    ArrowRight,
    CheckSquare,
    AlertCircle,
    FolderOpen,
    PlusCircle,
    ArrowUpCircle,
    ArrowDownCircle,
    User,
    Banknote,
    Printer,
    Pencil,
    Trash2
} from 'lucide-react'

function CheckPage() {
    const navigate = useNavigate()
    const { currentSession } = useSession()

    const [debts, setDebts] = useState([])
    const [loading, setLoading] = useState(false)
    const [submitLoading, setSubmitLoading] = useState(false)
    const [error, setError] = useState('')
    const [suggestions, setSuggestions] = useState([])
    const [editingEntryId, setEditingEntryId] = useState(null)

    // Form states
    const initialFormState = {
        name: '',
        amount: '',
        date: new Date().toISOString().split('T')[0]
    }

    const [weOweForm, setWeOweForm] = useState({ ...initialFormState })
    const [theyOweForm, setTheyOweForm] = useState({ ...initialFormState })

    useEffect(() => {
        if (!currentSession) {
            navigate('/sessions')
            return
        }
        fetchDebts()
        fetchSuggestions()
    }, [currentSession])

    const fetchDebts = async () => {
        setLoading(true)
        try {
            const response = await api.get(`/sessions/debts/?session_id=${currentSession.id}`)
            setDebts(response.data)
        } catch (err) {
            console.error('Error fetching data:', err)
            setError('حدث خطأ في تحميل البيانات')
        } finally {
            setLoading(false)
        }
    }

    const fetchSuggestions = async () => {
        try {
            const response = await api.get('/sessions/sales/suggestions/')
            setSuggestions(response.data.buyers || [])
        } catch (err) {
            console.error('Error fetching suggestions:', err)
        }
    }

    const formatNumber = (num) => {
        if (num === undefined || num === null || num === '') return ''
        const val = parseFloat(num)
        if (isNaN(val)) return num.toString()
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(val)
    }

    const handleAmountChange = (e, setForm) => {
        let value = e.target.value.replace(/,/g, '').replace(/[^0-9.]/g, '')
        if ((value.match(/\./g) || []).length > 1) return
        setForm(prev => ({ ...prev, amount: value }))
    }

    const handleSubmit = async (e, type) => {
        if (e) e.preventDefault()
        const form = type === 'liability' ? weOweForm : theyOweForm
        if (!form.name || !form.amount) {
            setError('يرجى ملء الحقول المطلوبة')
            return
        }

        setSubmitLoading(true)
        setError('')
        try {
            const payload = {
                person_name: form.name,
                amount: parseFloat(form.amount),
                entry_type: type, // 'liability' or 'debt'
                session: currentSession.id,
                date: form.date
            }

            if (editingEntryId) {
                const response = await api.put(`/sessions/debts/${editingEntryId}/`, payload)
                setDebts(debts.map(d => d.id === editingEntryId ? response.data : d))
                setEditingEntryId(null)
            } else {
                const response = await api.post('/sessions/debts/', payload)
                setDebts([response.data, ...debts])
            }

            setWeOweForm({ ...initialFormState })
            setTheyOweForm({ ...initialFormState })

            fetchSuggestions()
        } catch (err) {
            setError(err.response?.data?.error || 'حدث خطأ في الحفظ')
        } finally {
            setSubmitLoading(false)
        }
    }

    // Unified aggregation logic to handle spillover (e.g. overpayment moves to the other side)
    const calculateBalances = () => {
        const balances = {}

        debts.forEach(item => {
            const name = item.person_name
            if (!balances[name]) balances[name] = 0

            const amount = parseFloat(item.amount) || 0

            // Logic: People OWE us (+), We OWE them (-)
            if (item.entry_type === 'debt') balances[name] += amount
            if (item.entry_type === 'payment') balances[name] -= amount
            if (item.entry_type === 'liability') balances[name] -= amount
            if (item.entry_type === 'our_payment') balances[name] += amount
        })

        const weOwe = []   // Logic: negative balance means we owe them
        const theyOwe = [] // Logic: positive balance means they owe us

        Object.entries(balances).forEach(([name, balance]) => {
            if (balance > 0) {
                theyOwe.push({ person_name: name, amount: balance })
            } else if (balance < 0) {
                weOwe.push({ person_name: name, amount: Math.abs(balance) })
            }
        })

        return { weOwe, theyOwe }
    }

    const { weOwe: weOweList, theyOwe: theyOweList } = calculateBalances()

    // Find the max length to build table rows
    const rowCount = Math.max(weOweList.length, theyOweList.length)

    const handleDeletePerson = async (name) => {
        if (!window.confirm(`هل أنت متأكد من حذف جميع بيانات (${name}) في هذه الجلسة؟`)) return

        setLoading(true)
        try {
            await api.post('/sessions/debts/bulk_delete_by_person/', {
                person_name: name,
                session_id: currentSession.id
            })
            fetchDebts()
            alert('تم حذف البيانات بنجاح')
        } catch (err) {
            console.error('Error deleting person:', err)
            setError('حدث خطأ أثناء الحذف')
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteEntry = async (id) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا القيد؟')) return
        try {
            await api.delete(`/sessions/debts/${id}/`)
            setDebts(debts.filter(d => d.id !== id))
        } catch (err) {
            setError('حدث خطأ في الحذف')
        }
    }

    const handleEditEntry = (entry) => {
        setEditingEntryId(entry.id)
        if (entry.entry_type === 'liability') {
            setWeOweForm({
                name: entry.person_name,
                amount: entry.amount.toString(),
                date: entry.date
            })
            setTheyOweForm({ ...initialFormState })
        } else {
            setTheyOweForm({
                name: entry.person_name,
                amount: entry.amount.toString(),
                date: entry.date
            })
            setWeOweForm({ ...initialFormState })
        }
        window.scrollTo({ top: 300, behavior: 'smooth' })
    }

    const handleCancelEdit = () => {
        setEditingEntryId(null)
        setWeOweForm({ ...initialFormState })
        setTheyOweForm({ ...initialFormState })
    }

    const handlePrint = () => {
        const printWindow = window.open('', '_blank')
        const totalWeOwe = weOweList.reduce((acc, curr) => acc + curr.amount, 0)
        const totalTheyOwe = theyOweList.reduce((acc, curr) => acc + curr.amount, 0)

        printWindow.document.write(`
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <title>جدول المطابقة المالية - ${currentSession?.quota_label || ''}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Segoe UI', Tahoma, sans-serif; 
                        padding: 20px; 
                        direction: rtl;
                    }
                    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
                    .header h1 { font-size: 24px; margin-bottom: 5px; }
                    .header p { color: #666; font-size: 14px; }
                    
                    .summary-container { display: flex; gap: 20px; margin-bottom: 30px; }
                    .summary-box { 
                        flex: 1; 
                        padding: 15px; 
                        border: 2px solid #333; 
                        border-radius: 8px;
                        text-align: center;
                    }
                    .summary-box.error { background: #fee2e2; border-color: #ef4444; }
                    .summary-box.success { background: #dcfce7; border-color: #22c55e; }
                    .summary-label { font-size: 14px; color: #444; margin-bottom: 8px; font-weight: bold; }
                    .summary-value { font-size: 20px; font-weight: bold; }

                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: fixed; }
                    th, td { border: 1px solid #333; padding: 8px; text-align: right; vertical-align: top; overflow: hidden; }
                    th { background: #f5f5f5; font-weight: bold; font-size: 13px; }
                    
                    .we-owe { background: #fff5f5; }
                    .they-owe { background: #f5fff5; }
                    .amount { font-weight: bold; }
                    
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; border-top: 1px dashed #ccc; padding-top: 15px; }
                    
                    @media print { 
                        body { padding: 10px; } 
                        @page { margin: 1cm; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>جدول المطابقة المالية (Check)</h1>
                    <p>${currentSession?.quota_label || ''} - ${new Date().toLocaleDateString('ar-EG')}</p>
                </div>

                <div class="summary-container">
                    <div class="summary-box error">
                        <div class="summary-label">إجمالي ما بذمة النبراس</div>
                        <div class="summary-value">${formatNumber(totalWeOwe)} د.ع</div>
                    </div>
                    <div class="summary-box success">
                        <div class="summary-label">إجمالي الديون الخارجية</div>
                        <div class="summary-value">${formatNumber(totalTheyOwe)} د.ع</div>
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 30%;">الاسم (هم يطلبون)</th>
                            <th style="width: 20%;">مدين (علينا)</th>
                            <th style="width: 30%;">الاسم (نحن نطلب)</th>
                            <th style="width: 20%;">دائن (لنا)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Array.from({ length: rowCount }).map((_, idx) => `
                            <tr>
                                <td class="we-owe">${weOweList[idx]?.person_name || ''}</td>
                                <td class="we-owe amount">${weOweList[idx] ? formatNumber(weOweList[idx].amount) : ''}</td>
                                <td class="they-owe">${theyOweList[idx]?.person_name || ''}</td>
                                <td class="they-owe amount">${theyOweList[idx] ? formatNumber(theyOweList[idx].amount) : ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="background: #eee; font-weight: bold;">
                            <td>المجموع</td>
                            <td class="amount">${formatNumber(totalWeOwe)}</td>
                            <td>المجموع</td>
                            <td class="amount">${formatNumber(totalTheyOwe)}</td>
                        </tr>
                    </tfoot>
                </table>

                <div class="footer">
                    <p>تم استخراج هذا التقرير بتاريخ: ${new Date().toLocaleString('ar-EG')}</p>
                </div>
            </body>
            </html>
        `)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => {
            printWindow.print()
        }, 250)
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
                            background: 'linear-gradient(135deg, var(--primary-600) 0%, var(--primary-800) 100%)',
                            borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                        }}>
                            <CheckSquare size={24} />
                        </div>
                        <div>
                            <h4 style={{ margin: 0 }}>صفحة المطابقة (Check)</h4>
                            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--gray-500)' }}>
                                تدقيق الالتزامات المالية والمستحقات
                            </p>
                        </div>
                    </div>
                    <div className="no-print">
                        <button className="btn btn-secondary flex items-center gap-2" onClick={handlePrint}>
                            <Printer size={18} />
                            طباعة جدول المطابقة
                        </button>
                    </div>
                </div>
            </header>

            <main className="dashboard-content">
                <div className="animate-fadeIn">
                    {/* Double Entry Form */}
                    <div className="selection-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-6)' }}>
                        {/* We Owe Form */}
                        <div className="card shadow-lg" style={{ borderTop: '4px solid var(--error-500)', background: 'rgba(255, 255, 255, 0.95)' }}>
                            <div className="flex items-center gap-2 mb-4">
                                <ArrowUpCircle className="text-error-500" size={20} />
                                <h3 style={{ fontSize: '1.25rem', margin: 0 }}>مطلوب من النبراس (هم يطلبون)</h3>
                            </div>
                            <form onSubmit={(e) => handleSubmit(e, 'liability')} className="flex flex-col gap-4">
                                <div className="form-group">
                                    <label className="form-label">الاسم</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        list="names"
                                        placeholder="اسم الشخص/جهة..."
                                        value={weOweForm.name}
                                        onChange={(e) => setWeOweForm({ ...weOweForm, name: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">المبلغ</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="0.00"
                                        value={formatNumber(weOweForm.amount)}
                                        onChange={(e) => handleAmountChange(e, setWeOweForm)}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="submit"
                                        className={`btn ${editingEntryId ? 'btn-success' : 'btn-danger'} flex-1 font-bold`}
                                        disabled={submitLoading || (editingEntryId && theyOweForm.amount !== '')}
                                    >
                                        {editingEntryId && weOweForm.amount !== '' ? 'تحديث الالتزام' : '+ إضافة التزام (علينا له)'}
                                    </button>
                                    {editingEntryId && weOweForm.amount !== '' && (
                                        <button type="button" onClick={handleCancelEdit} className="btn btn-secondary">إلغاء</button>
                                    )}
                                </div>
                            </form>
                        </div>

                        {/* They Owe Form */}
                        <div className="card shadow-lg" style={{ borderTop: '4px solid var(--success-500)', background: 'rgba(255, 255, 255, 0.95)' }}>
                            <div className="flex items-center gap-2 mb-4">
                                <ArrowDownCircle className="text-success-500" size={20} />
                                <h3 style={{ fontSize: '1.25rem', margin: 0 }}>مطلوب للنبراس (نحن نطلب)</h3>
                            </div>
                            <form onSubmit={(e) => handleSubmit(e, 'debt')} className="flex flex-col gap-4">
                                <div className="form-group">
                                    <label className="form-label">الاسم</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        list="names"
                                        placeholder="اسم العميل..."
                                        value={theyOweForm.name}
                                        onChange={(e) => setTheyOweForm({ ...theyOweForm, name: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">المبلغ</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="0.00"
                                        value={formatNumber(theyOweForm.amount)}
                                        onChange={(e) => handleAmountChange(e, setTheyOweForm)}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="submit"
                                        className={`btn ${editingEntryId ? 'btn-success' : 'btn-primary'} flex-1 font-bold`}
                                        disabled={submitLoading || (editingEntryId && weOweForm.amount !== '')}
                                    >
                                        {editingEntryId && theyOweForm.amount !== '' ? 'تحديث الدين' : '+ إضافة دين (لنا عليه)'}
                                    </button>
                                    {editingEntryId && theyOweForm.amount !== '' && (
                                        <button type="button" onClick={handleCancelEdit} className="btn btn-secondary">إلغاء</button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>

                    <datalist id="names">
                        {suggestions.map((name, i) => <option key={i} value={name} />)}
                    </datalist>

                    {/* Summary Boxes */}
                    <div className="flex gap-6 mb-8 mt-8">
                        <div className="summary-box summary-box-error">
                            <h4 style={{ color: 'var(--error-700)', marginBottom: 'var(--spacing-2)' }}>إجمالي ما بذمة النبراس</h4>
                            <span style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold', color: 'var(--error-600)' }}>
                                {formatNumber(weOweList.reduce((acc, curr) => acc + curr.amount, 0))} د.ع
                            </span>
                        </div>
                        <div className="summary-box summary-box-success">
                            <h4 style={{ color: 'var(--success-700)', marginBottom: 'var(--spacing-2)' }}>إجمالي الديون الخارجية</h4>
                            <span style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold', color: 'var(--success-600)' }}>
                                {formatNumber(theyOweList.reduce((acc, curr) => acc + curr.amount, 0))} د.ع
                            </span>
                        </div>
                    </div>

                    {/* Isolated 4-Column Table */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden', border: '2px solid var(--gray-200)' }}>
                        <div style={{ background: 'var(--gray-900)', color: 'white', padding: 'var(--spacing-4) var(--spacing-8)', textAlign: 'center' }}>
                            <h3 style={{ color: 'white', margin: 0 }}>جدول المطابقة المالية - isolated View</h3>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                <thead>
                                    <tr style={{ background: 'var(--gray-100)', borderBottom: '2px solid var(--gray-200)' }}>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-6)', color: 'var(--error-700)', borderLeft: '1px solid var(--gray-200)', width: '30%' }}>الاسم (هم يطلبون)</th>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-6)', color: 'var(--error-700)', borderLeft: '4px solid var(--gray-300)', width: '20%' }}>مدين (علينا)</th>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-6)', color: 'var(--success-700)', borderLeft: '1px solid var(--gray-200)', width: '30%' }}>الاسم (نحن نطلب)</th>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-6)', color: 'var(--success-700)', width: '20%' }}>دائن (لنا)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="4" style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>جاري التحميل...</td></tr>
                                    ) : rowCount === 0 ? (
                                        <tr><td colSpan="4" style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>لا توجد بيانات للمطابقة</td></tr>
                                    ) : (
                                        Array.from({ length: rowCount }).map((_, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                                                {/* Mill Owes Others Column Pair */}
                                                <td style={{ padding: 'var(--spacing-3) var(--spacing-6)', borderLeft: '1px solid var(--gray-100)', background: weOweList[idx] ? 'var(--error-50)' : 'transparent' }}>
                                                    <div className="flex justify-between items-center group">
                                                        <span>{weOweList[idx]?.person_name || ''}</span>
                                                        {weOweList[idx] && debts.some(d => d.person_name === weOweList[idx].person_name && d.entry_type === 'liability') && (
                                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity no-print">
                                                                <button
                                                                    onClick={() => {
                                                                        const entry = debts.find(d => d.person_name === weOweList[idx].person_name && d.entry_type === 'liability')
                                                                        if (entry) handleEditEntry(entry)
                                                                    }}
                                                                    className="btn btn-icon btn-sm text-primary-500 hover:bg-white"
                                                                    title="تعديل المبلغ"
                                                                >
                                                                    <Pencil size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ padding: 'var(--spacing-3) var(--spacing-6)', color: 'var(--error-600)', fontWeight: 'bold', borderLeft: '4px solid var(--gray-300)', background: weOweList[idx] ? 'var(--error-50)' : 'transparent' }}>
                                                    {weOweList[idx] ? formatNumber(weOweList[idx].amount) : ''}
                                                </td>

                                                {/* Others Owe Us Column Pair */}
                                                <td style={{ padding: 'var(--spacing-3) var(--spacing-6)', borderLeft: '1px solid var(--gray-100)', background: theyOweList[idx] ? 'var(--success-50)' : 'transparent' }}>
                                                    <div className="flex justify-between items-center group">
                                                        <span>{theyOweList[idx]?.person_name || ''}</span>
                                                        {theyOweList[idx] && debts.some(d => d.person_name === theyOweList[idx].person_name && d.entry_type === 'debt' && !d.sale) && (
                                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity no-print">
                                                                <button
                                                                    onClick={() => {
                                                                        const entry = debts.find(d => d.person_name === theyOweList[idx].person_name && d.entry_type === 'debt' && !d.sale)
                                                                        if (entry) handleEditEntry(entry)
                                                                    }}
                                                                    className="btn btn-icon btn-sm text-primary-500 hover:bg-white"
                                                                    title="تعديل المبلغ"
                                                                >
                                                                    <Pencil size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ padding: 'var(--spacing-3) var(--spacing-6)', color: 'var(--success-600)', fontWeight: 'bold', background: theyOweList[idx] ? 'var(--success-50)' : 'transparent' }}>
                                                    {theyOweList[idx] ? formatNumber(theyOweList[idx].amount) : ''}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Manual Logs Section - Element entered by this page */}
                    <div className="card mt-8 no-print" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: 'var(--spacing-4) var(--spacing-6)', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                            <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>سجل العمليات المضافة يدوياً في هذه الصفحة</h3>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                        <th style={{ padding: '12px 24px' }}>الاسم</th>
                                        <th style={{ padding: '12px 24px' }}>النوع</th>
                                        <th style={{ padding: '12px 24px' }}>المبلغ</th>
                                        <th style={{ padding: '12px 24px' }}>التاريخ</th>
                                        <th style={{ padding: '12px 24px', textAlign: 'center' }}>إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {debts.filter(d => d.entry_type === 'liability' || (d.entry_type === 'debt' && !d.sale)).length === 0 ? (
                                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>لا توجد عمليات مضافة يدوياً</td></tr>
                                    ) : (
                                        debts.filter(d => d.entry_type === 'liability' || (d.entry_type === 'debt' && !d.sale))
                                            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                                            .map(entry => (
                                                <tr key={entry.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '12px 24px', fontWeight: '600' }}>{entry.person_name}</td>
                                                    <td style={{ padding: '12px 24px' }}>
                                                        <span className={`badge ${entry.entry_type === 'liability' ? 'badge-danger' : 'badge-success'}`}>
                                                            {entry.entry_type === 'liability' ? 'علينا له' : 'لنا عليه'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 24px', fontWeight: '700' }}>{formatNumber(entry.amount)} د.ع</td>
                                                    <td style={{ padding: '12px 24px' }}>{entry.date}</td>
                                                    <td style={{ padding: '12px 24px', textAlign: 'center' }}>
                                                        <div className="flex justify-center gap-2">
                                                            <button onClick={() => handleEditEntry(entry)} className="btn btn-icon text-primary-500" title="تعديل"><Pencil size={18} /></button>
                                                            <button onClick={() => handleDeleteEntry(entry.id)} className="btn btn-icon text-error-500" title="حذف"><Trash2 size={18} /></button>
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
        </div>
    )
}

export default CheckPage
