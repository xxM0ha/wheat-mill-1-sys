from django.db.models import Sum
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Session, Expense, Sale, Debt, Client, DriverJob, PartnerTransaction, Driver
from .serializers import (
    SessionSerializer, SessionCloseSerializer, 
    ExpenseSerializer, SaleSerializer, DebtSerializer, 
    DriverJobSerializer, PartnerTransactionSerializer,
    DriverSerializer
)


class SessionViewSet(viewsets.ModelViewSet):
    # ... (existing SessionViewSet code)
    queryset = Session.objects.all()
    serializer_class = SessionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Optionally filter by session_type and is_closed.
        """
        queryset = Session.objects.all()
        
        session_type = self.request.query_params.get('session_type')
        if session_type:
            queryset = queryset.filter(session_type=session_type)
        
        is_closed = self.request.query_params.get('is_closed')
        if is_closed is not None:
            is_closed_bool = is_closed.lower() == 'true'
            queryset = queryset.filter(is_closed=is_closed_bool)
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """
        Close a session by setting end_date and is_closed=True.
        """
        session = self.get_object()
        
        if session.is_closed:
            return Response(
                {'error': 'هذه الجلسة مغلقة بالفعل'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = SessionCloseSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        session.end_date = serializer.validated_data['end_date']
        session.is_closed = True
        session.save()
        
        return Response(SessionSerializer(session).data)
    
    @action(detail=True, methods=['post'])
    def reopen(self, request, pk=None):
        """
        Reopen a closed session.
        """
        session = self.get_object()
        
        if not session.is_closed:
            return Response(
                {'error': 'هذه الجلسة مفتوحة بالفعل'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        session.end_date = None
        session.is_closed = False
        session.save()
        
        return Response(SessionSerializer(session).data)

    @action(detail=True, methods=['get'])
    def get_stats(self, request, pk=None):
        """
        Get aggregated statistics for a session.
        """
        session = self.get_object()
        
        total_sales = Sale.objects.filter(session=session).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        total_expenses = Expense.objects.filter(session=session).aggregate(Sum('amount'))['amount__sum'] or 0
        total_transport = DriverJob.objects.filter(session=session).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        
        net_profit = float(total_sales) - float(total_expenses) - float(total_transport)
        
        return Response({
            'total_sales': float(total_sales),
            'total_expenses': float(total_expenses),
            'total_transport': float(total_transport),
            'net_profit': net_profit,
        })

    @action(detail=True, methods=['post'])
    def sync_profits(self, request, pk=None):
        """
        Calculate net profit and distribute it to partner transactions.
        """
        session = self.get_object()
        
        # Calculate profits
        stats_res = self.get_stats(request, pk=pk)
        net_profit = stats_res.data['net_profit']
        
        partners = [
            {'id': 'mohammad_jamil', 'share': 0.5},
            {'id': 'abdullah_khalid', 'share': 0.4},
            {'id': 'bashir_sabhan', 'share': 0.1},
        ]
        
        synced_transactions = []
        for p in partners:
            amount = net_profit * p['share']
            # Find or create profit transaction
            trans, created = PartnerTransaction.objects.update_or_create(
                session=session,
                partner_name=p['id'],
                type='profit',
                defaults={
                    'amount': amount,
                    'date': session.start_date or session.created_at.date(),
                    'notes': f'أرباح تلقائية من التقرير (صافي الربح: {net_profit:,.0f} د.ع)'
                }
            )
            synced_transactions.append(PartnerTransactionSerializer(trans).data)
            
        return Response({
            'message': 'تم تحديث أرباح الشركاء بنجاح',
            'net_profit': net_profit,
            'transactions': synced_transactions
        })
    
    @action(detail=True, methods=['post'])
    def delete_session_data(self, request, pk=None):
        """
        Delete all session data except debts.
        This removes: expenses, sales, driver jobs, and partner transactions.
        Debts are preserved for record-keeping purposes.
        """
        session = self.get_object()
        
        # Count items before deletion
        expenses_count = Expense.objects.filter(session=session).count()
        sales_count = Sale.objects.filter(session=session).count()
        jobs_count = DriverJob.objects.filter(session=session).count()
        transactions_count = PartnerTransaction.objects.filter(session=session).count()
        
        # Delete all related data except debts
        Expense.objects.filter(session=session).delete()
        Sale.objects.filter(session=session).delete()
        DriverJob.objects.filter(session=session).delete()
        PartnerTransaction.objects.filter(session=session).delete()
        
        return Response({
            'message': 'تم حذف بيانات الجلسة بنجاح (تم الاحتفاظ بالديون)',
            'deleted': {
                'expenses': expenses_count,
                'sales': sales_count,
                'driver_jobs': jobs_count,
                'partner_transactions': transactions_count
            }
        })


class ExpenseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Expense CRUD operations.
    """
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Filter expenses by session_id.
        """
        queryset = Expense.objects.all()
        session_id = self.request.query_params.get('session_id')
        if session_id:
            queryset = queryset.filter(session_id=session_id)
        return queryset.order_by('-created_at')


class SaleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Sale CRUD operations.
    """
    queryset = Sale.objects.all()
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Filter sales by session_id, buyer_name, and date range.
        """
        queryset = Sale.objects.all()
        session_id = self.request.query_params.get('session_id')
        if session_id:
            queryset = queryset.filter(session_id=session_id)
            
        buyer_name = self.request.query_params.get('buyer_name')
        if buyer_name:
            queryset = queryset.filter(buyer_name__icontains=buyer_name)
            
        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
            
        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
            
        return queryset.order_by('-date', '-created_at')

    def perform_create(self, serializer):
        instance = serializer.save()
        if instance.driver_name:
            Driver.objects.get_or_create(name=instance.driver_name)

    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.driver_name:
            Driver.objects.get_or_create(name=instance.driver_name)

    @action(detail=False, methods=['get'])
    def suggestions(self, request):
        """
        Get unique buyer and driver names for autocomplete suggestions.
        Filtered by driver category if requested.
        """
        clients = Client.objects.values_list('name', flat=True).distinct()
        
        # Determine which list of drivers to return based on 'for' query param
        target = request.query_params.get('for', 'both') # 'sales', 'mill', or 'both'
        
        if target == 'sales':
            drivers = Driver.objects.filter(category__in=['sales', 'both']).values_list('name', flat=True)
        elif target == 'mill':
            drivers = Driver.objects.filter(category__in=['mill', 'both']).values_list('name', flat=True)
        else:
            # Fallback to old logic or return all from Driver model if no filter
            drivers = Driver.objects.values_list('name', flat=True)
            
        # If Driver table is empty (initial state), fallback to existing names in Sale/DriverJob
        if not drivers.exists():
            sale_drivers = Sale.objects.values_list('driver_name', flat=True).distinct()
            job_drivers = DriverJob.objects.values_list('driver_name', flat=True).distinct()
            drivers = list(set(filter(None, list(sale_drivers) + list(job_drivers))))
        
        return Response({
            'buyers': sorted(list(set(filter(None, clients)))),
            'drivers': sorted(list(set(filter(None, drivers))))
        })


class DebtViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Debt CRUD operations.
    """
    queryset = Debt.objects.all()
    serializer_class = DebtSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Filter debts by session_id, person_name, and date range.
        """
        queryset = Debt.objects.all()
        session_id = self.request.query_params.get('session_id')
        if session_id:
            queryset = queryset.filter(session_id=session_id)
            
        person_name = self.request.query_params.get('person_name')
        if person_name:
            queryset = queryset.filter(person_name=person_name)
            
        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
            
        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
            
        return queryset.order_by('-date', '-created_at')

    @action(detail=False, methods=['post'])
    def bulk_delete_by_person(self, request):
        """
        Delete all debts for a person, and mark related sales as paid.
        Sales are not deleted - instead they are marked as fully paid.
        """
        person_name = request.data.get('person_name')
        if not person_name:
            return Response({'error': 'اسم الشخص مطلوب'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Find sales related to this person that have debts
        sales_with_debts = Sale.objects.filter(buyer_name=person_name, payment_type__in=['debt', 'partial'])
        sales_updated = 0
        
        for sale in sales_with_debts:
            # Mark sale as fully paid
            sale.amount_paid = sale.total_amount
            sale.payment_type = 'cash'
            sale.save()
            sales_updated += 1
        
        # Delete all debt entries for this person (including those linked to sales)
        debts_deleted, _ = Debt.objects.filter(person_name=person_name).delete()
        
        return Response({
            'message': f'تم حذف ديون العميل وتسوية المبيعات بنجاح',
            'details': {
                'debts_deleted': debts_deleted,
                'sales_marked_paid': sales_updated
            }
        })

    @action(detail=False, methods=['get'])
    def suggestions(self, request):
        """
        Get unique person names who have debt records.
        """
        # Get all unique person names from Debt records
        person_names = Debt.objects.values_list('person_name', flat=True).distinct()
        
        return Response({
            'persons': sorted(list(set(filter(None, person_names))))
        })



class DriverJobViewSet(viewsets.ModelViewSet):
    """
    ViewSet for DriverJob CRUD operations.
    """
    queryset = DriverJob.objects.all()
    serializer_class = DriverJobSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Filter jobs by session_id, driver_name, and date range.
        """
        queryset = DriverJob.objects.all()
        session_id = self.request.query_params.get('session_id')
        if session_id:
            queryset = queryset.filter(session_id=session_id)
            
        driver_name = self.request.query_params.get('driver_name')
        if driver_name:
            queryset = queryset.filter(driver_name__icontains=driver_name)
            
        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
            
        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
            
        return queryset.order_by('-date', '-created_at')

    def perform_create(self, serializer):
        instance = serializer.save()
        if instance.driver_name:
            Driver.objects.get_or_create(name=instance.driver_name)

    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.driver_name:
            Driver.objects.get_or_create(name=instance.driver_name)

    @action(detail=False, methods=['post'])
    def bulk_delete_by_driver(self, request):
        """
        Delete all driver jobs associated with a driver name in a specific session.
        """
        driver_name = request.data.get('driver_name')
        session_id = request.data.get('session_id')
        
        if not driver_name:
            return Response({'error': 'اسم السائق مطلوب'}, status=status.HTTP_400_BAD_REQUEST)
        if not session_id:
            return Response({'error': 'معرف الجلسة مطلوب'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Delete DriverJobs for this driver in the specified session only
        jobs_deleted, _ = DriverJob.objects.filter(driver_name=driver_name, session_id=session_id).delete()
        
        # Also delete the Driver entity to remove them from suggestions
        # This effectively "removes the driver" from the system
        drivers_deleted, _ = Driver.objects.filter(name=driver_name).delete()
        
        return Response({
            'message': f'تم حذف السائق {driver_name} وجميع بياناته بنجاح',
            'details': {
                'jobs': jobs_deleted,
                'drivers_deleted': drivers_deleted
            }
        })

class PartnerTransactionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for PartnerTransaction CRUD operations.
    """
    queryset = PartnerTransaction.objects.all()
    serializer_class = PartnerTransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Filter transactions by session_id.
        """
        queryset = PartnerTransaction.objects.all()
        session_id = self.request.query_params.get('session_id')
        if session_id:
            queryset = queryset.filter(session_id=session_id)
        return queryset.order_by('-date', '-created_at')

class DriverViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Driver management.
    """
    queryset = Driver.objects.all()
    serializer_class = DriverSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def sync_from_history(self, request):
        """
        Import all unique driver names from Sales and DriverJobs.
        """
        sale_drivers = Sale.objects.values_list('driver_name', flat=True).distinct()
        job_drivers = DriverJob.objects.values_list('driver_name', flat=True).distinct()
        all_names = set(filter(None, list(sale_drivers) + list(job_drivers)))
        
        created_count = 0
        for name in all_names:
            _, created = Driver.objects.get_or_create(name=name)
            if created:
                created_count += 1
        
        return Response({'message': f'تمت مزامنة {created_count} سائق جديد', 'total': Driver.objects.count()})
