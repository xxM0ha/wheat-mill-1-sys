from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SessionViewSet, ExpenseViewSet, SaleViewSet, 
    DebtViewSet, DriverJobViewSet, PartnerTransactionViewSet,
    DriverViewSet
)
from .print_views import (
    print_session_report,
    print_sales_report,
    print_debts_report,
    print_drivers_report,
    print_expenses_report,
    print_partner_report,
    print_invoice
)

router = DefaultRouter()
router.register(r'sales', SaleViewSet, basename='sale')
router.register(r'expenses', ExpenseViewSet, basename='expense')
router.register(r'debts', DebtViewSet, basename='debt')
router.register(r'drivers', DriverJobViewSet, basename='driver')
router.register(r'driver-management', DriverViewSet, basename='driver-management')
router.register(r'partners', PartnerTransactionViewSet, basename='partner')
router.register(r'', SessionViewSet, basename='session')

urlpatterns = [
    # Print views
    path('print/session/<int:session_id>/', print_session_report, name='print_session'),
    path('print/sales/', print_sales_report, name='print_sales'),
    path('print/invoice/<int:sale_id>/', print_invoice, name='print_invoice'),
    path('print/debts/', print_debts_report, name='print_debts'),
    path('print/drivers/', print_drivers_report, name='print_drivers'),
    path('print/expenses/', print_expenses_report, name='print_expenses'),
    path('print/partner/', print_partner_report, name='print_partner'),
    # Router URLs
    path('', include(router.urls)),
]
