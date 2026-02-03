import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../contexts/SessionContext'
import api from '../api/axios'
import {
    ArrowRight,
    Truck,
    AlertCircle,
    FolderOpen,
    Pencil,
    Trash2,
    PlusCircle,
    CheckCircle2,
    XCircle,
    Printer,
    Settings,
    Eye,
    UserMinus
} from 'lucide-react'
import { formatDate } from '../utils/dateUtils'

function DriversPage() {
    const navigate = useNavigate()
    const { currentSession } = useSession()

    const [jobs, setJobs] = useState([])
    const [loading, setLoading] = useState(false)
    const [submitLoading, setSubmitLoading] = useState(false)
    const [error, setError] = useState('')
    const [editingId, setEditingId] = useState(null)
    const [suggestions, setSuggestions] = useState({ drivers: [] })
    const [filters, setFilters] = useState({
        driver_name: '',
        date_from: '',
        date_to: ''
    })

    // Form state
    const initialFormState = {
        driver_name: '',
        quantity: '',
        silo_name: currentSession?.default_silo || '',
        invoice_number: '',
        transport_price_per_ton: '',
        total_amount: '0',
        advance_payment: '0',
        date: new Date().toISOString().split('T')[0]
    }

    const [formData, setFormData] = useState({ ...initialFormState })
    const [showAdvanceModal, setShowAdvanceModal] = useState(false)
    const [advanceForm, setAdvanceForm] = useState({
        driver_name: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
    })

    const [showDriverManagementModal, setShowDriverManagementModal] = useState(false)
    const [showAdvancesListModal, setShowAdvancesListModal] = useState(false)
    const [allDrivers, setAllDrivers] = useState([])
    const [managementLoading, setManagementLoading] = useState(false)


    useEffect(() => {
        if (!currentSession) {
            navigate('/sessions')
            return
        }
        fetchJobs()
        fetchSuggestions()
    }, [currentSession, filters.driver_name, filters.date_from, filters.date_to])

    useEffect(() => {
        const qty = parseFloat(formData.quantity || '0')
        const price = parseFloat(formData.transport_price_per_ton || '0')
        const total = isNaN(qty) || isNaN(price) ? 0 : qty * price

        setFormData(prev => ({
            ...prev,
            total_amount: total.toString()
        }))
    }, [formData.quantity, formData.transport_price_per_ton])

    // Auto-set price to 5 when silo is بازوايا
    useEffect(() => {
        if (formData.silo_name === 'بازوايا' && !formData.transport_price_per_ton) {
            setFormData(prev => ({
                ...prev,
                transport_price_per_ton: '5'
            }))
        }
    }, [formData.silo_name])

    const fetchSuggestions = async () => {
        try {
            const response = await api.get('/sessions/sales/suggestions/?for=mill')
            setSuggestions(response.data)
        } catch (err) {
            console.error('Error fetching suggestions:', err)
        }
    }

    const fetchAllDrivers = async () => {
        setManagementLoading(true)
        try {
            const response = await api.get('/sessions/driver-management/')
            setAllDrivers(response.data)
        } catch (err) {
            console.error('Error fetching all drivers:', err)
        } finally {
            setManagementLoading(false)
        }
    }

    const updateDriverCategory = async (id, category) => {
        try {
            await api.patch(`/sessions/driver-management/${id}/`, { category })
            setAllDrivers(allDrivers.map(d => d.id === id ? { ...d, category } : d))
            fetchSuggestions() // Refresh suggestions in current page
        } catch (err) {
            console.error('Error updating driver category:', err)
            alert('حدث خطأ في تحديث تصنيف السائق')
        }
    }

    const syncDrivers = async () => {
        setManagementLoading(true)
        try {
            await api.post('/sessions/driver-management/sync_from_history/')
            fetchAllDrivers()
        } catch (err) {
            console.error('Error syncing drivers:', err)
        } finally {
            setManagementLoading(false)
        }
    }

    const fetchJobs = async () => {
        setLoading(true)
        try {
            let url = `/sessions/drivers/?session_id=${currentSession.id}`
            if (filters.driver_name) url += `&driver_name=${filters.driver_name}`
            if (filters.date_from) url += `&date_from=${filters.date_from}`
            if (filters.date_to) url += `&date_to=${filters.date_to}`

            const response = await api.get(url)
            const processedJobs = response.data.map(job => ({
                ...job,
                quantity: parseFloat(job.quantity) / 1000
            }))
            setJobs(processedJobs)
        } catch (err) {
            console.error('Error fetching jobs:', err)
            setError('حدث خطأ في تحميل البيانات')
        } finally {
            setLoading(false)
        }
    }

    const formatNumber = (num, digits = 0) => {
        if (num === undefined || num === null || num === '') return ''
        const val = parseFloat(num)
        if (isNaN(val)) return num.toString()
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: digits || 3
        }).format(val)
    }

    const cleanNumber = (str) => {
        return str.toString().replace(/,/g, '')
    }

    const handleNumberChange = (e, field) => {
        let value = e.target.value
        value = cleanNumber(value).replace(/[^0-9.]/g, '')
        if ((value.match(/\./g) || []).length > 1) return

        setFormData(prev => {
            const updated = { ...prev, [field]: value }
            // Recalculate total when quantity or price changes
            if (field === 'quantity' || field === 'transport_price_per_ton') {
                const qty = parseFloat(updated.quantity || '0')
                const price = parseFloat(updated.transport_price_per_ton || '0')
                updated.total_amount = (isNaN(qty) || isNaN(price) ? 0 : qty * price).toString()
            }
            return updated
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.driver_name || !formData.quantity || !formData.silo_name) {
            setError('يرجى ملء الحقول المطلوبة')
            return
        }

        setSubmitLoading(true)
        setError('')
        try {
            const payload = {
                ...formData,
                session: currentSession.id,
                quantity: parseFloat(formData.quantity) * 1000,
                transport_price_per_ton: parseFloat(formData.transport_price_per_ton),
                total_amount: parseFloat(formData.total_amount),
                advance_payment: parseFloat(formData.advance_payment || 0)
            }

            if (editingId) {
                const response = await api.put(`/sessions/drivers/${editingId}/`, payload)
                const processedJob = { ...response.data, quantity: parseFloat(response.data.quantity) / 1000 }
                setJobs(jobs.map(j => j.id === editingId ? processedJob : j))
                setEditingId(null)
            } else {
                const response = await api.post('/sessions/drivers/', payload)
                const processedJob = { ...response.data, quantity: parseFloat(response.data.quantity) / 1000 }
                setJobs([processedJob, ...jobs])
            }

            setFormData({
                ...initialFormState,
                silo_name: currentSession.default_silo || '',
                date: formData.date // Keep the same date for consecutive entries
            })
            fetchSuggestions()
        } catch (err) {
            console.error('Error saving job:', err)
            setError(err.response?.data?.error || 'حدث خطأ في حفظ البيانات')
        } finally {
            setSubmitLoading(false)
        }
    }

    const handlePrint = () => {
        // Build URL with current filters
        const params = new URLSearchParams({
            session: currentSession.id
        })

        if (filters.driver_name) params.append('driver_name', filters.driver_name)
        if (filters.date_from) params.append('date_from', filters.date_from)
        if (filters.date_to) params.append('date_to', filters.date_to)

        const url = `http://localhost:8000/api/sessions/print/drivers/?${params.toString()}`
        window.open(url, '_blank')
    }


    const handleEdit = (job) => {
        setEditingId(job.id)
        setFormData({
            driver_name: job.driver_name,
            quantity: job.quantity.toString(),
            silo_name: job.silo_name,
            invoice_number: job.invoice_number,
            transport_price_per_ton: job.transport_price_per_ton.toString(),
            total_amount: job.total_amount.toString(),
            advance_payment: job.advance_payment.toString(),
            date: job.date
        })
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleDelete = async (id) => {
        if (!window.confirm('هل أنت متأكد من الحذف؟')) return
        try {
            await api.delete(`/sessions/drivers/${id}/`)
            setJobs(jobs.filter(j => j.id !== id))
        } catch (err) {
            setError('حدث خطأ في الحذف')
        }
    }

    const handleAdvanceSubmit = async (e) => {
        e.preventDefault()
        if (!advanceForm.driver_name || !advanceForm.amount) {
            setError('يرجى ملء اسم السائق والمبلغ')
            return
        }

        setSubmitLoading(true)
        setError('')
        try {
            const payload = {
                driver_name: advanceForm.driver_name,
                quantity: 0,
                silo_name: 'سلف',
                invoice_number: advanceForm.notes || '',
                transport_price_per_ton: 0,
                total_amount: 0,
                advance_payment: parseFloat(advanceForm.amount),
                date: advanceForm.date,
                session: currentSession.id
            }

            await api.post('/sessions/drivers/', payload)

            setAdvanceForm({
                driver_name: '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                notes: ''
            })
            setShowAdvanceModal(false)
            fetchJobs()
            fetchSuggestions()
        } catch (err) {
            console.error('Error saving advance:', err)
            setError(err.response?.data?.error || 'حدث خطأ في حفظ السلف')
        } finally {
            setSubmitLoading(false)
        }
    }

    const handleBulkDelete = async () => {
        if (!filters.driver_name) {
            alert('يرجى اختيار سائق أولاً من الفلترة للقيام بهذه العملية')
            return
        }

        const confirmResult = window.confirm(`تحذير: سيتم حذف جميع السجلات والنقليات والسلف المتعلقة بـ (${filters.driver_name}). هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء.`)
        if (!confirmResult) return

        setLoading(true)
        try {
            await api.post('/sessions/drivers/bulk_delete_by_driver/', {
                driver_name: filters.driver_name,
                session_id: currentSession.id
            })
            alert('تم حذف جميع بيانات السائق بنجاح')
            setFilters({ ...filters, driver_name: '' })
            fetchJobs()
            fetchSuggestions()
        } catch (err) {
            console.error('Error in bulk delete:', err)
            setError('حدث خطأ أثناء محاولة حذف بيانات السائق')
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
                            <Truck size={24} />
                        </div>
                        <div>
                            <h4 style={{ margin: 0 }}>السواق والحنطة المستلمة</h4>
                            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--gray-500)' }}>
                                {currentSession?.quota_label} - {currentSession?.session_type_display}
                            </p>
                        </div>
                    </div>
                    <div className="no-print" style={{ display: 'flex', gap: 'var(--spacing-3)', alignItems: 'center' }}>
                        {filters.driver_name && (
                            <button className="btn btn-danger flex items-center gap-2" onClick={handleBulkDelete}>
                                <UserMinus size={18} />
                                حذف بيانات السائق كلياً
                            </button>
                        )}
                        <button className="btn btn-primary flex items-center gap-2" onClick={() => setShowAdvanceModal(true)}>
                            <PlusCircle size={18} />
                            إضافة سلف
                        </button>
                        <button className="btn btn-secondary flex items-center gap-2" onClick={() => { fetchAllDrivers(); setShowDriverManagementModal(true); }}>
                            <Settings size={18} />
                            تصنيفات السواق
                        </button>
                        <button className="btn btn-secondary flex items-center gap-2" onClick={handlePrint}>
                            <Printer size={18} />
                            طباعة القائمة
                        </button>
                    </div>
                </div>
            </header>

            <main className="dashboard-content">
                <div className="animate-fadeIn">
                    {/* Entry Form */}
                    <div className="card mb-6 no-print" style={{ borderTop: '4px solid var(--primary-500)' }}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 style={{ margin: 0 }}>{editingId ? 'تعديل السجل' : 'تسجيل حنطة مستلمة'}</h3>
                            {editingId && (
                                <button onClick={() => { setEditingId(null); setFormData({ ...initialFormState }) }} className="btn btn-secondary py-1 text-sm">إلغاء التعديل</button>
                            )}
                        </div>

                        {error && (
                            <div className="alert alert-error mb-6">
                                <AlertCircle size={20} />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="selection-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-4)' }}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="driver_name">اسم السائق *</label>
                                    <input
                                        id="driver_name"
                                        type="text"
                                        className="form-input"
                                        list="driver-names"
                                        value={formData.driver_name}
                                        onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                                        placeholder="بحث أو كتابة اسم السائق..."
                                        required
                                    />
                                    <datalist id="driver-names">
                                        {suggestions.drivers.map((name, i) => <option key={i} value={name} />)}
                                    </datalist>
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="quantity">الكمية (بالطن) *</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            id="quantity"
                                            type="text"
                                            className="form-input text-left"
                                            value={formData.quantity}
                                            onChange={(e) => handleNumberChange(e, 'quantity')}
                                            placeholder="0"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="invoice_number">رقم القائمة</label>
                                    <input
                                        id="invoice_number"
                                        type="text"
                                        className="form-input"
                                        value={formData.invoice_number}
                                        onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                                        placeholder="رقم القائمة..."
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="transport_price_per_ton">سعر نقل الطن</label>
                                    <input
                                        id="transport_price_per_ton"
                                        type="text"
                                        className="form-input text-left"
                                        value={formData.transport_price_per_ton}
                                        onChange={(e) => handleNumberChange(e, 'transport_price_per_ton')}
                                        placeholder="0"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="silo_name">اسم السايلو *</label>
                                    <input
                                        id="silo_name"
                                        type="text"
                                        className="form-input"
                                        value={formData.silo_name}
                                        onChange={(e) => setFormData({ ...formData, silo_name: e.target.value })}
                                        placeholder="أدخل اسم السايلو..."
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="total_amount">المبلغ الكلي</label>
                                    <input
                                        id="total_amount"
                                        type="text"
                                        className="form-input text-left"
                                        style={{ background: 'var(--gray-50)', fontWeight: 'bold' }}
                                        value={formatNumber(formData.total_amount)}
                                        readOnly
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="advance_payment">السلف</label>
                                    <input
                                        id="advance_payment"
                                        type="text"
                                        className="form-input text-left"
                                        value={formData.advance_payment}
                                        onChange={(e) => handleNumberChange(e, 'advance_payment')}
                                        placeholder="0"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="date">التاريخ</label>
                                    <input
                                        id="date"
                                        type="date"
                                        className="form-date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end mt-6">
                                <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={submitLoading}>
                                    {submitLoading ? (
                                        <><div className="spinner-sm"></div> جارٍ الحفظ...</>
                                    ) : (
                                        <><PlusCircle size={20} /> {editingId ? 'حفظ التعديلات' : 'إضافة السجل'}</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Data Grid Card */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: 'var(--spacing-6) var(--spacing-8)', borderBottom: '1px solid var(--gray-100)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                            <div className="flex justify-between items-center w-full">
                                <h3 style={{ margin: 0 }}>سجل السواق والحنطة</h3>
                                <div className="flex gap-4" style={{ textAlign: 'left' }}>
                                    <div style={{
                                        padding: 'var(--spacing-2) var(--spacing-4)',
                                        border: '2px solid var(--primary-500)',
                                        borderRadius: 'var(--radius-lg)',
                                        background: 'var(--primary-50)'
                                    }}>
                                        <span style={{ color: 'var(--primary-700)', fontSize: 'var(--font-size-sm)', fontWeight: '700' }}>إجمالي الكمية: </span>
                                        <span style={{ color: 'var(--primary-700)', fontSize: 'var(--font-size-base)', fontWeight: 'bold', marginRight: 'var(--spacing-2)' }}>
                                            {(() => {
                                                const totalTons = jobs.filter(j => j.silo_name !== 'سلف').reduce((acc, curr) => acc + (parseFloat(curr.quantity) || 0), 0);
                                                return new Intl.NumberFormat('en-US', {
                                                    minimumFractionDigits: 0,
                                                    maximumFractionDigits: 3
                                                }).format(totalTons) + ' طن';
                                            })()}
                                        </span>
                                    </div>
                                    <div style={{
                                        padding: 'var(--spacing-2) var(--spacing-4)',
                                        border: '2px solid var(--gray-200)',
                                        borderRadius: 'var(--radius-lg)',
                                        background: 'var(--gray-50)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--spacing-3)'
                                    }}>
                                        <div>
                                            <span style={{ color: 'var(--gray-600)', fontSize: 'var(--font-size-sm)', fontWeight: '700' }}>إجمالي السلف: </span>
                                            <span style={{ color: 'var(--error-600)', fontSize: 'var(--font-size-base)', fontWeight: 'bold', marginRight: 'var(--spacing-2)' }}>
                                                {formatNumber(jobs.reduce((acc, curr) => acc + (parseFloat(curr.advance_payment) || 0), 0))} د.ع
                                            </span>
                                        </div>
                                        <button
                                            className="btn btn-icon btn-secondary"
                                            style={{ width: '30px', height: '30px', padding: 0 }}
                                            onClick={() => setShowAdvancesListModal(true)}
                                            title="عرض السلف التفصيلية"
                                        >
                                            <Eye size={16} />
                                        </button>
                                    </div>
                                    <div style={{
                                        padding: 'var(--spacing-2) var(--spacing-4)',
                                        border: '2px solid var(--primary-100)',
                                        borderRadius: 'var(--radius-lg)',
                                        background: 'var(--primary-50)'
                                    }}>
                                        <span style={{ color: 'var(--primary-700)', fontSize: 'var(--font-size-sm)', fontWeight: '700' }}>المبلغ الإجمالي: </span>
                                        <span style={{ color: 'var(--primary-700)', fontSize: 'var(--font-size-base)', fontWeight: 'bold', marginRight: 'var(--spacing-2)' }}>
                                            {formatNumber(jobs.reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0))} د.ع
                                        </span>
                                    </div>
                                    {(() => {
                                        const totalEarnings = jobs.reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0);
                                        const totalAdvances = jobs.reduce((acc, curr) => acc + (parseFloat(curr.advance_payment) || 0), 0);
                                        const netBalance = totalEarnings - totalAdvances;
                                        const isNegative = netBalance < 0;

                                        return (
                                            <div style={{
                                                padding: 'var(--spacing-2) var(--spacing-4)',
                                                border: `2px solid ${isNegative ? 'var(--error-500)' : 'var(--success-500)'}`,
                                                borderRadius: 'var(--radius-lg)',
                                                background: isNegative ? 'var(--error-50)' : 'var(--success-50)'
                                            }}>
                                                <span style={{ color: isNegative ? 'var(--error-700)' : 'var(--success-700)', fontSize: 'var(--font-size-sm)', fontWeight: '700' }}>صافي المستحقات: </span>
                                                <span style={{ color: isNegative ? 'var(--error-700)' : 'var(--success-700)', fontSize: 'var(--font-size-base)', fontWeight: 'bold', marginRight: 'var(--spacing-2)' }}>
                                                    {formatNumber(netBalance)} د.ع
                                                </span>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="flex flex-wrap items-center gap-4 py-3 px-4 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-gray-500">فلترة بالسائق:</span>
                                    <select
                                        className="form-input py-1 px-3 text-sm h-auto w-48"
                                        value={filters.driver_name}
                                        onChange={(e) => setFilters({ ...filters, driver_name: e.target.value })}
                                    >
                                        <option value="">كل السواق</option>
                                        {suggestions.drivers.map((name, i) => (
                                            <option key={i} value={name}>{name}</option>
                                        ))}
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
                                {(filters.driver_name || filters.date_from || filters.date_to) && (
                                    <button
                                        className="btn btn-secondary py-1.5 px-3 text-sm h-auto flex items-center gap-1"
                                        onClick={() => setFilters({ driver_name: '', date_from: '', date_to: '' })}
                                    >
                                        <XCircle size={14} />
                                        مسح الفلتر
                                    </button>
                                )}
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                <thead>
                                    <tr style={{ background: 'var(--gray-50)', borderBottom: '2px solid var(--gray-100)' }}>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-8)', color: 'var(--gray-600)', fontWeight: '700' }}>التسلسل</th>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-8)', color: 'var(--gray-600)', fontWeight: '700' }}>التاريخ</th>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-8)', color: 'var(--gray-600)', fontWeight: '700' }}>اسم السائق</th>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-8)', color: 'var(--gray-600)', fontWeight: '700' }}>اسم السايلو</th>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-8)', color: 'var(--gray-600)', fontWeight: '700' }}>رقم القائمة</th>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-8)', color: 'var(--gray-600)', fontWeight: '700' }}>الكمية (طن)</th>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-8)', color: 'var(--gray-600)', fontWeight: '700' }}>سعر النقل</th>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-8)', color: 'var(--gray-600)', fontWeight: '700' }}>المبلغ</th>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-8)', color: 'var(--gray-600)', fontWeight: '700' }}>السلف</th>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-8)', color: 'var(--gray-600)', fontWeight: '700', textAlign: 'center' }}>إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="10" style={{ padding: 'var(--spacing-12)', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div><p className="mt-4">جاري التحميل...</p></td></tr>
                                    ) : jobs.filter(j => j.silo_name !== 'سلف').length === 0 ? (
                                        <tr><td colSpan="10" style={{ padding: 'var(--spacing-12)', textAlign: 'center' }}><FolderOpen size={48} className="text-gray-300 mb-4 mx-auto" /><p style={{ color: 'var(--gray-500)' }}>لا يوجد سجلات نقل</p></td></tr>
                                    ) : (
                                        jobs.filter(j => j.silo_name !== 'سلف').map((job, index) => (
                                            <tr key={job.id} style={{ borderBottom: '1px solid var(--gray-100)', background: editingId === job.id ? 'var(--primary-50)' : 'transparent' }}>
                                                <td style={{ padding: 'var(--spacing-4) var(--spacing-8)', color: 'var(--gray-500)', fontSize: '0.85rem' }}>#{index + 1}</td>
                                                <td style={{ padding: 'var(--spacing-4) var(--spacing-8)' }}>{formatDate(job.date)}</td>
                                                <td style={{ padding: 'var(--spacing-4) var(--spacing-8)', fontWeight: '700' }}>{job.driver_name}</td>
                                                <td style={{ padding: 'var(--spacing-4) var(--spacing-8)' }}>{job.silo_name}</td>
                                                <td style={{ padding: 'var(--spacing-4) var(--spacing-8)', color: 'var(--gray-600)' }}>{job.invoice_number || '-'}</td>
                                                <td style={{ padding: 'var(--spacing-4) var(--spacing-8)', fontWeight: '600' }}>{formatNumber(job.quantity)}</td>
                                                <td style={{ padding: 'var(--spacing-4) var(--spacing-8)' }}>{formatNumber(job.transport_price_per_ton)}</td>
                                                <td style={{ padding: 'var(--spacing-4) var(--spacing-8)', fontWeight: 'bold', color: 'var(--primary-700)' }}>{formatNumber(job.total_amount)}</td>
                                                <td style={{ padding: 'var(--spacing-4) var(--spacing-8)', color: 'var(--error-600)' }}>{formatNumber(job.advance_payment)}</td>
                                                <td style={{ padding: 'var(--spacing-4) var(--spacing-8)', textAlign: 'center' }}>
                                                    <div className="flex justify-center gap-2">
                                                        <button onClick={() => handleEdit(job)} className="btn btn-icon text-primary-500" title="تعديل"><Pencil size={18} /></button>
                                                        <button onClick={() => handleDelete(job.id)} className="btn btn-icon text-error-500" title="حذف"><Trash2 size={18} /></button>
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

            {/* Advance Payment Modal */}
            {showAdvanceModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: 'var(--spacing-4)'
                }} onClick={() => setShowAdvanceModal(false)}>
                    <div className="card" style={{
                        maxWidth: '500px',
                        width: '100%',
                        margin: 0
                    }} onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 style={{ margin: 0 }}>إضافة سلف للسائق</h3>
                            <button onClick={() => setShowAdvanceModal(false)} className="btn btn-icon btn-secondary">
                                <XCircle size={20} />
                            </button>
                        </div>

                        {error && (
                            <div className="alert alert-error mb-6">
                                <AlertCircle size={20} />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleAdvanceSubmit}>
                            <div className="form-group mb-4">
                                <label className="form-label" htmlFor="advance_driver_name">اسم السائق *</label>
                                <input
                                    id="advance_driver_name"
                                    type="text"
                                    className="form-input"
                                    list="advance-driver-names"
                                    value={advanceForm.driver_name}
                                    onChange={(e) => setAdvanceForm({ ...advanceForm, driver_name: e.target.value })}
                                    placeholder="بحث أو كتابة اسم السائق..."
                                    required
                                    autoFocus
                                />
                                <datalist id="advance-driver-names">
                                    {suggestions.drivers.map((name, i) => <option key={i} value={name} />)}
                                </datalist>
                            </div>

                            <div className="form-group mb-4">
                                <label className="form-label" htmlFor="advance_amount">مبلغ السلف *</label>
                                <input
                                    id="advance_amount"
                                    type="text"
                                    className="form-input text-left"
                                    value={formatNumber(advanceForm.amount)}
                                    onChange={(e) => {
                                        let value = e.target.value
                                        value = cleanNumber(value).replace(/[^0-9.]/g, '')
                                        if ((value.match(/\./g) || []).length > 1) return
                                        setAdvanceForm({ ...advanceForm, amount: value })
                                    }}
                                    placeholder="0"
                                    required
                                />
                            </div>

                            <div className="form-group mb-4">
                                <label className="form-label" htmlFor="advance_date">التاريخ</label>
                                <input
                                    id="advance_date"
                                    type="date"
                                    className="form-date"
                                    value={advanceForm.date}
                                    onChange={(e) => setAdvanceForm({ ...advanceForm, date: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group mb-6">
                                <label className="form-label" htmlFor="advance_notes">ملاحظات (اختياري)</label>
                                <textarea
                                    id="advance_notes"
                                    className="form-input"
                                    rows="3"
                                    value={advanceForm.notes}
                                    onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })}
                                    placeholder="أي ملاحظات إضافية..."
                                />
                            </div>

                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setShowAdvanceModal(false)} className="btn btn-secondary">
                                    إلغاء
                                </button>
                                <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={submitLoading}>
                                    {submitLoading ? (
                                        <><div className="spinner-sm"></div> جارٍ الحفظ...</>
                                    ) : (
                                        <><CheckCircle2 size={20} /> حفظ السلف</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Driver Management Modal */}
            {showDriverManagementModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: 'var(--spacing-4)'
                }} onClick={() => setShowDriverManagementModal(false)}>
                    <div className="card" style={{
                        maxWidth: '800px',
                        width: '100%',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        margin: 0
                    }} onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 style={{ margin: 0 }}>إدارة تصنيفات السواق</h3>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray-500)', margin: '4px 0 0 0' }}>
                                    حدد مكان ظهور كل سائق في النظام
                                </p>
                            </div>
                            <button onClick={() => setShowDriverManagementModal(false)} className="btn btn-icon btn-secondary">
                                <XCircle size={20} />
                            </button>
                        </div>

                        <div className="flex justify-between items-center mb-4 pb-4 border-b">
                            <button className="btn btn-secondary py-1.5 text-sm" onClick={syncDrivers} disabled={managementLoading}>
                                {managementLoading ? 'جاري المزامنة...' : 'مزامنة من السجلات السابقة'}
                            </button>
                            <div className="text-sm text-gray-500">
                                إجمالي السواق المكتشفين: {allDrivers.length}
                            </div>
                        </div>

                        <div style={{ overflowY: 'auto', flex: 1, minHeight: '300px' }}>
                            {managementLoading && allDrivers.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>
                                    <div className="spinner" style={{ margin: '0 auto' }}></div>
                                </div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                    <thead>
                                        <tr style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1, borderBottom: '2px solid var(--gray-100)' }}>
                                            <th style={{ padding: 'var(--spacing-3) var(--spacing-4)' }}>اسم السائق</th>
                                            <th style={{ padding: 'var(--spacing-3) var(--spacing-4)', textAlign: 'center' }}>مكان الظهور (التصنيف)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allDrivers.map((driver) => (
                                            <tr key={driver.id} style={{ borderBottom: '1px solid var(--gray-50)' }}>
                                                <td style={{ padding: 'var(--spacing-3) var(--spacing-4)', fontWeight: 'bold' }}>{driver.name}</td>
                                                <td style={{ padding: 'var(--spacing-3) var(--spacing-4)', textAlign: 'center' }}>
                                                    <div className="flex justify-center gap-2">
                                                        <button
                                                            className={`btn py-1 px-3 text-xs ${driver.category === 'mill' ? 'btn-primary' : 'btn-secondary'}`}
                                                            onClick={() => updateDriverCategory(driver.id, 'mill')}
                                                        >
                                                            السواق فقط
                                                        </button>
                                                        <button
                                                            className={`btn py-1 px-3 text-xs ${driver.category === 'sales' ? 'btn-primary' : 'btn-secondary'}`}
                                                            onClick={() => updateDriverCategory(driver.id, 'sales')}
                                                        >
                                                            المبيعات فقط
                                                        </button>
                                                        <button
                                                            className={`btn py-1 px-3 text-xs ${driver.category === 'both' ? 'btn-primary' : 'btn-secondary'}`}
                                                            onClick={() => updateDriverCategory(driver.id, 'both')}
                                                        >
                                                            الاثنين معاً
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button className="btn btn-primary" onClick={() => setShowDriverManagementModal(false)}>
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Advance Payments List Modal */}
            {showAdvancesListModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    padding: 'var(--spacing-4)'
                }} onClick={() => setShowAdvancesListModal(false)}>
                    <div className="card" style={{
                        maxWidth: '900px', width: '100%', maxHeight: '90vh',
                        display: 'flex', flexDirection: 'column', margin: 0
                    }} onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 style={{ margin: 0 }}>سجل السلف التفصيلي</h3>
                            <button onClick={() => setShowAdvancesListModal(false)} className="btn btn-icon btn-secondary">
                                <XCircle size={20} />
                            </button>
                        </div>

                        <div style={{ overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                <thead>
                                    <tr style={{ background: 'var(--gray-50)', borderBottom: '2px solid var(--gray-100)' }}>
                                        <th style={{ padding: 'var(--spacing-3) var(--spacing-4)', color: 'var(--gray-700)', fontWeight: '700' }}>التاريخ</th>
                                        <th style={{ padding: 'var(--spacing-3) var(--spacing-4)', color: 'var(--gray-700)', fontWeight: '700' }}>اسم السائق</th>
                                        <th style={{ padding: 'var(--spacing-3) var(--spacing-4)', color: 'var(--gray-700)', fontWeight: '700' }}>المبلغ</th>
                                        <th style={{ padding: 'var(--spacing-3) var(--spacing-4)', color: 'var(--gray-700)', fontWeight: '700' }}>البيان/الملاحظات</th>
                                        <th style={{ padding: 'var(--spacing-3) var(--spacing-4)', color: 'var(--gray-700)', fontWeight: '700', textAlign: 'center' }}>إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {jobs.filter(j => parseFloat(j.advance_payment) > 0).length === 0 ? (
                                        <tr><td colSpan="5" style={{ padding: 'var(--spacing-8)', textAlign: 'center', color: 'var(--gray-500)' }}>لا يوجد سلف مسجلة</td></tr>
                                    ) : (
                                        jobs.filter(j => parseFloat(j.advance_payment) > 0).map((job) => (
                                            <tr key={job.id} style={{ borderBottom: '1px solid var(--gray-50)' }}>
                                                <td style={{ padding: 'var(--spacing-3) var(--spacing-4)' }}>{formatDate(job.date)}</td>
                                                <td style={{ padding: 'var(--spacing-3) var(--spacing-4)', fontWeight: 'bold' }}>{job.driver_name}</td>
                                                <td style={{ padding: 'var(--spacing-3) var(--spacing-4)', color: 'var(--error-600)', fontWeight: 'bold' }}>{formatNumber(job.advance_payment)}</td>
                                                <td style={{ padding: 'var(--spacing-3) var(--spacing-4)', fontSize: '0.85rem' }}>{job.silo_name === 'سلف' ? (job.invoice_number || '-') : `سلفة مع نقلية (${job.silo_name})`}</td>
                                                <td style={{ padding: 'var(--spacing-3) var(--spacing-4)', textAlign: 'center' }}>
                                                    <div className="flex justify-center gap-2">
                                                        <button onClick={() => { handleEdit(job); setShowAdvancesListModal(false); }} className="btn btn-icon text-primary-500" title="تعديل"><Pencil size={16} /></button>
                                                        <button onClick={() => handleDelete(job.id)} className="btn btn-icon text-error-500" title="حذف"><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button className="btn btn-primary" onClick={() => setShowAdvancesListModal(false)}>إغلاق</button>
                        </div>
                    </div>
                </div>
            )}




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

export default DriversPage
