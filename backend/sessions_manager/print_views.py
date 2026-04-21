from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Sum, Count, Q, F, DecimalField
from django.db.models.functions import Coalesce
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

from .models import Session, Sale, Debt, DriverJob, Expense, PartnerTransaction


def calculate_session_stats(session):
    """Calculate session statistics."""
    
    # Sales stats
    sales_aggregates = session.sales.aggregate(
        total_sales=Coalesce(Sum('total_amount'), 0, output_field=DecimalField()),
        sales_count=Count('id')
    )
    
    # Expenses stats
    expenses_total = session.expenses.aggregate(
        total=Coalesce(Sum('amount'), 0, output_field=DecimalField())
    )['total']
    
    # Driver jobs stats
    driver_aggregates = session.driver_jobs.aggregate(
        total_transport=Coalesce(Sum('total_amount'), 0, output_field=DecimalField()),
        total_advances=Coalesce(Sum('advance_payment'), 0, output_field=DecimalField())
    )
    
    total_transport = driver_aggregates['total_transport']
    total_advances = driver_aggregates['total_advances']
    total_driver_net = total_transport - total_advances
    
    # Net profit calculation
    net_profit = sales_aggregates['total_sales'] - expenses_total - total_transport
    
    return {
        'total_sales': sales_aggregates['total_sales'],
        'sales_count': sales_aggregates['sales_count'],
        'total_expenses': expenses_total,
        'total_transport': total_transport,
        'total_advances': total_advances,
        'total_driver_net': total_driver_net,
        'net_profit': net_profit,
    }


@api_view(['GET'])
@permission_classes([AllowAny])
def print_session_report(request, session_id):
    """Print view for session report."""
    session = get_object_or_404(Session, id=session_id)
    
    # Get all related data
    sales = session.sales.all()
    expenses = session.expenses.all()
    driver_jobs = session.driver_jobs.all()
    partners = session.partner_transactions.all()
    
    # Calculate stats
    stats = calculate_session_stats(session)
    
    context = {
        'session': session,
        'sales': sales,
        'expenses': expenses,
        'driver_jobs': driver_jobs,
        'partners': partners,
        'stats': stats,
        'print_date': timezone.now(),
    }
    
    return render(request, 'sessions_manager/print/session_print.html', context)


@api_view(['GET'])
@permission_classes([AllowAny])
def print_sales_report(request):
    """Print view for sales report."""
    # Get filter parameters
    session_id = request.GET.get('session')
    buyer_name = request.GET.get('buyer_name')
    date_from = request.GET.get('date_from')
    date_to = request.GET.get('date_to')
    
    # Build queryset with filters
    sales = Sale.objects.all()
    
    session = None
    if session_id:
        session = get_object_or_404(Session, id=session_id)
        sales = sales.filter(session=session)
    
    if buyer_name:
        sales = sales.filter(buyer_name__icontains=buyer_name)
    
    if date_from:
        sales = sales.filter(date__gte=date_from)
    
    if date_to:
        sales = sales.filter(date__lte=date_to)
    
    # Calculate summary for totals row
    summary = sales.aggregate(
        total_sales=Coalesce(Sum('total_amount'), 0, output_field=DecimalField()),
        total_paid=Coalesce(Sum('amount_paid'), 0, output_field=DecimalField()),
    )
    
    person_stats = None
    if buyer_name:
        buyer_name_clean = buyer_name.strip()
        if buyer_name_clean:
            # Get total debts and payments for this person across all sessions
            person_debts = Debt.objects.filter(person_name__icontains=buyer_name_clean).aggregate(
                we_want=Coalesce(Sum('amount', filter=Q(entry_type='debt')), 0, output_field=DecimalField()),
                they_paid=Coalesce(Sum('amount', filter=Q(entry_type='payment')), 0, output_field=DecimalField()),
                they_want=Coalesce(Sum('amount', filter=Q(entry_type='liability')), 0, output_field=DecimalField()),
                we_paid=Coalesce(Sum('amount', filter=Q(entry_type='our_payment')), 0, output_field=DecimalField())
            )
            
            person_stats = {
                'balance_we_want': person_debts['we_want'] - person_debts['they_paid'],
                'balance_they_want': person_debts['they_want'] - person_debts['we_paid']
            }
        else:
            buyer_name = None  # Treat empty string as None
    
    context = {
        'session': session,
        'sales': sales,
        'summary': summary,
        'person_stats': person_stats,
        'buyer_name': buyer_name,
        'date_from': date_from,
        'date_to': date_to,
        'print_date': timezone.now(),
    }
    
    return render(request, 'sessions_manager/print/sales_print.html', context)


