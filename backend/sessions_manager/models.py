from django.db import models
from django.conf import settings


class Session(models.Model):
    """
    Session model for managing wheat mill accounting sessions.
    Each session belongs to either the Ration Card System or Commercial Flour System.
    """
    
    SESSION_TYPE_RATION_CARD = 'ration_card'
    SESSION_TYPE_COMMERCIAL = 'commercial_flour'
    
    SESSION_TYPE_CHOICES = [
        (SESSION_TYPE_RATION_CARD, 'نظام البطاقة التموينية'),
        (SESSION_TYPE_COMMERCIAL, 'نظام الطحين الصفر التجاري'),
    ]
    
    session_type = models.CharField(
        max_length=20,
        choices=SESSION_TYPE_CHOICES,
        verbose_name="نوع النظام"
    )
    
    quota_number = models.PositiveIntegerField(
        verbose_name="رقم الحصة/الدفعة",
        help_text="من 1 إلى 12"
    )
    
    start_date = models.DateField(
        verbose_name="تاريخ البدء"
    )
    
    end_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="تاريخ الإغلاق"
    )
    
    is_closed = models.BooleanField(
        default=False,
        verbose_name="مغلقة"
    )
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='sessions',
        verbose_name="أنشأها"
    )
    
    default_silo = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name="السايلو الافتراضي"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="تاريخ الإنشاء"
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="تاريخ التحديث"
    )
    
    class Meta:
        verbose_name = "جلسة"
        verbose_name_plural = "الجلسات"
        ordering = ['-created_at']
        # Ensure unique combination of session_type and quota_number per year
        constraints = [
            models.CheckConstraint(
                check=models.Q(quota_number__gte=1) & models.Q(quota_number__lte=12),
                name='valid_quota_number'
            ),
        ]
    
    def __str__(self):
        type_display = dict(self.SESSION_TYPE_CHOICES).get(self.session_type, self.session_type)
        quota_label = "حصة" if self.session_type == self.SESSION_TYPE_RATION_CARD else "دفعة"
        status = "مغلقة" if self.is_closed else "مفتوحة"
        return f"{type_display} - {quota_label} {self.quota_number} ({status})"
    
    @property
    def quota_label(self):
        """Return the appropriate label based on session type."""
        if self.session_type == self.SESSION_TYPE_RATION_CARD:
            return f"حصة {self.quota_number}"
        return f"دفعة {self.quota_number}"
    
    @property
    def status_label(self):
        """Return status in Arabic."""
        return "مغلقة" if self.is_closed else "مفتوحة"


class Expense(models.Model):
    """
    Expense model for tracking mill expenses within a specific session.
    """
    session = models.ForeignKey(
        Session,
        on_delete=models.CASCADE,
        related_name='expenses',
        verbose_name="الجلسة"
    )
    name = models.CharField(
        max_length=255,
        verbose_name="الاسم/البيان"
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        verbose_name="المبلغ"
    )
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name="ملاحظات"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="تاريخ الإنشاء"
    )

    class Meta:
        verbose_name = "مصروف"
        verbose_name_plural = "المصاريف"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - {self.amount}"


class Sale(models.Model):
    """
    Sale model for tracking wheat product sales within a specific session.
    """
    PAYMENT_CHOICES = [
        ('cash', 'نقدي'),
        ('debt', 'دين'),
        ('partial', 'جزئي'),
    ]

    ITEM_CHOICES = [
        ('flour', 'طحين'),
        ('bran', 'نخالة'),
        ('impurities', 'شوائب'),
        ('wheat', 'حنطة'),
        ('broken_wheat', 'كسر حنطة'),
    ]

    session = models.ForeignKey(
        Session,
        on_delete=models.CASCADE,
        related_name='sales',
        verbose_name="الجلسة"
    )
    buyer_name = models.CharField(
        max_length=255,
        verbose_name="اسم المشتري"
    )
    driver_name = models.CharField(
        max_length=255,
        verbose_name="اسم السائق"
    )
    item_type = models.CharField(
        max_length=50,
        choices=ITEM_CHOICES,
        default='flour',
        verbose_name="نوع المادة"
    )
    quantity_kilos = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        verbose_name="الكمية (كيلو)"
    )
    date = models.DateField(
        verbose_name="التاريخ"
    )
    invoice_number = models.CharField(
        max_length=50,
        verbose_name="رقم القائمة/الفاتورة"
    )
    price_per_ton = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        verbose_name="سعر الطن (1000 كيلو)"
    )
    total_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        verbose_name="المبلغ الكلي"
    )
    payment_type = models.CharField(
        max_length=20,
        choices=PAYMENT_CHOICES,
        default='cash',
        verbose_name="نوع الدفع"
    )
    amount_paid = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        verbose_name="المبلغ المدفوع"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="تاريخ الإنشاء"
    )

    class Meta:
        verbose_name = "بيع"
        verbose_name_plural = "المبيعات"
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"فاتورة {self.invoice_number} - {self.buyer_name}"


