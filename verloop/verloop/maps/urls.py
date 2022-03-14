from django.urls import path
from .views import MapTemplatePage, AddressToCoordinatesConverter

urlpatterns = [
    path('coordinates/', MapTemplatePage.as_view()),
    path('getAddressDetails/', AddressToCoordinatesConverter.as_view())
]