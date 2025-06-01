
import os
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from werkzeug.utils import secure_filename
from pdf_processor import extract_grades_from_pdf
from config import Config

app = Flask(__name__)
app.config.from_object(Config)

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    try:
        if 'grade_sheet' not in request.files:
            return jsonify({'error': 'No file part'}), 400

        file = request.files['grade_sheet']

        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        if not file or not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed. Please upload a PDF file.'}), 400

        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)

        # Save the uploaded file
        file.save(filepath)

        # Extract courses from PDF
        courses = extract_grades_from_pdf(filepath)

        # Clean up the uploaded file after processing
        try:
            os.remove(filepath)
        except:
            pass  # Ignore cleanup errors

        return jsonify({'courses': courses})

    except ValueError as e:
        # These are expected errors from PDF processing
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        # Unexpected errors
        app.logger.error(f"Unexpected error in upload: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred while processing the file'}), 500

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.route('/calculate', methods=['POST'])
def calculate_cgpa():
    data = request.json
    courses = data.get('courses', [])

    total_points = 0
    total_credits = 0
    excluded_courses = []
    included_courses = []

    for course in courses:
        course_code = course.get('course_code', '').strip()
        grade = course.get('grade', '').strip()
        credits = float(course.get('credits', 0))
        grade_points = float(course.get('grade_points', 0))

        # Skip courses with NT (Not Taken) flag
        if '(NT)' in grade:
            excluded_courses.append(f"{course_code} - Not Taken")
            continue

        # Skip ENG091 course from CGPA calculation
        if course_code == 'ENG091':
            excluded_courses.append(f"{course_code} - Excluded from CGPA calculation")
            continue

        # Include all other courses (including RT - Retake courses and MAT110, MAT120, MAT215)
        total_points += credits * grade_points
        total_credits += credits
        included_courses.append(f"{course_code} - {grade}")

    cgpa = total_points / total_credits if total_credits > 0 else 0

    return jsonify({
        'cgpa': round(cgpa, 2),
        'total_credits': round(total_credits, 2),
        'total_points': round(total_points, 2),
        'included_courses': included_courses,
        'excluded_courses': excluded_courses
    })

if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(debug=True)
