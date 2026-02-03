"""
WSGI config for wheat_mill project.
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wheat_mill.settings')
application = get_wsgi_application()
