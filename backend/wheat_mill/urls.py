"""
URL configuration for wheat_mill project.
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/sessions/', include('sessions_manager.urls')),
]
