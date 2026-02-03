from django.contrib import admin
from .models import Session


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ['id', 'session_type', 'quota_number', 'start_date', 'end_date', 'is_closed', 'created_by']
    list_filter = ['session_type', 'is_closed', 'created_at']
    search_fields = ['created_by__username']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'
