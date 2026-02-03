/**
 * Print Button Integration Examples
 * 
 * This file demonstrates how to add print buttons to each page in your React application.
 * Copy and paste the relevant code into your pages.
 */

// ============================================================================
// 1. IMPORTS - Add Printer icon to your existing imports
// ============================================================================

// Add to existing lucide-react imports:
import { Printer } from 'lucide-react'


// ============================================================================
// 2. PRINT HANDLERS - Add the appropriate handler to your component
// ============================================================================

// -------- For DashboardPage.jsx --------
const handlePrintSession = () => {
    const sessionId = localStorage.getItem('currentSessionId') || currentSession.id
    const url = `http://localhost:8000/api/sessions/print/session/${sessionId}/`
    window.open(url, '_blank')
}

// -------- For SalesPage.jsx --------
const handlePrintSales = () => {
    const sessionId = localStorage.getItem('currentSessionId')
    const url = `http://localhost:8000/api/sessions/print/sales/?session=${sessionId}`
    window.open(url, '_blank')
}

// Alternative with filters:
const handlePrintSalesWithFilters = (buyerName = '', dateFrom = '', dateTo = '') => {
    const sessionId = localStorage.getItem('currentSessionId')
    const params = new URLSearchParams({ session: sessionId })

    if (buyerName) params.append('buyer_name', buyerName)
    if (dateFrom) params.append('date_from', dateFrom)
    if (dateTo) params.append('date_to', dateTo)

    const url = `http://localhost:8000/api/sessions/print/sales/?${params.toString()}`
    window.open(url, '_blank')
}

// -------- For DebtsPage.jsx --------
const handlePrintDebts = () => {
    const sessionId = localStorage.getItem('currentSessionId')
    const url = `http://localhost:8000/api/sessions/print/debts/?session=${sessionId}`
    window.open(url, '_blank')
}

// Alternative with filters:
const handlePrintDebtsWithFilters = (personName = '', dateFrom = '', dateTo = '') => {
    const sessionId = localStorage.getItem('currentSessionId')
    const params = new URLSearchParams({ session: sessionId })

    if (personName) params.append('person_name', personName)
    if (dateFrom) params.append('date_from', dateFrom)
    if (dateTo) params.append('date_to', dateTo)

    const url = `http://localhost:8000/api/sessions/print/debts/?${params.toString()}`
    window.open(url, '_blank')
}

// -------- For DriversPage.jsx --------
const handlePrintDrivers = () => {
    const sessionId = localStorage.getItem('currentSessionId')
    const url = `http://localhost:8000/api/sessions/print/drivers/?session=${sessionId}`
    window.open(url, '_blank')
}

// Alternative with filters:
const handlePrintDriversWithFilters = (driverName = '', dateFrom = '', dateTo = '') => {
    const sessionId = localStorage.getItem('currentSessionId')
    const params = new URLSearchParams({ session: sessionId })

    if (driverName) params.append('driver_name', driverName)
    if (dateFrom) params.append('date_from', dateFrom)
    if (dateTo) params.append('date_to', dateTo)

    const url = `http://localhost:8000/api/sessions/print/drivers/?${params.toString()}`
    window.open(url, '_blank')
}

// -------- For ExpensesPage.jsx --------
const handlePrintExpenses = () => {
    const sessionId = localStorage.getItem('currentSessionId')
    const url = `http://localhost:8000/api/sessions/print/expenses/?session=${sessionId}`
    window.open(url, '_blank')
}


// ============================================================================
// 3. BUTTON COMPONENTS - Copy/paste into your JSX
// ============================================================================

// -------- Simple Print Button --------
<button 
    onClick={handlePrintSession} 
    className="btn btn-secondary flex items-center gap-2"
>
    <Printer size={18} />
    طباعة التقرير
</button>

// -------- Primary/Success Styled Print Button --------
<button 
    onClick={handlePrintSales} 
    className="btn btn-primary flex items-center gap-2"
>
    <Printer size={18} />
    طباعة تقرير المبيعات
</button>

// -------- Icon Only Print Button (for compact spaces) --------
<button 
    onClick={handlePrintDebts} 
    className="btn btn-icon btn-secondary"
    title="طباعة التقرير"
>
    <Printer size={20} />
</button>

// -------- Large Styled Print Button with Gradient --------
<button 
    onClick={handlePrintDrivers}
    style={{
        padding: '12px 24px',
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease'
    }}
    onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
    onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
>
    <Printer size={20} />
    طباعة التقرير
</button>

// -------- Dropdown Menu Item --------
<div className="dropdown-item" onClick={handlePrintExpenses}>
    <Printer size={16} />
    <span>طباعة التقرير</span>
</div>


// ============================================================================
// 4. SUGGESTED PLACEMENT LOCATIONS
// ============================================================================

/*
 * DashboardPage.jsx:
 * - Add next to "إغلاق الجلسة" button in the session info header
 * 
 * SalesPage.jsx:
 * - Add in the header next to "إضافة بيع" button
 * - Or in a toolbar above the sales table
 * 
 * DebtsPage.jsx:
 * - Add in the header next to "إضافة دين" button
 * - Or in the filter section
 * 
 * DriversPage.jsx:
 * - Add in the header next to "إضافة نقلية" button
 * - Or in the tabs section
 * 
 * ExpensesPage.jsx:
 * - Add in the header next to "إضافة مصروف" button
 */


// ============================================================================
// 5. COMPLETE EXAMPLE - Sales Page with Print
// ============================================================================

function SalesPageExample() {
    // ... your existing code ...

    const handlePrintSales = () => {
        const sessionId = localStorage.getItem('currentSessionId')
        const url = `http://localhost:8000/api/sessions/print/sales/?session=${sessionId}`
        window.open(url, '_blank')
    }

    return (
        <div className="page-container">
            <header className="page-header">
                <div className="flex justify-between items-center">
                    <h1>المبيعات</h1>
                    <div className="flex gap-4">
                        <button
                            onClick={handlePrintSales}
                            className="btn btn-secondary flex items-center gap-2"
                        >
                            <Printer size={18} />
                            طباعة المبيعات
                        </button>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="btn btn-primary"
                        >
                            + إضافة بيع
                        </button>
                    </div>
                </div>
            </header>

            {/* ... rest of your component ... */}
        </div>
    )
}


// ============================================================================
// 6. CUSTOM STYLING FOR PRINT BUTTONS
// ============================================================================

// Add to your CSS file:
/*
.btn-print {
    padding: 10px 20px;
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(99, 102, 241, 0.2);
}

.btn-print:hover {
    background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
    box-shadow: 0 4px 8px rgba(99, 102, 241, 0.3);
    transform: translateY(-2px);
}

.btn-print:active {
    transform: translateY(0);
}

.btn-print-icon {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    border: none;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    color: white;
}

.btn-print-icon:hover {
    background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
    transform: scale(1.05);
}
*/


// ============================================================================
// 7. ENVIRONMENT CONFIGURATION
// ============================================================================

// For production, you might want to use environment variables:
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000'

const handlePrintSalesProduction = () => {
    const sessionId = localStorage.getItem('currentSessionId')
    const url = `${API_BASE_URL}/api/sessions/print/sales/?session=${sessionId}`
    window.open(url, '_blank')
}


// ============================================================================
// END OF EXAMPLES
// ============================================================================
