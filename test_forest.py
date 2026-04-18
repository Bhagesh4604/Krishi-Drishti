import requests

response = requests.post('http://localhost:8000/api/carbon/analyze', json={
    'geometry': {'type': 'Polygon', 'coordinates': [[[78.0, 20.0], [78.2, 20.0], [78.2, 20.2], [78.0, 20.2], [78.0, 20.0]]]},
    'area': 15.65,
    'crop_type': 'mixed',
    'methodology': 'Agroforestry',
    'plot_name': 'Forest Test'
})

if response.status_code == 200:
    data = response.json()
    analysis = data['analysis']
    carbon = analysis['carbon']
    print('Source:', analysis['source'])
    print('Status:', analysis['status'])
    print('Confidence:', carbon['confidence'])
    print('Health Score:', f"{analysis['health_score'] * 100:.1f}%")
    print('Moisture:', f"{analysis['moisture']:.1f}%")
    print('Carbon Credits:', f"{carbon['gross_credits']:.2f} ACT")
    print('Issuable Credits:', f"{carbon['issuable_credits']:.2f} ACT")
else:
    print('Error:', response.status_code)