@api_view(['GET'])
@permission_classes([AllowAny])
def print_debts_report(request):
    """Print view for debts report."""
    # Get filter parameters
    session_id = request.GET.get('session')
    person_name = request.GET.get('person_name')
    date_from = request.GET.get('date_from')
    date_to = request.GET.get('date_to')
    
    # Build queryset with filters
    debts = Debt.objects.select_related('sale').all()
    
    # On-the-fly linking for existing records that might be missing the foreign key
    import re
    for d in debts:
        if not d.sale and d.notes:
            match = re.search(r'(?:فاتورة|رقم)\s+(\d+)', d.notes) or re.search(r'(\d+)', d.notes)
            if match:
                inv = match.group(0) # Get the number or the whole match
                # Try to extract just the digits
                inv_num = re.search(r'\d+', inv).group(0)
                sale = Sale.objects.filter(invoice_number=inv_num).first()
                if sale:
                    d.sale = sale
                    # Optimization: we don't save to DB here to avoid slow print view, 
                    # but the template will now see d.sale
    
    session = None
    if session_id:
        session = get_object_or_404(Session, id=session_id)
        debts = debts.filter(session=session)
    
    if person_name:
        debts = debts.filter(person_name__icontains=person_name)
    
    if date_from:
        debts = debts.filter(date__gte=date_from)
    
    if date_to:
        debts = debts.filter(date__lte=date_to)
    
    person_stats = None
    if person_name:
        p_name_clean = person_name.strip()
        if p_name_clean:
            # Build query with the same filters applied to the debts list
            stats_query = Debt.objects.filter(person_name__icontains=p_name_clean)
            
            # Apply date filters to balance calculation
            if date_from:
                stats_query = stats_query.filter(date__gte=date_from)
            if date_to:
                stats_query = stats_query.filter(date__lte=date_to)
            
            stats = stats_query.aggregate(
                total_debt=Coalesce(Sum('amount', filter=Q(entry_type='debt')), 0, output_field=DecimalField()),
                total_payment=Coalesce(Sum('amount', filter=Q(entry_type='payment')), 0, output_field=DecimalField()),
            )
            
            net_balance = stats['total_debt'] - stats['total_payment']
            
            # Determine status
            if net_balance > 0:
                status = 'we_want'  # نطلبه
            elif net_balance < 0:
                status = 'they_want'  # يطلبنا
            else:
                status = 'settled'  # تم تصفير الحساب
            
            person_stats = {
                'status': status,
                'balance_we_want': net_balance if net_balance > 0 else 0,
                'balance_they_want': abs(net_balance) if net_balance < 0 else 0
            }

    context = {
        'session': session,
        'debts': debts,
        'person_stats': person_stats,
        'person_name': person_name,
        'date_from': date_from,
        'date_to': date_to,
        'print_date': timezone.now(),
    }
    
    return render(request, 'sessions_manager/print/debts_print.html', context)


