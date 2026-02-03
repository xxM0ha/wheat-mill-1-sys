from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom User model for the Wheat Mill system.
    Extends Django's AbstractUser for future extensibility.
    """
    full_name_ar = models.CharField(max_length=255, blank=True, verbose_name="الاسم الكامل")
    
    class Meta:
        verbose_name = "مستخدم"
        verbose_name_plural = "المستخدمون"
    
    def __str__(self):
        return self.username
