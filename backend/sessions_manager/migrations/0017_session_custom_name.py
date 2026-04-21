# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sessions_manager', '0016_session_default_silo'),
    ]

    operations = [
        migrations.AddField(
            model_name='session',
            name='custom_name',
            field=models.CharField(blank=True, help_text='اسم مخصص للجلسة (اختياري). إذا لم يتم تعيينه، سيتم استخدام الاسم الافتراضي', max_length=255, null=True, verbose_name='اسم مخصص للجلسة'),
        ),
    ]
