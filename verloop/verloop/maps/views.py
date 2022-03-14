import json
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response
from django.template.response import TemplateResponse


# Create your views here.
class MapTemplatePage(APIView):

    def get(self, request):
        return TemplateResponse(request, 'map_home_page.html')


class AddressToCoordinatesConverter(APIView):

    def get(self, request):
        import requests
        address = request.GET.get('address')
        if address:
            maps_api = "https://maps.googleapis.com/maps/api/geocode/json?address="\
                       + address + "&key=AIzaSyCOD3KvY2DDzEfel-NZ_LKIWXr86EF_EUw"
            request_obj = requests.get(maps_api).text
            map_obj = json.loads(request_obj)
            try:
                response = {'coordinates': {"lat": map_obj['results'][0]['geometry']['location']['lat'],
                                            "lng": map_obj['results'][0]['geometry']['location']['lng']},
                            'address': map_obj['results'][0]['formatted_address']}
                json.dumps(response)
                if request.GET.get('output_format') == 'xml':
                    request.accepted_media_type = 'application/xml'
                    return Response(response, status=status.HTTP_200_OK, content_type='application/xml')
                else:
                    return Response(response, status=status.HTTP_200_OK, content_type='application/json')
            except IndexError:
                return Response(self.get_error_message(), status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response(self.get_error_message(), status=status.HTTP_400_BAD_REQUEST)

    @staticmethod
    def get_error_message():
        response = {'error': 'ADDRESS_NOT_FOUND'}
        return json.dumps(response)
