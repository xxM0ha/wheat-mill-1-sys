import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSession } from '../contexts/SessionContext'
import api from '../api/axios'
import {
    ArrowRight,
    BookOpen,
    AlertCircle,
    FolderOpen,
    Pencil,
    Trash2,
    PlusCircle,
    CheckCircle2,
    XCircle,
    ArrowDownCircle,
    ArrowUpCircle,
    Printer,
    Eye,
    UserMinus
} from 'lucide-react'
import { formatDate } from '../utils/dateUtils'

function DebtsPage() {
    const navigate = useNavigate()
    const { currentSession } = useSession()
    const [searchParams] = useSearchParams()
    const urlPersonName = searchParams.get('person_name')

    const [debts, setDebts] = useState([])
    const [loading, setLoading] = useState(false)
    const [submitLoading, setSubmitLoading] = useState(false)
    const [error, setError] = useState('')
    const [editingId, setEditingId] = useState(null)
    const [selectedSale, setSelectedSale] = useState(null)
    const [isEditingSale, setIsEditingSale] = useState(false)
    const [saleEditForm, setSaleEditForm] = useState({})
    const [suggestions, setSuggestions] = useState([])
    const [filters, setFilters] = useState({
        person_name: '',
        date_from: '',
        date_to: '',
        balance_type: '' // 'they_want' or 'we_want' or ''
    })


    // Separate form states for Debt and Payment
    const initialFormState = {
        person_name: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
    }

    const [debtForm, setDebtForm] = useState({ ...initialFormState })
    const [paymentForm, setPaymentForm] = useState({ ...initialFormState })
    const [editForm, setEditForm] = useState({ ...initialFormState, entry_type: 'debt' })

    useEffect(() => {
        if (!currentSession) {
            navigate('/sessions')
            return
        }
        fetchDebts()
        fetchSuggestions()
    }, [currentSession, filters.person_name, filters.date_from, filters.date_to])

    useEffect(() => {
        if (filters.person_name) {
            setDebtForm(prev => ({ ...prev, person_name: filters.person_name }))
            setPaymentForm(prev => ({ ...prev, person_name: filters.person_name }))
        }
    }, [filters.person_name])

    useEffect(() => {
        if (urlPersonName) {
            setFilters(prev => ({ ...prev, person_name: urlPersonName }))
        }
    }, [urlPersonName])

    const fetchDebts = async () => {
        setLoading(true)
        try {
            let url = `/sessions/debts/`
            const params = new URLSearchParams()
            if (filters.person_name) params.append('person_name', filters.person_name)
            if (filters.date_from) params.append('date_from', filters.date_from)
            if (filters.date_to) params.append('date_to', filters.date_to)

            const queryString = params.toString()
            if (queryString) url += `?${queryString}`

            const response = await api.get(url)
            setDebts(response.data)
        } catch (err) {
            console.error('Error fetching debts:', err)
            setError('حدث خطأ في تحميل البيانات')
        } finally {
            setLoading(false)
        }
    }

    const handlePrint = () => {
        // Build URL with current filters
        // Note: We don't include session parameter because debts are shared across all sessions
        const params = new URLSearchParams()

        if (filters.person_name) params.append('person_name', filters.person_name)
        if (filters.date_from) params.append('date_from', filters.date_from)
        if (filters.date_to) params.append('date_to', filters.date_to)

        const url = `http://localhost:8000/api/sessions/print/debts/?${params.toString()}`
        window.open(url, '_blank')
    }

    const handlePrintSummary = () => {
        if (!balanceSummary || balanceSummary.length === 0) return

        const title = filters.balance_type === 'we_want' ? 'كشف المبالغ المطلوبة (نطلبهم)' : 'كشف المبالغ المستحقة (يطلبوننا)'
        const total = balanceSummary.reduce((sum, item) => sum + item.net_balance, 0)

        const printWindow = window.open('', '_blank')
        printWindow.document.write(`
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <title>${title}</title>
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
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th, td { border: 1px solid #333; padding: 10px; text-align: right; }
                    th { background: #f5f5f5; font-weight: bold; }
                    .total-row { background: #e0e0e0; font-weight: bold; font-size: 1.1em; }
                    .amount { color: ${filters.balance_type === 'we_want' ? '#c00' : '#b45309'}; font-weight: bold; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                    @media print { 
                        body { padding: 10px; } 
                        @page { margin: 1cm; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${title}</h1>
                    <p>${currentSession?.quota_label || ''} - ${new Date().toLocaleDateString('ar-EG')}</p>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 50px;">#</th>
                            <th>اسم العميل</th>
                            <th style="width: 150px;">المبلغ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${balanceSummary.map((item, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${item.person_name}</td>
                                <td class="amount">${formatNumber(item.net_balance)} د.ع</td>
                            </tr>
                        `).join('')}
                        <tr class="total-row">
                            <td colspan="2" style="text-align: center;">المجموع الكلي (${balanceSummary.length} عميل)</td>
                            <td class="amount">${formatNumber(total)} د.ع</td>
                        </tr>
                    </tbody>
                </table>

                <div class="footer">
                    <p>تاريخ الطباعة: ${new Date().toLocaleString('ar-EG')}</p>
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

    const fetchSuggestions = async () => {
        try {
            const response = await api.get('/sessions/debts/suggestions/')
            setSuggestions(response.data.persons || [])
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

    const cleanNumber = (str) => {
        return str.toString().replace(/,/g, '')
    }

    // Calculate balance per person and filter debts by balance_type
    const { filteredDebts, balanceSummary } = useMemo(() => {
        // Calculate balance per person
        const personBalances = {}
        debts.forEach(debt => {
            const name = debt.person_name
            if (!personBalances[name]) {
                personBalances[name] = { total_debt: 0, total_payment: 0 }
            }
            if (debt.entry_type === 'debt') {
                personBalances[name].total_debt += parseFloat(debt.amount) || 0
            } else if (debt.entry_type === 'payment') {
                personBalances[name].total_payment += parseFloat(debt.amount) || 0
            }
        })

        if (!filters.balance_type) {
            return { filteredDebts: debts, balanceSummary: [] }
        }

        // Get persons that match the filter and build summary
        const summary = []
        const matchingPersons = Object.keys(personBalances).filter(name => {
            const balance = personBalances[name]
            const netBalance = balance.total_debt - balance.total_payment
            if (filters.balance_type === 'we_want' && netBalance > 0) {
                summary.push({ person_name: name, net_balance: netBalance })
                return true
            } else if (filters.balance_type === 'they_want' && netBalance < 0) {
                summary.push({ person_name: name, net_balance: Math.abs(netBalance) })
                return true
            }
            return false
        })

        return {
            filteredDebts: debts.filter(debt => matchingPersons.includes(debt.person_name)),
            balanceSummary: summary.sort((a, b) => b.net_balance - a.net_balance)
        }
    }, [debts, filters.balance_type])

    const handleAmountChange = (e, type, isEdit = false) => {
        let value = e.target.value
        value = cleanNumber(value).replace(/[^0-9.]/g, '')
        if ((value.match(/\./g) || []).length > 1) return

        if (isEdit) {
            setEditForm({ ...editForm, amount: value })
        } else if (type === 'debt') {
            setDebtForm({ ...debtForm, amount: value })
        } else {
            setPaymentForm({ ...paymentForm, amount: value })
        }
    }

    const handleCreate = async (type) => {
        const data = type === 'debt' ? debtForm : paymentForm
        if (!data.person_name || !data.amount) {
            setError('يرجى ملء الحقول المطلوبة')
            return
        }

        setSubmitLoading(true)
        setError('')
        try {
            const payload = {
                ...data,
                entry_type: type,
                session: currentSession.id,
                amount: parseFloat(data.amount)
            }

            const response = await api.post('/sessions/debts/', payload)
            setDebts([response.data, ...debts])

            if (type === 'debt') setDebtForm({ ...initialFormState })
            else setPaymentForm({ ...initialFormState })

            // Refresh names list to include new client if added
            fetchSuggestions()
        } catch (err) {
            setError(err.response?.data?.error || 'حدث خطأ في الحفظ')
        } finally {
            setSubmitLoading(false)
        }
    }

    const handleUpdate = async (e) => {
        e.preventDefault()
        if (!editForm.person_name || !editForm.amount) {
            setError('يرجى ملء الحقول المطلوبة')
            return
        }

        setSubmitLoading(true)
        setError('')
        try {
            const payload = {
                ...editForm,
                amount: parseFloat(editForm.amount),
                session: currentSession.id
            }
            const response = await api.put(`/sessions/debts/${editingId}/`, payload)
            setDebts(debts.map(d => d.id === editingId ? response.data : d))
            setEditingId(null)

            // Refresh names list
            fetchSuggestions()
        } catch (err) {
            setError('حدث خطأ في التحديث')
        } finally {
            setSubmitLoading(false)
        }
    }

    const handleEdit = (debt) => {
        if (debt.sale) {
            alert('هذا الدين مرتبط بعملية بيع، يرجى تعديله من صفحة المبيعات.')
            return
        }
        setEditingId(debt.id)
        setEditForm({
            person_name: debt.person_name,
            entry_type: debt.entry_type,
            amount: debt.amount.toString(),
            date: debt.date,
            notes: debt.notes || ''
        })
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleDelete = async (debt) => {
        if (debt.sale) {
            alert('هذا الدين مرتبط بعملية بيع، لا يمكن حذفه مباشرة.')
            return
        }
        if (!window.confirm('هل أنت متأكد من الحذف؟')) return
        try {
            await api.delete(`/sessions/debts/${debt.id}/`)
            setDebts(debts.filter(d => d.id !== debt.id))
        } catch (err) {
            setError('حدث خطأ في الحذف')
        }
    }

    const handleSaleEdit = (sale) => {
        setIsEditingSale(true)
        setSaleEditForm({
            ...sale,
            quantity_tons: parseFloat(sale.quantity_kilos) / 1000
        })
    }

    const handleSaleUpdate = async (e) => {
        e.preventDefault()
        setSubmitLoading(true)
        setError('')
        try {
            const qtyKilos = parseFloat(saleEditForm.quantity_tons) * 1000
            const price = parseFloat(saleEditForm.price_per_ton)
            const total = qtyKilos * (price / 1000)

            const payload = {
                ...saleEditForm,
                quantity_kilos: qtyKilos,
                price_per_ton: price,
                total_amount: total,
                amount_paid: parseFloat(saleEditForm.amount_paid)
            }

            await api.put(`/sessions/sales/${saleEditForm.id}/`, payload)
            setIsEditingSale(false)
            setSelectedSale(null)
            fetchDebts() // Refresh debts list which will show updated amount
            alert('تم تحديث البيع والدين المرتبط به بنجاح')
        } catch (err) {
            console.error('Error updating sale:', err)
            setError('حدث خطأ في تحديث بيانات البيع')
        } finally {
            setSubmitLoading(false)
        }
    }

    const handleBulkDelete = async () => {
        if (!filters.person_name) {
            alert('يرجى اختيار عميل أولاً من الفلترة للقيام بهذه العملية')
            return
        }

        const confirmResult = window.confirm(`تحذير: سيتم حذف جميع الديون والتسديدات المتعلقة بـ (${filters.person_name}) وتحويل المبيعات المرتبطة إلى مدفوعة بالكامل. هل أنت متأكد؟`)
        if (!confirmResult) return

        setLoading(true)
        try {
            const response = await api.post('/sessions/debts/bulk_delete_by_person/', { person_name: filters.person_name })
            const details = response.data.details
            alert(`تمت العملية بنجاح:\n- تم حذف ${details.debts_deleted} سجل دين/تسديد\n- تم تحويل ${details.sales_marked_paid} مبيعات إلى مدفوعة`)
            setFilters({ ...filters, person_name: '' })
            fetchDebts()
            fetchSuggestions()
        } catch (err) {
            console.error('Error in bulk delete:', err)
            setError('حدث خطأ أثناء محاولة حذف بيانات العميل')
        } finally {
            setLoading(false)
        }
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
                            background: 'linear-gradient(135deg, var(--primary-500) 0%, var(--primary-600) 100%)',
                            borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                        }}>
                            <BookOpen size={24} />
                        </div>
                        <div>
                            <h4 style={{ margin: 0 }}>الديون والتسديدات</h4>
                            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--gray-500)' }}>
                                كشف حسابات العملاء - {currentSession?.quota_label}
                            </p>
                        </div>
                    </div>
                    <div className="no-print" style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
                        {filters.person_name && (
                            <button className="btn btn-danger flex items-center gap-2" onClick={handleBulkDelete}>
                                <UserMinus size={18} />
                                حذف ديون العميل
                            </button>
                        )}
                        <button className="btn btn-secondary flex items-center gap-2" onClick={handlePrint}>
                            <Printer size={18} />
                            طباعة الكشف
                        </button>
                    </div>
                </div>
            </header>

            <main className="dashboard-content">
                <div className="animate-fadeIn">

                    {/* Entry Forms Stacked Vertically */}
                    <div className="no-print">
                        {editingId ? (
                            <div className="card mb-6 ring-2 ring-primary-500 ring-offset-2" style={{ padding: 'var(--spacing-4)' }}>
                                <h4 className="mb-4">تعديل العملية</h4>
                                <form onSubmit={handleUpdate}>
                                    <div className="selection-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-4)' }}>
                                        <div className="form-group mb-0">
                                            <label className="form-label text-sm">الاسم</label>
                                            <input type="text" className="form-input py-1.5" value={editForm.person_name} onChange={(e) => setEditForm({ ...editForm, person_name: e.target.value })} />
                                        </div>
                                        <div className="form-group mb-0">
                                            <label className="form-label text-sm">نوع العملية</label>
                                            <select className="form-input py-1.5" value={editForm.entry_type} onChange={(e) => setEditForm({ ...editForm, entry_type: e.target.value })}>
                                                <option value="debt">دين (عليه)</option>
                                                <option value="payment">تسديد (منه)</option>
                                            </select>
                                        </div>
                                        <div className="form-group mb-0">
                                            <label className="form-label text-sm">المبلغ</label>
                                            <input type="text" className="form-input py-1.5" value={formatNumber(editForm.amount)} onChange={(e) => handleAmountChange(e, null, true)} />
                                        </div>
                                        <div className="form-group mb-0">
                                            <label className="form-label text-sm">التاريخ</label>
                                            <input type="date" className="form-date py-1.5" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
                                        </div>
                                        <div className="form-group mb-0">
                                            <label className="form-label text-sm">ملاحظات</label>
                                            <input type="text" className="form-input py-1.5" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="إضافة ملاحظات..." />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button type="submit" className="btn btn-success py-1.5 px-4 text-sm" disabled={submitLoading}>{submitLoading ? 'جاري...' : 'تحديث'}</button>
                                        <button type="button" onClick={() => setEditingId(null)} className="btn btn-secondary py-1.5 px-4 text-sm">إلغاء</button>
                                    </div>
                                </form>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-6)' }}>
                                {/* Debt Form Card - Minimized */}
                                <div className="card shadow-sm" style={{ borderRight: '4px solid var(--error-500)', padding: 'var(--spacing-4)' }}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <ArrowUpCircle className="text-error-500" size={18} />
                                        <h4 style={{ margin: 0, fontSize: 'var(--font-size-base)' }}>تسجيل دين (عليه)</h4>
                                    </div>
                                    <form onSubmit={(e) => { e.preventDefault(); handleCreate('debt'); }} className="selection-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--spacing-3)' }}>
                                        <div className="form-group mb-0">
                                            <input type="text" className="form-input py-1.5 text-sm" list="names" value={debtForm.person_name} onChange={(e) => setDebtForm({ ...debtForm, person_name: e.target.value })} placeholder="الاسم..." title="اسم الشخص" />
                                        </div>
                                        <div className="form-group mb-0">
                                            <input type="text" className="form-input py-1.5 text-sm" value={formatNumber(debtForm.amount)} onChange={(e) => handleAmountChange(e, 'debt')} placeholder="المبلغ..." title="المبلغ (د.ع)" />
                                        </div>
                                        <div className="form-group mb-0">
                                            <input type="date" className="form-date py-1.5 text-sm" value={debtForm.date} onChange={(e) => setDebtForm({ ...debtForm, date: e.target.value })} title="التاريخ" />
                                        </div>
                                        <div className="form-group mb-0">
                                            <input type="text" className="form-input py-1.5 text-sm" value={debtForm.notes} onChange={(e) => setDebtForm({ ...debtForm, notes: e.target.value })} placeholder="ملاحظات..." title="ملاحظات" />
                                        </div>
                                        <div className="form-group mb-0 flex items-end">
                                            <button type="submit" className="btn btn-danger w-full py-1.5 text-sm font-bold" disabled={submitLoading}>
                                                {submitLoading ? 'جاري...' : '+ إضافة دين'}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Payment Form Card - Minimized */}
                                <div className="card shadow-sm" style={{ borderRight: '4px solid var(--success-500)', padding: 'var(--spacing-4)' }}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <ArrowDownCircle className="text-success-500" size={18} />
                                        <h4 style={{ margin: 0, fontSize: 'var(--font-size-base)' }}>تسجيل تسديد (منه)</h4>
                                    </div>
                                    <form onSubmit={(e) => { e.preventDefault(); handleCreate('payment'); }} className="selection-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--spacing-3)' }}>
                                        <div className="form-group mb-0">
                                            <input type="text" className="form-input py-1.5 text-sm" list="names" value={paymentForm.person_name} onChange={(e) => setPaymentForm({ ...paymentForm, person_name: e.target.value })} placeholder="الاسم..." title="اسم الشخص" />
                                        </div>
                                        <div className="form-group mb-0">
                                            <input type="text" className="form-input py-1.5 text-sm" value={formatNumber(paymentForm.amount)} onChange={(e) => handleAmountChange(e, 'payment')} placeholder="المبلغ المسدد..." title="المبلغ المسدد (د.ع)" />
                                        </div>
                                        <div className="form-group mb-0">
                                            <input type="date" className="form-date py-1.5 text-sm" value={paymentForm.date} onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })} title="التاريخ" />
                                        </div>
                                        <div className="form-group mb-0">
                                            <input type="text" className="form-input py-1.5 text-sm" value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} placeholder="ملاحظات..." title="ملاحظات" />
                                        </div>
                                        <div className="form-group mb-0 flex items-end">
                                            <button type="submit" className="btn btn-success w-full py-1.5 text-sm font-bold" disabled={submitLoading}>
                                                {submitLoading ? 'جاري...' : '+ إضافة تسديد'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>

                    <datalist id="names">
                        {suggestions.map((name, i) => <option key={i} value={name} />)}
                    </datalist>

                    {/* Records Grid */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: 'var(--spacing-6) var(--spacing-8)', borderBottom: '1px solid var(--gray-100)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                            <div className="flex justify-between items-center w-full">
                                <h3 style={{ margin: 0 }}>التقرير المالي للعملاء</h3>
                                {(() => {
                                    // Group by person to get true debts vs credits
                                    const balances = debts.reduce((acc, curr) => {
                                        const name = curr.person_name;
                                        const amt = curr.entry_type === 'debt' ? parseFloat(curr.amount) : -parseFloat(curr.amount);
                                        acc[name] = (acc[name] || 0) + amt;
                                        return acc;
                                    }, {});

                                    const totals = Object.values(balances).reduce((acc, bal) => {
                                        if (bal > 0) acc.weWant += bal;
                                        else acc.theyWant += Math.abs(bal);
                                        return acc;
                                    }, { weWant: 0, theyWant: 0 });

                                    const currentBalance = debts.reduce((acc, curr) => acc + (curr.entry_type === 'debt' ? parseFloat(curr.amount) : -parseFloat(curr.amount)), 0);
                                    const isRed = currentBalance > 0;

                                    if (filters.person_name) {
                                        return (
                                            <div style={{
                                                textAlign: 'left',
                                                padding: 'var(--spacing-2) var(--spacing-4)',
                                                border: isRed ? '2px solid var(--error-500)' : '2px solid var(--success-500)',
                                                borderRadius: 'var(--radius-lg)',
                                                background: isRed ? 'var(--error-50)' : 'var(--success-50)'
                                            }}>
                                                <span style={{ color: 'var(--gray-700)', fontSize: 'var(--font-size-sm)', fontWeight: '700' }}>
                                                    {isRed ? 'نطلبه: ' : 'يطلبنا: '}
                                                </span>
                                                <span style={{
                                                    color: isRed ? 'var(--error-600)' : 'var(--success-600)',
                                                    fontSize: 'var(--font-size-base)', fontWeight: 'bold',
                                                    marginRight: 'var(--spacing-2)'
                                                }}>
                                                    {formatNumber(Math.abs(currentBalance))} د.ع
                                                </span>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="flex gap-4">
                                            <div style={{
                                                textAlign: 'left',
                                                padding: 'var(--spacing-2) var(--spacing-4)',
                                                border: '2px solid var(--error-500)',
                                                borderRadius: 'var(--radius-lg)',
                                                background: 'var(--error-50)'
                                            }}>
                                                <span style={{ color: 'var(--gray-700)', fontSize: 'var(--font-size-sm)', fontWeight: '700' }}>نطلبهم: </span>
                                                <span style={{ color: 'var(--error-600)', fontSize: 'var(--font-size-base)', fontWeight: 'bold', marginRight: 'var(--spacing-2)' }}>
                                                    {formatNumber(totals.weWant)} د.ع
                                                </span>
                                            </div>
                                            <div style={{
                                                textAlign: 'left',
                                                padding: 'var(--spacing-2) var(--spacing-4)',
                                                border: '2px solid var(--success-500)',
                                                borderRadius: 'var(--radius-lg)',
                                                background: 'var(--success-50)'
                                            }}>
                                                <span style={{ color: 'var(--gray-700)', fontSize: 'var(--font-size-sm)', fontWeight: '700' }}>يطلبوننا: </span>
                                                <span style={{ color: 'var(--success-600)', fontSize: 'var(--font-size-base)', fontWeight: 'bold', marginRight: 'var(--spacing-2)' }}>
                                                    {formatNumber(totals.theyWant)} د.ع
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Inline Filters */}
                            <div className="flex flex-wrap items-center gap-4 py-3 px-4 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-gray-500">فلترة بالعميل:</span>
                                    <select
                                        className="form-input py-1 px-3 text-sm h-auto w-64"
                                        value={filters.person_name}
                                        onChange={(e) => setFilters({ ...filters, person_name: e.target.value })}
                                    >
                                        <option value="">كل الأسماء</option>
                                        {suggestions.map((name, i) => <option key={i} value={name}>{name}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-gray-500">من:</span>
                                    <input
                                        type="date"
                                        className="form-date py-1 px-3 text-sm h-auto"
                                        value={filters.date_from}
                                        onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-gray-500">إلى:</span>
                                    <input
                                        type="date"
                                        className="form-date py-1 px-3 text-sm h-auto"
                                        value={filters.date_to}
                                        onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                                    />
                                </div>
                                {(filters.person_name || filters.date_from || filters.date_to || filters.balance_type) && (
                                    <button
                                        className="btn btn-secondary py-1 px-3 text-sm h-auto flex items-center gap-1"
                                        onClick={() => setFilters({ person_name: '', date_from: '', date_to: '', balance_type: '' })}
                                    >
                                        <XCircle size={14} />
                                        مسح
                                    </button>
                                )}
                                <div className="flex items-center gap-2 mr-auto">
                                    <span className="text-sm font-bold text-gray-500">حسب الرصيد:</span>
                                    <button
                                        className={`btn py-1 px-3 text-sm h-auto flex items-center gap-1 ${filters.balance_type === 'they_want' ? 'btn-warning' : 'btn-secondary'}`}
                                        onClick={() => setFilters({ ...filters, balance_type: filters.balance_type === 'they_want' ? '' : 'they_want' })}
                                    >
                                        <ArrowDownCircle size={14} />
                                        يطلبوننا
                                    </button>
                                    <button
                                        className={`btn py-1 px-3 text-sm h-auto flex items-center gap-1 ${filters.balance_type === 'we_want' ? 'btn-danger' : 'btn-secondary'}`}
                                        onClick={() => setFilters({ ...filters, balance_type: filters.balance_type === 'we_want' ? '' : 'we_want' })}
                                    >
                                        <ArrowUpCircle size={14} />
                                        نطلبهم
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Summary Table when balance_type filter is applied */}
                        {filters.balance_type && balanceSummary.length > 0 ? (
                            <div>
                                <div className="flex justify-between items-center mb-4 px-4">
                                    <h4 style={{ margin: 0, color: filters.balance_type === 'we_want' ? 'var(--error-600)' : 'var(--warning-600)' }}>
                                        {filters.balance_type === 'we_want' ? 'كشف المبالغ المطلوبة (نطلبهم)' : 'كشف المبالغ المستحقة (يطلبوننا)'}
                                    </h4>
                                    <button
                                        className="btn btn-secondary flex items-center gap-2"
                                        onClick={handlePrintSummary}
                                    >
                                        <Printer size={18} />
                                        طباعة الكشف
                                    </button>
                                </div>
                                <div className="table-container">
                                    <table className="table-responsive" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                        <thead>
                                            <tr style={{ background: 'var(--gray-50)', borderBottom: '2px solid var(--gray-100)' }}>
                                                <th style={{ padding: 'var(--spacing-4) var(--spacing-4)', color: 'var(--gray-600)', fontWeight: '700' }}>#</th>
                                                <th style={{ padding: 'var(--spacing-4) var(--spacing-4)', color: 'var(--gray-600)', fontWeight: '700' }}>اسم العميل</th>
                                                <th style={{ padding: 'var(--spacing-4) var(--spacing-4)', color: 'var(--gray-600)', fontWeight: '700' }}>المبلغ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {balanceSummary.map((item, index) => (
                                                <tr key={item.person_name} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                                                    <td style={{ padding: 'var(--spacing-4) var(--spacing-4)', color: 'var(--gray-500)' }}>{index + 1}</td>
                                                    <td style={{ padding: 'var(--spacing-4) var(--spacing-4)', fontWeight: 'bold' }}>{item.person_name}</td>
                                                    <td style={{
                                                        padding: 'var(--spacing-4) var(--spacing-4)',
                                                        fontWeight: 'bold',
                                                        color: filters.balance_type === 'we_want' ? 'var(--error-600)' : 'var(--warning-600)'
                                                    }}>
                                                        {formatNumber(item.net_balance)} د.ع
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr style={{ background: 'var(--gray-100)', borderTop: '2px solid var(--gray-300)' }}>
                                                <td colSpan="2" style={{ padding: 'var(--spacing-4) var(--spacing-4)', fontWeight: 'bold', textAlign: 'center' }}>
                                                    المجموع الكلي ({balanceSummary.length} عميل)
                                                </td>
                                                <td style={{
                                                    padding: 'var(--spacing-4) var(--spacing-4)',
                                                    fontWeight: 'bold',
                                                    fontSize: '1.1em',
                                                    color: filters.balance_type === 'we_want' ? 'var(--error-600)' : 'var(--warning-600)'
                                                }}>
                                                    {formatNumber(balanceSummary.reduce((sum, item) => sum + item.net_balance, 0))} د.ع
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="table-container">
                                <table className="table-responsive" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--gray-50)', borderBottom: '2px solid var(--gray-100)' }}>
                                            <th style={{ padding: 'var(--spacing-4) var(--spacing-4)', color: 'var(--gray-600)', fontWeight: '700' }}>التاريخ</th>
                                            <th style={{ padding: 'var(--spacing-4) var(--spacing-4)', color: 'var(--gray-600)', fontWeight: '700' }}>اسم العميل</th>
                                            <th style={{ padding: 'var(--spacing-4) var(--spacing-4)', color: 'var(--gray-600)', fontWeight: '700', textAlign: 'center' }}>تفاصيل البيع</th>
                                            <th style={{ padding: 'var(--spacing-4) var(--spacing-4)', color: 'var(--gray-600)', fontWeight: '700' }}>نوع العملية</th>
                                            <th style={{ padding: 'var(--spacing-4) var(--spacing-4)', color: 'var(--gray-600)', fontWeight: '700' }}>المبلغ</th>
                                            <th style={{ padding: 'var(--spacing-4) var(--spacing-4)', color: 'var(--gray-600)', fontWeight: '700' }}>ملاحظات</th>
                                            <th className="no-print sticky-column" style={{ padding: 'var(--spacing-4) var(--spacing-4)', color: 'var(--gray-600)', fontWeight: '700', textAlign: 'center' }}>إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan="7" style={{ padding: 'var(--spacing-12)', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div><p className="mt-4">جاري التحميل...</p></td></tr>
                                        ) : filteredDebts.length === 0 ? (
                                            <tr><td colSpan="7" style={{ padding: 'var(--spacing-12)', textAlign: 'center' }}><FolderOpen size={48} className="text-gray-300 mb-4 mx-auto" /><p style={{ color: 'var(--gray-500)' }}>لا يوجد بيانات</p></td></tr>
                                        ) : (
                                            filteredDebts.map((debt) => (
                                                <tr key={debt.id} style={{ borderBottom: '1px solid var(--gray-100)', background: editingId === debt.id ? 'var(--primary-50)' : 'transparent' }}>
                                                    <td style={{ padding: 'var(--spacing-4) var(--spacing-4)' }}>{formatDate(debt.date)}</td>
                                                    <td style={{ padding: 'var(--spacing-4) var(--spacing-4)', fontWeight: 'bold' }}>{debt.person_name}</td>
                                                    <td style={{ padding: 'var(--spacing-4) var(--spacing-4)', textAlign: 'center' }}>
                                                        {debt.sale_details ? (
                                                            <button
                                                                onClick={() => setSelectedSale(debt.sale_details)}
                                                                className="btn btn-icon text-primary-500 hover:bg-primary-50"
                                                                title="عرض تفاصيل البيع"
                                                            >
                                                                <Eye size={18} />
                                                                <span style={{ fontSize: '0.7rem', display: 'block' }}>فاتورة {debt.sale_details.invoice_number}</span>
                                                            </button>
                                                        ) : (
                                                            <span style={{ color: 'var(--gray-300)', fontSize: '0.8rem' }}>-</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: 'var(--spacing-4) var(--spacing-4)' }}><span className={`badge ${debt.entry_type === 'debt' ? 'badge-danger' : 'badge-success'}`}>{debt.entry_type_display}</span></td>
                                                    <td style={{ padding: 'var(--spacing-4) var(--spacing-4)', color: debt.entry_type === 'debt' ? 'var(--error-500)' : 'var(--success-500)', fontWeight: 'bold' }}>{debt.entry_type === 'debt' ? '' : '-'}{formatNumber(debt.amount)}</td>
                                                    <td style={{ padding: 'var(--spacing-4) var(--spacing-4)', fontSize: 'var(--font-size-sm)', color: 'var(--gray-600)' }}>
                                                        {debt.sale_details ? (
                                                            <div style={{ fontSize: 'var(--font-size-xs)', lineHeight: '1.5' }}>
                                                                <strong>فاتورة {debt.sale_details.invoice_number}</strong>
                                                                <br />
                                                                المادة: {debt.sale_details.item_type_display} |
                                                                الكمية: {formatNumber(debt.sale_details.quantity_kilos / 1000)} طن |
                                                                السعر: {formatNumber(debt.sale_details.price_per_ton)} د.ع/طن
                                                                <br />
                                                                السائق: {debt.sale_details.driver_name || '-'}
                                                            </div>
                                                        ) : (
                                                            debt.notes || '-'
                                                        )}
                                                    </td>
                                                    <td className="no-print sticky-column" style={{ padding: 'var(--spacing-4) var(--spacing-4)', textAlign: 'center' }}>
                                                        <div className="flex justify-center gap-2">
                                                            <button onClick={() => handleEdit(debt)} className="btn btn-icon text-primary-500" title="تعديل" disabled={!!debt.sale}><Pencil size={18} /></button>
                                                            <button onClick={() => handleDelete(debt)} className="btn btn-icon text-error-500" title="حذف" disabled={!!debt.sale}><Trash2 size={18} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sale Details Modal */}
                {selectedSale && (
                    <div className="loading-overlay animate-fadeIn" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1000 }} onClick={() => { setSelectedSale(null); setIsEditingSale(false); }}>
                        <div className="card animate-slideUp" style={{ maxWidth: '700px', width: '95%', padding: 'var(--spacing-8)' }} onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 style={{ margin: 0 }}>{isEditingSale ? 'تعديل بيانات البيع' : 'تفاصيل عملية البيع'}</h3>
                                <button onClick={() => { setSelectedSale(null); setIsEditingSale(false); }} className="btn btn-icon btn-secondary">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            {isEditingSale ? (
                                <form onSubmit={handleSaleUpdate}>
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="form-group mb-0">
                                            <label className="form-label text-sm">رقم القائمة</label>
                                            <input type="text" className="form-input" value={saleEditForm.invoice_number} onChange={e => setSaleEditForm({ ...saleEditForm, invoice_number: e.target.value })} />
                                        </div>
                                        <div className="form-group mb-0">
                                            <label className="form-label text-sm">التاريخ</label>
                                            <input type="date" className="form-input" value={saleEditForm.date} onChange={e => setSaleEditForm({ ...saleEditForm, date: e.target.value })} />
                                        </div>
                                        <div className="form-group mb-0">
                                            <label className="form-label text-sm">المشتري</label>
                                            <input type="text" className="form-input" value={saleEditForm.buyer_name} onChange={e => setSaleEditForm({ ...saleEditForm, buyer_name: e.target.value })} />
                                        </div>
                                        <div className="form-group mb-0">
                                            <label className="form-label text-sm">السائق</label>
                                            <input type="text" className="form-input" value={saleEditForm.driver_name} onChange={e => setSaleEditForm({ ...saleEditForm, driver_name: e.target.value })} />
                                        </div>
                                        <div className="form-group mb-0">
                                            <label className="form-label text-sm">الكمية (بالطن)</label>
                                            <input type="number" step="0.001" className="form-input" value={saleEditForm.quantity_tons} onChange={e => setSaleEditForm({ ...saleEditForm, quantity_tons: e.target.value })} />
                                        </div>
                                        <div className="form-group mb-0">
                                            <label className="form-label text-sm">سعر الطن</label>
                                            <input type="number" className="form-input" value={saleEditForm.price_per_ton} onChange={e => setSaleEditForm({ ...saleEditForm, price_per_ton: e.target.value })} />
                                        </div>
                                        <div className="form-group mb-0">
                                            <label className="form-label text-sm">المبلغ المدفوع</label>
                                            <input type="number" className="form-input" value={saleEditForm.amount_paid} onChange={e => setSaleEditForm({ ...saleEditForm, amount_paid: e.target.value })} />
                                        </div>
                                        <div className="form-group mb-0">
                                            <label className="form-label text-sm">نوع المادة</label>
                                            <select className="form-input" value={saleEditForm.item_type} onChange={e => setSaleEditForm({ ...saleEditForm, item_type: e.target.value })}>
                                                <option value="flour">طحين</option>
                                                <option value="bran">نخالة</option>
                                                <option value="impurities">شوائب</option>
                                                <option value="wheat">حنطة</option>
                                                <option value="broken_wheat">كسر حنطة</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded mb-6 border border-gray-100">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-600 font-bold">المبلغ الكلي المتوقع:</span>
                                            <span className="text-primary-700 font-bold text-lg">
                                                {formatNumber((parseFloat(saleEditForm.quantity_tons || 0) * parseFloat(saleEditForm.price_per_ton || 0)))} د.ع
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button type="button" onClick={() => setIsEditingSale(false)} className="btn btn-secondary px-6">إلغاء</button>
                                        <button type="submit" className="btn btn-success px-8" disabled={submitLoading}>{submitLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'}</button>
                                    </div>
                                </form>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-6">
                                        {/* ... (existing detail fields) ... */}
                                        <div className="detail-item">
                                            <label className="form-label" style={{ color: 'var(--gray-500)' }}>رقم القائمة</label>
                                            <p className="font-bold" style={{ fontSize: 'var(--font-size-lg)', margin: 0 }}>{selectedSale.invoice_number}</p>
                                        </div>
                                        <div className="detail-item">
                                            <label className="form-label" style={{ color: 'var(--gray-500)' }}>التاريخ</label>
                                            <p className="font-bold" style={{ fontSize: 'var(--font-size-lg)', margin: 0 }}>{formatDate(selectedSale.date)}</p>
                                        </div>
                                        <div className="detail-item">
                                            <label className="form-label" style={{ color: 'var(--gray-500)' }}>المشتري</label>
                                            <p className="font-bold" style={{ fontSize: 'var(--font-size-lg)', margin: 0 }}>{selectedSale.buyer_name}</p>
                                        </div>
                                        <div className="detail-item">
                                            <label className="form-label" style={{ color: 'var(--gray-500)' }}>السائق</label>
                                            <p className="font-bold" style={{ fontSize: 'var(--font-size-lg)', margin: 0 }}>{selectedSale.driver_name}</p>
                                        </div>
                                        <div className="detail-item">
                                            <label className="form-label" style={{ color: 'var(--gray-500)' }}>المادة</label>
                                            <p className="font-bold" style={{ fontSize: 'var(--font-size-lg)', margin: 0 }}>{selectedSale.item_type_display}</p>
                                        </div>
                                        <div className="detail-item">
                                            <label className="form-label" style={{ color: 'var(--gray-500)' }}>الكمية (كغم)</label>
                                            <p className="font-bold" style={{ fontSize: 'var(--font-size-lg)', margin: 0 }}>{formatNumber(selectedSale.quantity_kilos)}</p>
                                        </div>
                                        <div className="detail-item">
                                            <label className="form-label" style={{ color: 'var(--gray-500)' }}>سعر الطن</label>
                                            <p className="font-bold" style={{ fontSize: 'var(--font-size-lg)', margin: 0 }}>{formatNumber(selectedSale.price_per_ton)} د.ع</p>
                                        </div>
                                        <div className="detail-item">
                                            <label className="form-label" style={{ color: 'var(--gray-500)' }}>المبلغ الكلي</label>
                                            <p className="font-bold text-primary-600" style={{ fontSize: 'var(--font-size-xl)', margin: 0 }}>{formatNumber(selectedSale.total_amount)} د.ع</p>
                                        </div>
                                        <div className="detail-item">
                                            <label className="form-label" style={{ color: 'var(--gray-500)' }}>المبلغ المدفوع</label>
                                            <p className="font-bold text-success-600" style={{ fontSize: 'var(--font-size-lg)', margin: 0 }}>{formatNumber(selectedSale.amount_paid)} د.ع</p>
                                        </div>
                                        <div className="detail-item">
                                            <label className="form-label" style={{ color: 'var(--gray-500)' }}>المتبقي (دين)</label>
                                            <p className="font-bold text-error-600" style={{ fontSize: 'var(--font-size-lg)', margin: 0 }}>{formatNumber(parseFloat(selectedSale.total_amount) - parseFloat(selectedSale.amount_paid))} د.ع</p>
                                        </div>
                                    </div>

                                    <div className="mt-8 flex justify-center gap-4">
                                        <button onClick={() => handleSaleEdit(selectedSale)} className="btn btn-primary px-12 flex items-center gap-2">
                                            <Pencil size={18} />
                                            تعديل بيانات القائمة
                                        </button>
                                        <button onClick={() => setSelectedSale(null)} className="btn btn-secondary px-12">
                                            إغلاق
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}


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

export default DebtsPage
