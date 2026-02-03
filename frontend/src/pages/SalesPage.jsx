import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../contexts/SessionContext'
import api from '../api/axios'
import {
    ArrowRight,
    Banknote,
    AlertCircle,
    FolderOpen,
    Pencil,
    Trash2,
    PlusCircle,
    CheckCircle2,
    XCircle,
    Printer,
    FileText
} from 'lucide-react'
import { formatDate } from '../utils/dateUtils'

function SalesPage() {
    const navigate = useNavigate()
    const { currentSession } = useSession()

    const [sales, setSales] = useState([])
    const [loading, setLoading] = useState(false)
    const [submitLoading, setSubmitLoading] = useState(false)
    const [error, setError] = useState('')
    const [editingId, setEditingId] = useState(null)
    const [suggestions, setSuggestions] = useState({ buyers: [], drivers: [] })
    const [filters, setFilters] = useState({
        buyer_name: '',
        date_from: '',
        date_to: ''
    })

    // Form state
    const [formData, setFormData] = useState({
        buyer_name: '',
        driver_name: '',
        item_type: 'flour',
        quantity_kilos: '',
        date: new Date().toISOString().split('T')[0],
        invoice_number: '',
        price_per_ton: '',
        total_amount: '0',
        payment_type: 'cash',
        amount_paid: ''
    })

    useEffect(() => {
        if (!currentSession) {
            navigate('/sessions')
            return
        }
        fetchSales()
        fetchSuggestions()
    }, [currentSession, filters.buyer_name, filters.date_from, filters.date_to])

    // Recalculate total amount when quantity or price per ton changes
    useEffect(() => {
        const qty = parseFloat(formData.quantity_kilos) || 0
        const price = parseFloat(formData.price_per_ton) || 0
        const total = qty * price
        setFormData(prev => ({
            ...prev,
            total_amount: total.toString(),
            // Default amount_paid based on payment_type (only if not editing or if payment type changed)
            amount_paid: prev.payment_type === 'cash' ? total.toString() : (prev.payment_type === 'debt' ? '0' : prev.amount_paid)
        }))
    }, [formData.quantity_kilos, formData.price_per_ton, formData.payment_type])

    const fetchSuggestions = async () => {
        try {
            const response = await api.get('/sessions/sales/suggestions/?for=sales')
            setSuggestions(response.data)
        } catch (err) {
            console.error('Error fetching suggestions:', err)
        }
    }

    const fetchSales = async () => {
        setLoading(true)
        try {
            let url = `/sessions/sales/?session_id=${currentSession.id}`
            if (filters.buyer_name) url += `&buyer_name=${filters.buyer_name}`
            if (filters.date_from) url += `&date_from=${filters.date_from}`
            if (filters.date_to) url += `&date_to=${filters.date_to}`

            const response = await api.get(url)
            const processedSales = response.data.map(sale => {
                let displayQty = 0
                if (sale.item_type === 'flour') {
                    displayQty = parseFloat(sale.quantity_kilos) / 50
                } else {
                    displayQty = parseFloat(sale.quantity_kilos) / 1000
                }
                return {
                    ...sale,
                    display_quantity: displayQty
                }
            })
            setSales(processedSales)
        } catch (err) {
            console.error('Error fetching sales:', err)
            setError('حدث خطأ في تحميل البيانات')
        } finally {
            setLoading(false)
        }
    }

    // Formatting utility: add commas to numbers
    const formatNumber = (num) => {
        if (num === undefined || num === null || num === '') return ''
        const val = parseFloat(num)
        if (isNaN(val)) return num.toString()
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3
        }).format(val)
    }

    // Clean formatting: remove commas
    const cleanNumber = (str) => {
        return str.toString().replace(/,/g, '')
    }

    const handleInputChange = (e, field) => {
        let value = e.target.value
        if (['quantity_kilos', 'price_per_ton', 'amount_paid'].includes(field)) {
            value = cleanNumber(value).replace(/[^0-9.]/g, '')
            if ((value.match(/\./g) || []).length > 1) return
        }
        setFormData({ ...formData, [field]: value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        // Minimal validation
        if (!formData.buyer_name || !formData.quantity_kilos || !formData.invoice_number || !formData.price_per_ton) {
            setError('يرجى ملء الحقول المطلوبة (اسم المشتري، الكمية، رقم الفاتورة، السعر)')
            return
        }

        setSubmitLoading(true)
        setError('')
        try {
            const isFlour = formData.item_type === 'flour'
            const qty = parseFloat(formData.quantity_kilos)
            const price = parseFloat(formData.price_per_ton)

            // Backend expectation: quantity_kilos, price_per_ton
            const payload = {
                ...formData,
                session: currentSession.id,
                quantity_kilos: isFlour ? qty * 50 : qty * 1000,
                price_per_ton: isFlour ? (price / 50) * 1000 : price,
                total_amount: parseFloat(formData.total_amount),
                amount_paid: parseFloat(formData.amount_paid)
            }

            if (editingId) {
                const response = await api.put(`/sessions/sales/${editingId}/`, payload)
                const sale = response.data
                const processedSale = {
                    ...sale,
                    display_quantity: sale.item_type === 'flour' ? parseFloat(sale.quantity_kilos) / 50 : parseFloat(sale.quantity_kilos) / 1000
                }
                setSales(sales.map(s => s.id === editingId ? processedSale : s))
                setEditingId(null)
            } else {
                const response = await api.post('/sessions/sales/', payload)
                const sale = response.data
                const processedSale = {
                    ...sale,
                    display_quantity: sale.item_type === 'flour' ? parseFloat(sale.quantity_kilos) / 50 : parseFloat(sale.quantity_kilos) / 1000
                }
                setSales([processedSale, ...sales])
            }

            setFormData({
                buyer_name: '',
                driver_name: '',
                item_type: 'flour',
                quantity_kilos: '',
                date: new Date().toISOString().split('T')[0],
                invoice_number: '',
                price_per_ton: '',
                total_amount: '0',
                payment_type: 'cash',
                amount_paid: ''
            })

            // Refresh global names
            fetchSuggestions()
        } catch (err) {
            console.error('Error saving sale:', err)
            setError(err.response?.data?.error || 'حدث خطأ في حفظ البيانات')
        } finally {
            setSubmitLoading(false)
        }
    }

    const handleEdit = (sale) => {
        setEditingId(sale.id)
        const isFlour = sale.item_type === 'flour'
        setFormData({
            buyer_name: sale.buyer_name,
            driver_name: sale.driver_name,
            item_type: sale.item_type || '',
            quantity_kilos: isFlour ? (parseFloat(sale.quantity_kilos) / 50).toString() : (parseFloat(sale.quantity_kilos) / 1000).toString(),
            date: sale.date,
            invoice_number: sale.invoice_number,
            price_per_ton: isFlour ? (parseFloat(sale.total_amount) / (parseFloat(sale.quantity_kilos) / 50)).toString() : sale.price_per_ton.toString(),
            total_amount: sale.total_amount.toString(),
            payment_type: sale.payment_type,
            amount_paid: sale.amount_paid.toString()
        })

        // Refresh names
        fetchSuggestions()
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleCancelEdit = () => {
        setEditingId(null)
        setFormData({
            buyer_name: '',
            driver_name: '',
            item_type: 'flour',
            quantity_kilos: '',
            date: new Date().toISOString().split('T')[0],
            invoice_number: '',
            price_per_ton: '',
            total_amount: '0',
            payment_type: 'cash',
            amount_paid: ''
        })
    }

    const handleDelete = async (id) => {
        if (editingId === id) {
            setError('لا يمكن حذف البيع أثناء التعديل')
            return
        }
        if (!window.confirm('هل أنت متأكد من حذف هذا البيع؟')) return

        try {
            await api.delete(`/sessions/sales/${id}/`)
            setSales(sales.filter(s => s.id !== id))
        } catch (err) {
            setError('حدث خطأ في الحذف')
        }
    }

    const handlePrint = () => {
        // Build URL with current filters
        const params = new URLSearchParams({
            session: currentSession.id
        })

        if (filters.buyer_name) params.append('buyer_name', filters.buyer_name)
        if (filters.date_from) params.append('date_from', filters.date_from)
        if (filters.date_to) params.append('date_to', filters.date_to)

        const url = `http://localhost:8000/api/sessions/print/sales/?${params.toString()}`
        window.open(url, '_blank')
    }

    const handlePrintForm = () => {
        if (!formData.buyer_name || !formData.quantity_kilos || !formData.price_per_ton) {
            setError('يرجى ملء الحقول المطلوبة قبل الطباعة')
            return
        }

        const itemTypeLabels = {
            'flour': 'طحين',
            'bran': 'نخالة',
            'impurities': 'شوائب',
            'wheat': 'حنطة',
            'broken_wheat': 'كسر حنطة'
        }

        const paymentLabels = {
            'cash': 'نقدي',
            'debt': 'دين',
            'partial': 'جزئي'
        }

        const printWindow = window.open('', '_blank')
        printWindow.document.write(`
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <title>فاتورة بيع - ${formData.invoice_number || 'بدون رقم'}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Segoe UI', Tahoma, sans-serif; 
                        padding: 20px; 
                        max-width: 400px; 
                        margin: 0 auto;
                        direction: rtl;
                    }
                    .header { text-align: center; border-bottom: 2px dashed #333; padding-bottom: 15px; margin-bottom: 15px; }
                    .header h1 { font-size: 24px; margin-bottom: 5px; }
                    .header p { color: #666; font-size: 14px; }
                    .invoice-number { background: #f5f5f5; padding: 8px; text-align: center; font-weight: bold; font-size: 18px; margin-bottom: 15px; border-radius: 5px; }
                    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                    .row:last-child { border-bottom: none; }
                    .label { color: #666; font-size: 14px; }
                    .value { font-weight: bold; font-size: 14px; }
                    .total-section { background: #f0f8ff; padding: 15px; margin-top: 15px; border-radius: 8px; }
                    .total-row { display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; color: #0066cc; }
                    .footer { text-align: center; margin-top: 20px; padding-top: 15px; border-top: 2px dashed #333; color: #666; font-size: 12px; }
                    @media print { 
                        body { padding: 10px; } 
                        @page { margin: 0.5cm; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>فاتورة بيع</h1>
                    <p>${currentSession?.quota_label || ''} - ${currentSession?.session_type_display || ''}</p>
                </div>
                
                <div class="invoice-number">
                    رقم الفاتورة: ${formData.invoice_number || '-'}
                </div>

                <div class="details">
                    <div class="row">
                        <span class="label">التاريخ:</span>
                        <span class="value">${formData.date}</span>
                    </div>
                    <div class="row">
                        <span class="label">اسم المشتري:</span>
                        <span class="value">${formData.buyer_name}</span>
                    </div>
                    <div class="row">
                        <span class="label">اسم السائق:</span>
                        <span class="value">${formData.driver_name || '-'}</span>
                    </div>
                    <div class="row">
                        <span class="label">نوع المادة:</span>
                        <span class="value">${itemTypeLabels[formData.item_type] || formData.item_type}</span>
                    </div>
                    <div class="row">
                        <span class="label">الكمية:</span>
                        <span class="value">${formatNumber(formData.quantity_kilos)} ${formData.item_type === 'flour' ? 'كيس' : 'طن'}</span>
                    </div>
                    <div class="row">
                        <span class="label">السعر:</span>
                        <span class="value">${formatNumber(formData.price_per_ton)} د.ع/${formData.item_type === 'flour' ? 'كيس' : 'طن'}</span>
                    </div>
                    <div class="row">
                        <span class="label">نوع الدفع:</span>
                        <span class="value">${paymentLabels[formData.payment_type] || formData.payment_type}</span>
                    </div>
                    <div class="row">
                        <span class="label">المبلغ المدفوع:</span>
                        <span class="value">${formatNumber(formData.amount_paid)} د.ع</span>
                    </div>
                </div>

                <div class="total-section">
                    <div class="total-row">
                        <span>المبلغ الكلي:</span>
                        <span>${formatNumber(formData.total_amount)} د.ع</span>
                    </div>
                </div>

                <div class="footer">
                    <p>شكراً لتعاملكم معنا</p>
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
                            <Banknote size={24} />
                        </div>
                        <div>
                            <h4 style={{ margin: 0 }}>المبيعات</h4>
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
                    <div className={`card mb-8 no-print ${editingId ? 'ring-2 ring-primary-500 ring-offset-2' : ''}`}>
                        <h3 className="mb-6">{editingId ? 'تعديل البيع' : 'إضافة بيع جديد'}</h3>

                        {error && (
                            <div className="alert alert-error mb-4">
                                <AlertCircle size={20} />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="selection-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-6)' }}>
                                <div className="form-group mb-0">
                                    <label className="form-label">اسم المشتري</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.buyer_name}
                                        onChange={(e) => handleInputChange(e, 'buyer_name')}
                                        list={formData.buyer_name.length > 0 ? "buyer-suggestions" : ""}
                                    />
                                    <datalist id="buyer-suggestions">
                                        {suggestions.buyers.map((name, i) => (
                                            <option key={i} value={name} />
                                        ))}
                                    </datalist>
                                </div>
                                <div className="form-group mb-0">
                                    <label className="form-label">اسم السائق</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.driver_name}
                                        onChange={(e) => handleInputChange(e, 'driver_name')}
                                        list={formData.driver_name.length > 0 ? "driver-suggestions" : ""}
                                        autoComplete="off"
                                    />
                                    <datalist id="driver-suggestions">
                                        {suggestions.drivers.map((name, i) => (
                                            <option key={i} value={name} />
                                        ))}
                                    </datalist>
                                </div>
                                <div className="form-group mb-0">
                                    <label className="form-label">نوع المادة</label>
                                    <select
                                        className="form-input"
                                        value={formData.item_type}
                                        onChange={(e) => handleInputChange(e, 'item_type')}
                                    >
                                        <option value="flour">طحين</option>
                                        <option value="bran">نخالة</option>
                                        <option value="impurities">شوائب</option>
                                        <option value="wheat">حنطة</option>
                                        <option value="broken_wheat">كسر حنطة</option>
                                    </select>
                                </div>
                                <div className="form-group mb-0">
                                    <label className="form-label">{formData.item_type === 'flour' ? 'الكمية (بالكيس)' : 'الكمية (بالطن)'}</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="0"
                                        value={formatNumber(formData.quantity_kilos)}
                                        onChange={(e) => handleInputChange(e, 'quantity_kilos')}
                                    />
                                </div>
                                <div className="form-group mb-0">
                                    <label className="form-label">التاريخ</label>
                                    <input
                                        type="date"
                                        className="form-date"
                                        value={formData.date}
                                        onChange={(e) => handleInputChange(e, 'date')}
                                    />
                                </div>
                                <div className="form-group mb-0">
                                    <label className="form-label">رقم الفاتورة</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.invoice_number}
                                        onChange={(e) => handleInputChange(e, 'invoice_number')}
                                    />
                                </div>
                                <div className="form-group mb-0">
                                    <label className="form-label">{formData.item_type === 'flour' ? 'سعر الكيس (د.ع)' : 'سعر الطن (د.ع)'}</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="0"
                                        value={formatNumber(formData.price_per_ton)}
                                        onChange={(e) => handleInputChange(e, 'price_per_ton')}
                                    />
                                </div>
                                <div className="form-group mb-0">
                                    <label className="form-label">المبلغ الكلي</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        disabled
                                        style={{ background: 'var(--gray-50)', color: 'var(--primary-700)', fontWeight: 'bold' }}
                                        value={formatNumber(formData.total_amount)}
                                    />
                                </div>
                                <div className="form-group mb-0">
                                    <label className="form-label">نوع الدفع</label>
                                    <select
                                        className="form-input"
                                        value={formData.payment_type}
                                        onChange={(e) => handleInputChange(e, 'payment_type')}
                                    >
                                        <option value="cash">نقدي</option>
                                        <option value="debt">دين</option>
                                        <option value="partial">جزئي</option>
                                    </select>
                                </div>
                                <div className="form-group mb-0">
                                    <label className="form-label">المبلغ المدفوع</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="0"
                                        value={formatNumber(formData.amount_paid)}
                                        onChange={(e) => handleInputChange(e, 'amount_paid')}
                                        disabled={formData.payment_type === 'debt'}
                                        style={formData.payment_type === 'debt' ? { background: 'var(--gray-50)', cursor: 'not-allowed' } : {}}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-lg flex items-center justify-center gap-2"
                                    style={{ minWidth: '140px' }}
                                    onClick={handlePrintForm}
                                >
                                    <FileText size={20} />
                                    طباعة الفاتورة
                                </button>
                                <button
                                    type="submit"
                                    className={`btn ${editingId ? 'btn-success' : 'btn-primary'} btn-lg flex items-center justify-center gap-2`}
                                    style={{ minWidth: '200px' }}
                                    disabled={submitLoading}
                                >
                                    {submitLoading ? (
                                        <div className="spinner spinner-sm"></div>
                                    ) : (
                                        editingId ? <CheckCircle2 size={20} /> : <PlusCircle size={20} />
                                    )}
                                    {submitLoading ? 'جاري الحفظ...' : (editingId ? 'تحديث البيع' : '+ تسجيل البيع')}
                                </button>
                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        className="btn btn-secondary btn-lg flex items-center justify-center gap-2"
                                        style={{ minWidth: '100px' }}
                                    >
                                        <XCircle size={20} />
                                        إلغاء
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* Material Summary Cards */}
                    <div className="selection-grid mb-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--spacing-4)' }}>
                        {/* Grand Total Card */}
                        <div className="card card-compact" style={{
                            borderRight: '4px solid var(--primary-700)',
                            background: 'linear-gradient(135deg, var(--primary-50) 0%, var(--white) 100%)',
                            boxShadow: 'var(--shadow-md)',
                            padding: 'var(--spacing-4)'
                        }}>
                            <h4 style={{ margin: '0 0 var(--spacing-2) 0', color: 'var(--primary-800)', fontSize: '1rem', fontWeight: 'bold' }}>المجموع الكلي</h4>
                            <div className="flex flex-col gap-1">
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray-600)' }}>
                                    إجمالي الكمية: <span style={{ color: 'var(--primary-700)', fontWeight: 'bold' }}>
                                        {formatNumber(sales.reduce((acc, curr) => acc + (parseFloat(curr.quantity_kilos) / 1000), 0))} طن
                                    </span>
                                </div>
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray-600)' }}>
                                    إجمالي المبلغ: <span style={{ color: 'var(--success-600)', fontWeight: 'bold' }}>{formatNumber(sales.reduce((acc, curr) => acc + parseFloat(curr.total_amount), 0))} د.ع</span>
                                </div>
                            </div>
                        </div>

                        {[
                            { key: 'flour', label: 'طحين', unit: 'كيس' },
                            { key: 'bran', label: 'نخالة', unit: 'طن' },
                            { key: 'impurities', label: 'شوائب', unit: 'طن' },
                            { key: 'wheat', label: 'حنطة', unit: 'طن' },
                            { key: 'broken_wheat', label: 'كسر حنطة', unit: 'طن' }
                        ].map(item => {
                            const filtered = sales.filter(s => s.item_type === item.key)
                            // sum using display_quantity which we added in fetchSales
                            const sumQty = filtered.reduce((acc, curr) => acc + (curr.display_quantity || 0), 0)
                            const totalVal = filtered.reduce((acc, curr) => acc + parseFloat(curr.total_amount), 0)

                            if (sumQty === 0) return null;

                            return (
                                <div key={item.key} className="card card-compact" style={{
                                    border: '1px solid var(--primary-100)',
                                    background: 'var(--primary-50)',
                                    padding: 'var(--spacing-4)',
                                    borderRadius: 'var(--radius-lg)'
                                }}>
                                    <h4 style={{ margin: '0 0 var(--spacing-2) 0', color: 'var(--gray-800)', fontSize: '1rem' }}>{item.label}</h4>
                                    <div className="flex flex-col gap-1">
                                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray-500)' }}>
                                            الكمية: <span style={{ color: 'var(--primary-700)', fontWeight: 'bold' }}>{formatNumber(sumQty)} {item.unit}</span>
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray-500)' }}>
                                            المبلغ: <span style={{ color: 'var(--success-600)', fontWeight: 'bold' }}>{formatNumber(totalVal)} د.ع</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Excel-like Grid Card */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: 'var(--spacing-6) var(--spacing-8)', borderBottom: '1px solid var(--gray-100)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                            <div className="flex justify-between items-center w-full">
                                <h3 style={{ margin: 0 }}>سجل المبيعات</h3>
                                <div className="no-print" style={{
                                    padding: 'var(--spacing-2) var(--spacing-4)',
                                    border: '1px solid var(--primary-100)',
                                    borderRadius: 'var(--radius-lg)',
                                    background: 'var(--primary-50)',
                                    textAlign: 'left'
                                }}>
                                    <span style={{ color: 'var(--primary-700)', fontSize: 'var(--font-size-sm)', fontWeight: '700' }}>إجمالي المبيعات: </span>
                                    <span style={{ color: 'var(--primary-700)', fontSize: 'var(--font-size-base)', fontWeight: 'bold', marginRight: 'var(--spacing-2)' }}>
                                        {formatNumber(sales.reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0))} د.ع
                                    </span>
                                </div>
                            </div>

                            {/* Inline Filters */}
                            <div className="flex flex-wrap items-center gap-4 py-3 px-4 bg-gray-50 rounded-lg border border-gray-100 no-print">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-gray-500">تصفية بالمشتري:</span>
                                    <select
                                        className="form-input py-1 px-3 text-sm h-auto w-48"
                                        value={filters.buyer_name}
                                        onChange={(e) => setFilters({ ...filters, buyer_name: e.target.value })}
                                    >
                                        <option value="">كل المشترين</option>
                                        {suggestions.buyers.map((name, i) => <option key={i} value={name}>{name}</option>)}
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
                                {(filters.buyer_name || filters.date_from || filters.date_to) && (
                                    <button
                                        className="btn btn-secondary py-1.5 px-3 text-sm h-auto flex items-center gap-1"
                                        onClick={() => setFilters({ buyer_name: '', date_from: '', date_to: '' })}
                                    >
                                        <XCircle size={14} />
                                        مسح التصفية
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="table-container">
                            <table className="table-responsive" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                <thead>
                                    <tr style={{ background: 'var(--gray-50)', borderBottom: '2px solid var(--gray-100)' }}>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-3)', color: 'var(--gray-600)', fontWeight: '700' }}>رقم الفاتورة</th>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-3)', color: 'var(--gray-600)', fontWeight: '700' }}>المشتري</th>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-3)', color: 'var(--gray-600)', fontWeight: '700' }}>السائق</th>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-3)', color: 'var(--gray-600)', fontWeight: '700' }}>المادة</th>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-3)', color: 'var(--gray-600)', fontWeight: '700' }}>الكمية</th>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-3)', color: 'var(--gray-600)', fontWeight: '700' }}>الوحدة</th>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-3)', color: 'var(--gray-600)', fontWeight: '700' }}>السعر</th>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-3)', color: 'var(--gray-600)', fontWeight: '700' }}>الكلي</th>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-3)', color: 'var(--gray-600)', fontWeight: '700' }}>نوع الدفع</th>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-3)', color: 'var(--gray-600)', fontWeight: '700' }}>المدفوع</th>
                                        <th style={{ padding: 'var(--spacing-4) var(--spacing-3)', color: 'var(--gray-600)', fontWeight: '700' }}>التاريخ</th>
                                        <th className="no-print sticky-column" style={{ padding: 'var(--spacing-4) var(--spacing-3)', color: 'var(--gray-600)', fontWeight: '700', textAlign: 'center' }}>إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="12" style={{ padding: 'var(--spacing-12)', textAlign: 'center' }}>
                                                <div className="spinner" style={{ margin: '0 auto' }}></div>
                                                <p className="mt-4">جاري تحميل المبيعات...</p>
                                            </td>
                                        </tr>
                                    ) : sales.length === 0 ? (
                                        <tr>
                                            <td colSpan="12" style={{ padding: 'var(--spacing-12)', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--spacing-4)', color: 'var(--gray-300)' }}>
                                                    <FolderOpen size={48} />
                                                </div>
                                                <p style={{ color: 'var(--gray-500)' }}>لا يوجد مبيعات مسجلة لهذه الجلسة</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        sales.map((sale) => (
                                            <tr key={sale.id} className="animate-fadeIn" style={{
                                                borderBottom: '1px solid var(--gray-100)',
                                                background: editingId === sale.id ? 'var(--primary-50)' : 'transparent'
                                            }}>
                                                <td style={{ padding: 'var(--spacing-4) var(--spacing-3)', fontWeight: 'bold' }}>{sale.invoice_number}</td>
                                                <td style={{ padding: 'var(--spacing-4) var(--spacing-3)' }}>{sale.buyer_name}</td>
                                                <td style={{ padding: 'var(--spacing-4) var(--spacing-3)' }}>{sale.driver_name}</td>
                                                <td style={{ padding: 'var(--spacing-4) var(--spacing-3)' }}>{sale.item_type_display || '-'}</td>
                                                <td style={{ padding: 'var(--spacing-4) var(--spacing-3)' }}>{formatNumber(sale.display_quantity)}</td>
                                                <td style={{ padding: 'var(--spacing-4) var(--spacing-3)', color: 'var(--gray-500)', fontSize: '0.85rem' }}>{sale.item_type === 'flour' ? 'كيس' : 'طن'}</td>
                                                <td style={{ padding: 'var(--spacing-4) var(--spacing-3)' }}>{formatNumber(sale.item_type === 'flour' ? (parseFloat(sale.total_amount) / sale.display_quantity) : sale.price_per_ton)}</td>
                                                <td style={{ padding: 'var(--spacing-4) var(--spacing-3)', color: 'var(--primary-600)', fontWeight: 'bold' }}>{formatNumber(sale.total_amount)}</td>
                                                <td style={{ padding: 'var(--spacing-4) var(--spacing-3)' }}>
                                                    <span className={`badge ${sale.payment_type === 'cash' ? 'badge-success' : (sale.payment_type === 'debt' ? 'badge-danger' : 'badge-warning')}`} style={{ fontSize: '0.75rem' }}>
                                                        {sale.payment_type_display}
                                                    </span>
                                                </td>
                                                <td style={{ padding: 'var(--spacing-4) var(--spacing-3)', color: 'var(--success-600)' }}>{formatNumber(sale.amount_paid)}</td>
                                                <td style={{ padding: 'var(--spacing-4) var(--spacing-3)' }}>{formatDate(sale.date)}</td>
                                                <td className="no-print sticky-column" style={{ padding: 'var(--spacing-4) var(--spacing-3)', textAlign: 'center' }}>
                                                    <div className="flex justify-center gap-2">
                                                        <button
                                                            onClick={() => handleEdit(sale)}
                                                            className="btn btn-icon"
                                                            style={{ color: 'var(--primary-500)', background: 'transparent' }}
                                                            title="تعديل"
                                                        >
                                                            <Pencil size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(sale.id)}
                                                            className="btn btn-icon"
                                                            style={{ color: 'var(--error-500)', background: 'transparent' }}
                                                            title="حذف"
                                                            disabled={editingId === sale.id}
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                <tfoot className="print-summary">
                                    <tr>
                                        <td colSpan="7" style={{ padding: 'var(--spacing-4) var(--spacing-3)', fontWeight: 'bold', textAlign: 'right', borderTop: '2px solid var(--gray-300)' }}>
                                            المجموع الكلي:
                                        </td>
                                        <td style={{ padding: 'var(--spacing-4) var(--spacing-3)', fontWeight: 'bold', color: 'var(--primary-600)', borderTop: '2px solid var(--gray-300)' }}>
                                            {formatNumber(sales.reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0))}
                                        </td>
                                        <td></td>
                                        <td style={{ padding: 'var(--spacing-4) var(--spacing-3)', fontWeight: 'bold', color: 'var(--success-600)', borderTop: '2px solid var(--gray-300)' }}>
                                            {formatNumber(sales.reduce((acc, curr) => acc + (parseFloat(curr.amount_paid) || 0), 0))}
                                        </td>
                                        <td colSpan="2"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>


            </main>

            <style>{`
                .print-summary { display: none; }
                @media print {
                    * { margin: 0; padding: 0; }
                    body { margin: 0; padding: 20px; }
                    .no-print { display: none !important; }
                    .print-summary { display: table-footer-group !important; }
                    .dashboard-layout { background: white !important; padding: 0 !important; margin: 0 !important; }
                    .dashboard-header { display: none !important; }
                    .dashboard-content { padding: 0 !important; margin: 0 !important; }
                    .card { 
                        box-shadow: none !important; 
                        border: none !important; 
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: visible !important;
                    }
                    table { 
                        width: 100% !important; 
                        border-collapse: collapse !important;
                    }
                    thead { display: table-header-group; }
                    tfoot { display: table-footer-group; }
                    tr { page-break-inside: avoid; }
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

export default SalesPage
