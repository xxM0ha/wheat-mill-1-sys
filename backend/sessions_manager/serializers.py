from rest_framework import serializers
from .models import Session, Expense, Sale, Debt, DriverJob, PartnerTransaction, Driver


class DriverSerializer(serializers.ModelSerializer):
    """Serializer for Driver model."""
    category_display = serializers.CharField(
        source='get_category_display',
        read_only=True
    )

    class Meta:
        model = Driver
        fields = ['id', 'name', 'category', 'category_display', 'created_at']
        read_only_fields = ['id', 'created_at']



class SessionSerializer(serializers.ModelSerializer):
    """Serializer for Session model."""
    
    session_type_display = serializers.CharField(
        source='get_session_type_display',
        read_only=True
    )
    quota_label = serializers.CharField(read_only=True)
    status_label = serializers.CharField(read_only=True)
    created_by_username = serializers.CharField(
        source='created_by.username',
        read_only=True
    )
    
    class Meta:
        model = Session
        fields = [
            'id',
            'session_type',
            'session_type_display',
            'quota_number',
            'quota_label',
            'start_date',
            'end_date',
            'is_closed',
            'status_label',
            'created_by',
            'created_by_username',
            'default_silo',
            'custom_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']
    
    def validate_quota_number(self, value):
        """Ensure quota number is between 1 and 12."""
        if not 1 <= value <= 12:
            raise serializers.ValidationError("رقم الحصة/الدفعة يجب أن يكون بين 1 و 12")
        return value
    
    def create(self, validated_data):
        """Set the created_by field to the current user."""
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class SessionCloseSerializer(serializers.Serializer):
    """Serializer for closing a session."""
    end_date = serializers.DateField()


class ExpenseSerializer(serializers.ModelSerializer):
    """Serializer for Expense model."""
    class Meta:
        model = Expense
        fields = ['id', 'session', 'name', 'amount', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at']


class SaleSerializer(serializers.ModelSerializer):
    """Serializer for Sale model."""
    payment_type_display = serializers.CharField(
        source='get_payment_type_display',
        read_only=True
    )
    item_type_display = serializers.CharField(
        source='get_item_type_display',
        read_only=True
    )

    class Meta:
        model = Sale
        fields = [
            'id', 'session', 'buyer_name', 'driver_name', 'item_type',
            'item_type_display', 'quantity_kilos', 'date', 'invoice_number', 
            'price_per_ton', 'total_amount', 'payment_type', 
            'payment_type_display', 'amount_paid', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class DebtSerializer(serializers.ModelSerializer):
    """Serializer for Debt model."""
    entry_type_display = serializers.CharField(
        source='get_entry_type_display',
        read_only=True
    )

    sale_details = SaleSerializer(source='sale', read_only=True)
    
    class Meta:
        model = Debt
        fields = [
            'id', 'session', 'person_name', 'entry_type', 'entry_type_display',
            'amount', 'date', 'notes', 'sale', 'sale_details', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class DriverJobSerializer(serializers.ModelSerializer):
    """Serializer for DriverJob model."""
    class Meta:
        model = DriverJob
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

class PartnerTransactionSerializer(serializers.ModelSerializer):
    """Serializer for PartnerTransaction model."""
    partner_name_display = serializers.CharField(
        source='get_partner_name_display',
        read_only=True
    )
    type_display = serializers.CharField(
        source='get_type_display',
        read_only=True
    )

    class Meta:
        model = PartnerTransaction
        fields = '__all__'
        read_only_fields = ['id', 'created_at']
