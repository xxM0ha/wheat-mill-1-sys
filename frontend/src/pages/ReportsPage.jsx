import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../contexts/SessionContext'
import api from '../api/axios'
import {
    ArrowRight,
    BarChart3,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Package,
    Truck,
    Wallet,
    Download,
    Printer,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    PieChart,
    BookOpen,
    Users
} from 'lucide-react'

function ReportsPage() {
    const navigate = useNavigate()
    const { currentSession } = useSession()

    const [data, setData] = useState({
        sales: [],
        expenses: [],
        driverJobs: [],
        debts: [],
        loading: true,
        error: ''
    })

    useEffect(() => {
        if (!currentSession) {
            navigate('/dashboard')
            return
        }
        fetchAllData()
    }, [currentSession])

    const fetchAllData = async () => {
        try {
            const [salesRes, expensesRes, driversRes, debtsRes] = await Promise.all([
                api.get(`/sessions/sales/?session_id=${currentSession.id}`),
                api.get(`/sessions/expenses/?session_id=${currentSession.id}`),
                api.get(`/sessions/drivers/?session_id=${currentSession.id}`),
                api.get(`/sessions/debts/`)
            ])

            setData({
                sales: salesRes.data,
                expenses: expensesRes.data,
                driverJobs: driversRes.data,
                debts: debtsRes.data,
                loading: false,
                error: ''
            })
        } catch (err) {
            console.error('Error fetching report data:', err)
            setData(prev => ({ ...prev, loading: false, error: 'حدث خطأ في تحميل التقارير' }))
        }
    }

    const formatNumber = (num) => {
        if (!num) return '0'
        return new Intl.NumberFormat('en-US').format(parseFloat(num))
    }

    // Calculations
    const totalSales = data.sales.reduce((acc, s) => acc + parseFloat(s.total_amount || 0), 0)
    const totalExpenses = data.expenses.reduce((acc, e) => acc + parseFloat(e.amount || 0), 0)
    const totalDriverTransport = data.driverJobs.reduce((acc, j) => acc + parseFloat(j.total_amount || 0), 0)
    const totalDriverAdvances = data.driverJobs.reduce((acc, j) => acc + parseFloat(j.advance_payment || 0), 0)
    const totalOutstandingDebts = data.debts.reduce((acc, curr) => acc + (curr.entry_type === 'debt' ? parseFloat(curr.amount) : -parseFloat(curr.amount)), 0)

    const grossProfit = totalSales - totalExpenses - totalDriverTransport
    const netCashFlow = totalSales - totalExpenses - totalDriverAdvances

    const productStats = [
        { key: 'flour', label: 'طحين', color: 'var(--primary-500)', icon: Package },
        { key: 'bran', label: 'نخالة', color: 'var(--warning-500)', icon: Package },
        { key: 'impurities', label: 'شوائب', color: 'var(--gray-400)', icon: Package },
        { key: 'wheat', label: 'حنطة', color: 'var(--success-500)', icon: Package },
        { key: 'broken_wheat', label: 'كسر حنطة', color: 'var(--error-400)', icon: Package },
    ].map(p => {
        const filtered = data.sales.filter(s => s.item_type === p.key)
        const qty = filtered.reduce((acc, s) => acc + parseFloat(s.quantity_kilos || 0), 0)
        const val = filtered.reduce((acc, s) => acc + parseFloat(s.total_amount || 0), 0)
        return { ...p, qty, val }
    })

    const totalKilosSold = productStats.reduce((acc, p) => acc + p.qty, 0)
    const totalWheatReceived = data.driverJobs.reduce((acc, j) => acc + parseFloat(j.quantity || 0), 0)

    const handlePrint = () => {
        const url = `http://localhost:8000/api/sessions/print/session/${currentSession.id}/`
        window.open(url, '_blank')
    }


    if (data.loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="spinner"></div>
            </div>
        )
    }

    return (
        <div className="dashboard-layout report-print">
            <header className="dashboard-header no-print">
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
                            <BarChart3 size={24} />
                        </div>
                        <div>
                            <h4 style={{ margin: 0 }}>مركز التقارير التحليلية</h4>
                            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--gray-500)' }}>
                                {currentSession?.quota_label} - تقرير شامل للنشاط المالي والإنتاجي
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 no-print">
                        <button
                            className="btn btn-primary flex items-center gap-2"
                            onClick={async () => {
                                if (!window.confirm('هل تريد ترحيل الأرباح الحالية إلى حسابات الشركاء؟')) return
                                try {
                                    await api.post(`/sessions/${currentSession.id}/sync_profits/`)
                                    alert('تم ترحيل الأرباح بنجاح')
                                } catch (err) {
                                    alert('حدث خطأ أثناء الترحيل')
                                }
                            }}
                        >
                            <DollarSign size={18} />
                            ترحيل الأرباح للميزانية
                        </button>
                        <button className="btn btn-secondary flex items-center gap-2" onClick={handlePrint}>
                            <Printer size={18} />
                            طباعة التقرير
                        </button>
                    </div>
                </div>
            </header>

            <main className="dashboard-content">
                <div className="animate-fadeIn">

                    {/* Top Stats Row */}
                    <div className="selection-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--spacing-6)', marginBottom: 'var(--spacing-6)' }}>
                        <div className="card glass-card" style={{ borderRight: '4px solid var(--primary-500)' }}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 rounded-xl bg-primary-50 text-primary-600">
                                    <TrendingUp size={24} />
                                </div>
                                <span className="text-xs font-bold px-2 py-1 bg-primary-100 text-primary-700 rounded-full">إجمالي المبيعات</span>
                            </div>
                            <h2 style={{ margin: 0 }}>{formatNumber(totalSales)} <small style={{ fontSize: '0.9rem' }}>د.ع</small></h2>
                            <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                                <ArrowUpRight size={14} className="text-success-500" />
                                كلي المبالغ المستلمة والديون
                            </p>
                        </div>

                        <div className="card glass-card" style={{ borderLeft: '4px solid var(--error-500)' }}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 rounded-xl bg-error-50 text-error-600">
                                    <Wallet size={24} />
                                </div>
                                <span className="text-xs font-bold px-2 py-1 bg-error-100 text-error-700 rounded-full">المصاريف التشغيلية</span>
                            </div>
                            <h2 style={{ margin: 0 }}>{formatNumber(totalExpenses)} <small style={{ fontSize: '0.9rem' }}>د.ع</small></h2>
                            <p className="text-sm text-gray-500 mt-2">كافة المصاريف النثرية</p>
                        </div>

                        <div className="card glass-card" style={{ borderLeft: '4px solid #6366f1' }}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 rounded-xl bg-indigo-50" style={{ color: '#6366f1' }}>
                                    <Truck size={24} />
                                </div>
                                <span className="text-xs font-bold px-2 py-1 bg-indigo-100 rounded-full" style={{ color: '#4338ca' }}>أجور النقل الكلية</span>
                            </div>
                            <h2 style={{ margin: 0 }}>{formatNumber(totalDriverTransport)} <small style={{ fontSize: '0.9rem' }}>د.ع</small></h2>
                            <p className="text-sm text-gray-500 mt-2">مستحقات السواق الإجمالية</p>
                        </div>

                        <div className="card glass-card" style={{ borderBottom: '4px solid var(--success-500)' }}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 rounded-xl bg-success-50 text-success-600">
                                    <PieChart size={24} />
                                </div>
                                <span className="text-xs font-bold px-2 py-1 bg-success-100 text-success-700 rounded-full">صافي أرباح الجلسة</span>
                            </div>
                            <h2 style={{ margin: 0, color: 'var(--success-600)' }}>{formatNumber(grossProfit)} <small style={{ fontSize: '0.9rem' }}>د.ع</small></h2>
                            <p className="text-sm text-gray-500 mt-2">المبيعات - (المصاريف + النقل)</p>
                        </div>

                        <div className="card glass-card" style={{ borderBottom: '4px solid #f97316' }}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 rounded-xl bg-orange-50 text-orange-600">
                                    <Wallet size={24} />
                                </div>
                                <span className="text-xs font-bold px-2 py-1 bg-orange-100 text-orange-700 rounded-full">إجمالي السلف</span>
                            </div>
                            <h2 style={{ margin: 0, color: '#c2410c' }}>{formatNumber(totalDriverAdvances)} <small style={{ fontSize: '0.9rem' }}>د.ع</small></h2>
                            <p className="text-sm text-gray-500 mt-2">مبالغ مستقطعة من أجور النقل</p>
                        </div>

                        <div className="card glass-card" style={{ borderBottom: '4px solid var(--warning-500)' }}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 rounded-xl bg-warning-50 text-warning-600">
                                    <BookOpen size={24} />
                                </div>
                                <span className="text-xs font-bold px-2 py-1 bg-warning-100 text-warning-700 rounded-full">الديون المتبقية</span>
                            </div>
                            <h2 style={{ margin: 0, color: 'var(--warning-700)' }}>{formatNumber(totalOutstandingDebts)} <small style={{ fontSize: '0.9rem' }}>د.ع</small></h2>
                            <p className="text-sm text-gray-500 mt-2">أموال خارج الصندوق</p>
                        </div>
                    </div>

                    {/* Partner Profit Sharing Section - Redesigned for Premium Look */}
                    <div className="card mb-8" style={{ padding: 0, overflow: 'hidden', border: '2px solid var(--success-500)', background: 'var(--success-50, #f0fdf4)' }}>
                        <div style={{
                            background: 'linear-gradient(135deg, var(--success-500) 0%, var(--success-600) 100%)',
                            padding: 'var(--spacing-4) var(--spacing-6)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            color: 'white'
                        }}>
                            <div className="flex items-center gap-3">
                                <Users size={22} />
                                <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>توزيع استحقاقات الشركاء</h3>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                صافي الربح: {formatNumber(grossProfit)} د.ع
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ padding: 'var(--spacing-6)' }}>
                            {[
                                { name: 'محمد جميل', share: 0.5, label: '50%', color: '#6366f1', light: '#eef2ff' },
                                { name: 'عبدالله خالد', share: 0.4, label: '40%', color: '#8b5cf6', light: '#f5f3ff' },
                                { name: 'بشير سبهان', share: 0.1, label: '10%', color: '#f59e0b', light: '#fffbeb' },
                            ].map((p, i) => (
                                <div key={i} className="glass-card" style={{
                                    padding: 'var(--spacing-5)',
                                    borderRadius: 'var(--radius-xl)',
                                    border: `1px solid ${p.light}`,
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', background: p.color
                                    }}></div>

                                    <div className="flex justify-between items-center mb-4">
                                        <span className="font-bold text-gray-700">{p.name}</span>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: '12px', background: p.light, color: p.color, fontSize: '0.75rem', fontWeight: 'bold'
                                        }}>{p.label} الحصة</span>
                                    </div>

                                    <div className="mb-2">
                                        <h3 style={{ margin: 0, color: 'var(--gray-900)', fontSize: '1.25rem' }}>{formatNumber(grossProfit * p.share)} <small style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>د.ع</small></h3>
                                    </div>

                                    <div style={{ height: '4px', width: '100%', background: 'var(--gray-100)', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{ width: p.label, height: '100%', background: p.color }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Product Sales Breakdown */}
                        <div className="lg:col-span-2 card">
                            <h3 className="mb-6 flex items-center gap-2">
                                <Package className="text-primary-500" />
                                تحليل المبيعات حسب المادة
                            </h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="w-full text-right" style={{ borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                                    <thead>
                                        <tr className="text-gray-400 text-sm">
                                            <th className="pb-4 px-4 font-normal">المادة</th>
                                            <th className="pb-4 px-4 font-normal">الكمية المباعة</th>
                                            <th className="pb-4 px-4 font-normal">القيمة الكلية</th>
                                            <th className="pb-4 px-4 font-normal">النسبة من الإجمالي</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productStats.map(product => (
                                            <tr key={product.key} className="bg-gray-50 hover:bg-gray-100 transition-colors">
                                                <td className="py-4 px-4 rounded-r-xl">
                                                    <div className="flex items-center gap-3">
                                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: product.color }}></div>
                                                        <span className="font-bold">{product.label}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">{formatNumber(product.qty)} كغم</td>
                                                <td className="py-4 px-4 font-bold text-primary-700">{formatNumber(product.val)} د.ع</td>
                                                <td className="py-4 px-4 rounded-l-xl w-48">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                            <div
                                                                style={{
                                                                    width: `${totalSales > 0 ? (product.val / totalSales) * 100 : 0}%`,
                                                                    background: product.color,
                                                                    height: '100%'
                                                                }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-xs font-bold">{totalSales > 0 ? ((product.val / totalSales) * 100).toFixed(1) : 0}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Operational Overview */}
                        <div className="card bg-gray-900 text-white">
                            <h3 className="mb-6 text-white flex items-center gap-2">
                                <Calendar />
                                ملخص العمليات
                            </h3>

                            <div className="flex flex-col gap-6">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <p className="text-gray-400 text-sm mb-1">الحنطة المستلمة</p>
                                    <div className="flex justify-between items-end">
                                        <h2 className="m-0 text-white">{formatNumber(totalWheatReceived / 1000)} <small className="text-xs">طن</small></h2>
                                        <span className="text-xs px-2 py-0.5 bg-success-500/20 text-success-400 rounded">مدخلات الإنتاج</span>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <p className="text-gray-400 text-sm mb-1">المنتجات المباعة</p>
                                    <div className="flex justify-between items-end">
                                        <h2 className="m-0 text-white">{formatNumber(totalKilosSold / 1000)} <small className="text-xs">طن</small></h2>
                                        <span className="text-xs px-2 py-0.5 bg-primary-500/20 text-primary-400 rounded">مخرجات الإنتاج</span>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <p className="text-gray-400 text-sm mb-1">إجمالي النقل والسلف</p>
                                    <div className="flex justify-between items-end">
                                        <h3 className="m-0 text-white">{formatNumber(totalDriverTransport)} <small className="text-xs">د.ع</small></h3>
                                    </div>
                                    <div className="flex justify-between text-xs mt-2 text-gray-500">
                                        <span>أجور نقل: {formatNumber(totalDriverTransport - totalDriverAdvances)}</span>
                                        <span>سلف: {formatNumber(totalDriverAdvances)}</span>
                                    </div>
                                </div>

                                <div className="mt-4 p-4 rounded-xl bg-primary-600/20 border border-primary-500/30 text-center">
                                    <p className="text-primary-300 text-xs mb-1 uppercase tracking-wider">الحالة التشغيلية</p>
                                    <h3 className="m-0 text-primary-100 italic">نشط - {currentSession?.status_label}</h3>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </main>

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    .dashboard-content { padding: 0 !important; }
                    .card { box-shadow: none !important; border: 1px solid #eee !important; }
                    .dashboard-layout { background: white !important; }
                    .report-print { font-size: 10pt; }
                }
                .glass-card {
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                }
            `}</style>
        </div>
    )
}

export default ReportsPage
