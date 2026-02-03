from django.apps import AppConfig


class SessionsManagerConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'sessions_manager'
    verbose_name = 'إدارة الجلسات'

    def ready(self):
        import sessions_manager.signals
