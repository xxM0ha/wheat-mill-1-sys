from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Sale, Debt, Client

@receiver(post_save, sender=Sale)
def sync_client_from_sale(sender, instance, **kwargs):
    """Ensure the buyer name exists in the global Client list."""
    if instance.buyer_name:
        Client.objects.get_or_create(name=instance.buyer_name)

@receiver(post_save, sender=Debt)
def sync_client_from_debt(sender, instance, **kwargs):
    """Ensure the person name exists in the global Client list."""
    if instance.person_name:
        Client.objects.get_or_create(name=instance.person_name)

@receiver(post_save, sender=Sale)
def sync_sale_to_debt(sender, instance, created, **kwargs):
    """
    Automatically create or update a Debt entry when a Sale has an unpaid balance.
    """
    debt_amount = instance.total_amount - instance.amount_paid
    
    if debt_amount > 0:
        # Create or update debt
        Debt.objects.update_or_create(
            sale=instance,
            defaults={
                'session': instance.session,
                'person_name': instance.buyer_name,
                'amount': debt_amount,
                'date': instance.date,
                'entry_type': 'debt'
            }
        )
    else:
        # If debt was settled in the sale, remove any associated Debt entry
        Debt.objects.filter(sale=instance).delete()

@receiver(post_delete, sender=Sale)
def delete_associated_debt(sender, instance, **kwargs):
    """
    Remove associated Debt entry when a Sale is deleted.
    """
    Debt.objects.filter(sale=instance).delete()
