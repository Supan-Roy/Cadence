from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import Genre, Track

admin.site.register(Genre)
admin.site.register(Track)
