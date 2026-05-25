from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sessions_manager', '0017_session_custom_name'),
    ]

    operations = [
        migrations.AddField(
            model_name='driverjob',
            name='note',
            field=models.TextField(blank=True, null=True, verbose_name='ملاحظة'),
        ),
        migrations.AddField(
            model_name='driverjob',
            name='note_date',
            field=models.DateField(blank=True, null=True, verbose_name='تاريخ الملاحظة'),
        ),
    ]