class Client(models.Model):
    """
    Global Client model to track all customers and partners.
    """
    name = models.CharField(max_length=255, unique=True, verbose_name="الاسم")
    phone = models.CharField(max_length=20, blank=True, null=True, verbose_name="رقم الهاتف")
    address = models.TextField(blank=True, null=True, verbose_name="العنوان")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "عميل"
        verbose_name_plural = "العملاء"
        ordering = ['name']


class Debt(models.Model):
    """
    Debt model for tracking debts from sales or manual entries, and payments.
    """
    DEBT_TYPE_CHOICES = [
        ('debt', 'دين (عليه)'),
        ('payment', 'تسديد (منه)'),
        ('liability', 'دين (دائن)'),
        ('our_payment', 'تسديد (مدين)'),
    ]

    session = models.ForeignKey(
        Session,
        on_delete=models.CASCADE,
        related_name='debts',
        verbose_name="الجلسة"
    )
    person_name = models.CharField(
        max_length=255,
        verbose_name="الاسم"
    )
    entry_type = models.CharField(
        max_length=20,
        choices=DEBT_TYPE_CHOICES,
        default='debt',
        verbose_name="نوع العملية"
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        verbose_name="المبلغ"
    )
    date = models.DateField(
        verbose_name="التاريخ"
    )
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name="ملاحظات"
    )
    # If this debt came from a sale
    sale = models.ForeignKey(
        Sale,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='debt_entries',
        verbose_name="البيع المرتبط"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="تاريخ الإنشاء"
    )

    class Meta:
        verbose_name = "دين"
        verbose_name_plural = "الديون"
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"دين {self.person_name} - {self.amount}"


class DriverJob(models.Model):
    """
    Model for tracking driver deliveries/jobs.
    """
    session = models.ForeignKey(
        Session,
        on_delete=models.CASCADE,
        related_name='driver_jobs',
        verbose_name="الجلسة"
    )
    driver_name = models.CharField(
        max_length=255,
        verbose_name="اسم السائق"
    )
    quantity = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        blank=True,
        null=True,
        verbose_name="الكمية"
    )
    silo_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name="اسم السايلو"
    )
    invoice_number = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name="رقم القائمة"
    )
    transport_price_per_ton = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        blank=True,
        null=True,
        verbose_name="سعر نقل الطن"
    )
    total_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        blank=True,
        null=True,
        verbose_name="المبلغ الكلي"
    )
    advance_payment = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        verbose_name="السلف"
    )
    date = models.DateField(
        verbose_name="التاريخ"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="تاريخ الإنشاء"
    )

    class Meta:
        verbose_name = "نقلية سائق"
        verbose_name_plural = "نقليات السواقين"
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"نقلية {self.driver_name} - {self.invoice_number}"

class PartnerTransaction(models.Model):
    """
    Model for tracking money coming from or going to mill partners.
    """
    PARTNER_CHOICES = [
        ('mohammad_jamil', 'محمد جميل (50%)'),
        ('abdullah_khalid', 'عبدالله خالد (40%)'),
        ('bashir_sabhan', 'بشير سبهان (10%)'),
    ]

    TYPE_CHOICES = [
        ('deposit', 'إيداع'),
        ('withdrawal', 'سحب'),
        ('profit', 'أرباح (حصة)'),
    ]

    session = models.ForeignKey(
        Session,
        on_delete=models.CASCADE,
        related_name='partner_transactions',
        verbose_name="الجلسة"
    )
    partner_name = models.CharField(
        max_length=50,
        choices=PARTNER_CHOICES,
        verbose_name="اسم الشريك"
    )
    type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        verbose_name="نوع العملية"
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        verbose_name="المبلغ"
    )
    date = models.DateField(
        verbose_name="التاريخ"
    )
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name="ملاحظات"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="تاريخ الإنشاء"
    )

    class Meta:
        verbose_name = "عملية شريك"
        verbose_name_plural = "عمليات الشركاء"
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.get_partner_name_display()} - {self.amount}"
class Driver(models.Model):
    """
    Model for managing drivers and their visibility in different sections.
    """
    CATEGORY_CHOICES = [
        ('mill', 'سائق النبراس (يظهر في السواق)'),
        ('sales', 'سائق مبيعات (يظهر في المبيعات)'),
        ('both', 'الاثنين معاً'),
    ]

    name = models.CharField(max_length=255, unique=True, verbose_name="اسم السائق")
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default='both',
        verbose_name="التصنيف"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "سائق"
        verbose_name_plural = "السواق"
        ordering = ['name']

    def __str__(self):
        return self.name