@api_view(['GET'])
@permission_classes([AllowAny])
def print_drivers_report(request):
    """Print view for driver jobs report."""
    # Get filter parameters
    session_id = request.GET.get('session')
    driver_name = request.GET.get('driver_name')
    date_from = request.GET.get('date_from')
    date_to = request.GET.get('date_to')
    
    # Build queryset with filters
    jobs = DriverJob.objects.all()
    
    session = None
    if session_id:
        session = get_object_or_404(Session, id=session_id)
        jobs = jobs.filter(session=session)
    
    if driver_name:
        jobs = jobs.filter(driver_name__icontains=driver_name)
    
    if date_from:
        jobs = jobs.filter(date__gte=date_from)
    
    if date_to:
        jobs = jobs.filter(date__lte=date_to)
    
    # Calculate summary for totals row
    summary = jobs.aggregate(
        total_transport=Coalesce(Sum('total_amount'), 0, output_field=DecimalField()),
        total_advances=Coalesce(Sum('advance_payment'), 0, output_field=DecimalField()),
        total_quantity=Coalesce(Sum('quantity'), 0, output_field=DecimalField()),
    )
    
    summary['net_amount'] = summary['total_transport'] - summary['total_advances']
    
    context = {
        'session': session,
        'jobs': jobs,
        'summary': summary,
        'driver_name': driver_name,
        'date_from': date_from,
        'date_to': date_to,
        'print_date': timezone.now(),
    }
    
    return render(request, 'sessions_manager/print/drivers_print.html', context)


@api_view(['GET'])
@permission_classes([AllowAny])
def print_expenses_report(request):
    """Print view for expenses report."""
    # Get filter parameters
    session_id = request.GET.get('session')
    
    # Build queryset with filters
    expenses = Expense.objects.all()
    
    session = None
    if session_id:
        session = get_object_or_404(Session, id=session_id)
        expenses = expenses.filter(session=session)
    
    # Calculate summary
    summary = expenses.aggregate(
        total_expenses=Coalesce(Sum('amount'), 0, output_field=DecimalField()),
    )
    
    context = {
        'session': session,
        'expenses': expenses,
        'summary': summary,
        'print_date': timezone.now(),
    }
    
    return render(request, 'sessions_manager/print/expenses_print.html', context)
@api_view(['GET'])
@permission_classes([AllowAny])
def print_partner_report(request):
    """Print view for partner report."""
    partner_id = request.GET.get('partner')
    session_id = request.GET.get('session')
    
    session = get_object_or_404(Session, id=session_id)
    
    # Filtering transactions by partner and session
    transactions = PartnerTransaction.objects.filter(
        session=session,
        partner_name=partner_id
    ).order_by('-date', '-created_at')
    
    # Calculate partner stats for this session
    stats = {
        'total_deposits': transactions.filter(type='deposit').aggregate(total=Coalesce(Sum('amount'), 0, output_field=DecimalField()))['total'],
        'total_withdrawals': transactions.filter(type='withdrawal').aggregate(total=Coalesce(Sum('amount'), 0, output_field=DecimalField()))['total'],
        'total_profits': transactions.filter(type='profit').aggregate(total=Coalesce(Sum('amount'), 0, output_field=DecimalField()))['total'],
    }
    stats['net'] = (stats['total_deposits'] + stats['total_profits']) - stats['total_withdrawals']
    
    # Get partner display name
    partner_display = dict(PartnerTransaction.PARTNER_CHOICES).get(partner_id, partner_id)
    
    context = {
        'session': session,
        'partner_id': partner_id,
        'partner_name': partner_display,
        'transactions': transactions,
        'stats': stats,
        'print_date': timezone.now(),
    }
    
    return render(request, 'sessions_manager/print/partner_print.html', context)


@api_view(['GET'])
@permission_classes([AllowAny])
def print_invoice(request, sale_id):
    """Print view for a single sale invoice."""
    sale = get_object_or_404(Sale, id=sale_id)
    
    context = {
        'sale': sale,
        'session': sale.session,
        'print_date': timezone.now(),
    }
    
    return render(request, 'sessions_manager/print/invoice_print.html', context)

