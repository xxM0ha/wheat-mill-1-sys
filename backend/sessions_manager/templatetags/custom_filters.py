from django import template

register = template.Library()

@register.filter
def divide(value, arg):
    try:
        return float(value) / float(arg)
    except (ValueError, ZeroDivisionError):
        return 0

@register.filter
def divide_float(value, arg):
    try:
        return float(value) / float(arg)
    except (ValueError, ZeroDivisionError):
        return 0

@register.filter
def multiply(value, arg):
    try:
        return float(value) * float(arg)
    except ValueError:
        return 0

@register.filter
def subtract(value, arg):
    try:
        return float(value) - float(arg)
    except ValueError:
        return 0

@register.filter
def abs_val(value):
    try:
        return abs(float(value))
    except (ValueError, TypeError):
        return value

@register.filter
def mill_intcomma(value):
    """Format number with comma thousand separators and no decimals."""
    try:
        if value is None or value == '':
            return "0"
        return "{:,}".format(int(round(float(value))))
    except (ValueError, TypeError):
        return value

@register.filter
def mill_comma(value):
    """Format number with comma thousand separators, preserving decimals."""
    try:
        if value is None or value == '':
            return "0"
        num = float(value)
        # Check if it has decimals
        if num == int(num):
            return "{:,}".format(int(num))
        else:
            # Format with up to 2 decimal places, removing trailing zeros
            formatted = "{:,.2f}".format(num).rstrip('0').rstrip('.')
            return formatted
    except (ValueError, TypeError):
        return value
