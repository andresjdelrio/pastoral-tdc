from flask import jsonify, request
from app.api import api_bp

@api_bp.route('/test', methods=['GET'])
def test_connection():
    return jsonify({
        'message': 'Backend connection successful!',
        'status': 'healthy',
        'data': {
            'framework': 'Flask',
            'language': 'Python'
        }
    })

@api_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'API is running'})

@api_bp.route('/echo', methods=['POST'])
def echo():
    data = request.get_json()
    return jsonify({
        'received': data,
        'message': 'Echo successful'
    })