document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('upload-form');
    const coursesContainer = document.getElementById('courses-container');
    const coursesBody = document.getElementById('courses-body');
    const addCourseBtn = document.getElementById('add-course');
    const addMissingMathBtn = document.getElementById('add-missing-math');
    const calculateBtn = document.getElementById('calculate-cgpa');
    const resultsContainer = document.getElementById('results-container');
    
    // Handle file upload
    uploadForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const formData = new FormData(uploadForm);
        const fileInput = document.getElementById('grade-sheet');

        // Debug logging
        console.log('File selected:', fileInput.files[0]);
        console.log('Form data:', formData);

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                // Display the error message
                alert('Error: ' + data.error);
                // Hide the courses section
                coursesContainer.style.display = 'none';
                return;
            }

            // Clear existing courses
            coursesBody.innerHTML = '';

            // Add each course to the table
            data.courses.forEach(course => {
                addCourseToTable(course);
            });

            // Show the courses section
            coursesContainer.style.display = 'block';
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred during upload: ' + error.message);
        });
    });
    
    // Add a new empty course row
    addCourseBtn.addEventListener('click', function() {
        addCourseToTable({
            course_code: '',
            course_title: '',
            credits: '3.00',
            grade: '',
            grade_points: '0.00'
        });
    });

    // Add missing math courses with exact titles from the grade sheet
    addMissingMathBtn.addEventListener('click', function() {
        const missingMathCourses = [
            {
                course_code: 'MAT110',
                course_title: 'MATHEMATICS I: DIFFERENTIAL CALCULUS & COORDINATE GEOMETRY',
                credits: '3.00',
                grade: '',
                grade_points: '0.00'
            },
            {
                course_code: 'MAT120',
                course_title: 'MATHEMATICS II: INTEGRAL CALCULUS & DIFFERENTIAL EQUATIONS',
                credits: '3.00',
                grade: '',
                grade_points: '0.00'
            },
            {
                course_code: 'MAT215',
                course_title: 'MATHEMATICS III: COMPLEX VARIABLES & LAPLACE TRANSFORMATIONS',
                credits: '3.00',
                grade: '',
                grade_points: '0.00'
            }
        ];

        // Check which courses are already present
        const existingCourses = Array.from(coursesBody.querySelectorAll('tr')).map(row =>
            row.querySelector('[data-field="course_code"]').textContent.trim()
        );

        // Add only missing courses
        let addedCount = 0;
        missingMathCourses.forEach(course => {
            if (!existingCourses.includes(course.course_code)) {
                addCourseToTable(course);
                addedCount++;
            }
        });

        if (addedCount > 0) {
            alert(`${addedCount} missing math course(s) have been added. Please fill in the grades and grade points.`);
        } else {
            alert('All math courses are already present in the table.');
        }
    });
    
    // Calculate CGPA
    calculateBtn.addEventListener('click', function() {
        const courses = [];

        // Get all course rows
        const rows = coursesBody.querySelectorAll('tr');

        rows.forEach(row => {
            const course = {
                course_code: row.querySelector('[data-field="course_code"]').textContent.trim(),
                course_title: row.querySelector('[data-field="course_title"]').textContent.trim(),
                credits: row.querySelector('[data-field="credits"]').textContent.trim(),
                grade: row.querySelector('[data-field="grade"]').textContent.trim(),
                grade_points: row.querySelector('[data-field="grade_points"]').textContent.trim()
            };

            courses.push(course);
        });
        
        fetch('/calculate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ courses })
        })
        .then(response => response.json())
        .then(data => {
            document.getElementById('total-credits').textContent = data.total_credits.toFixed(2);
            document.getElementById('total-points').textContent = data.total_points.toFixed(2);
            document.getElementById('cgpa-value').textContent = data.cgpa.toFixed(2);

            // Display included courses
            const includedList = document.getElementById('included-courses-list');
            includedList.innerHTML = '';
            data.included_courses.forEach(course => {
                const li = document.createElement('li');
                li.textContent = course;
                includedList.appendChild(li);
            });

            // Display excluded courses
            const excludedList = document.getElementById('excluded-courses-list');
            excludedList.innerHTML = '';
            data.excluded_courses.forEach(course => {
                const li = document.createElement('li');
                li.textContent = course;
                excludedList.appendChild(li);
            });

            // Show calculation details if there are excluded courses
            const calculationDetails = document.getElementById('calculation-details');
            if (data.excluded_courses.length > 0) {
                calculationDetails.style.display = 'block';
            } else {
                calculationDetails.style.display = 'none';
            }

            resultsContainer.style.display = 'block';

            // Scroll to results
            resultsContainer.scrollIntoView({ behavior: 'smooth' });
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred during calculation');
        });
    });
    
    // Function to add a course to the table
    function addCourseToTable(course) {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td contenteditable="true" data-field="course_code">${course.course_code}</td>
            <td contenteditable="true" data-field="course_title">${course.course_title}</td>
            <td contenteditable="true" data-field="credits">${course.credits}</td>
            <td contenteditable="true" data-field="grade">${course.grade}</td>
            <td contenteditable="true" data-field="grade_points">${course.grade_points}</td>
            <td>
                <button class="btn danger delete-course">Delete</button>
            </td>
        `;
        
        // Add delete functionality
        row.querySelector('.delete-course').addEventListener('click', function() {
            row.remove();
        });
        
        // Add auto-update for grade points based on grade
        const gradeCell = row.querySelector('[data-field="grade"]');
        const gradePointsCell = row.querySelector('[data-field="grade_points"]');
        
        gradeCell.addEventListener('input', function() {
            const grade = gradeCell.textContent.trim();
            const gradePoint = getGradePoint(grade);
            gradePointsCell.textContent = gradePoint.toFixed(2);
        });
        
        coursesBody.appendChild(row);
    }
    
    // Helper function to get grade point from letter grade
    function getGradePoint(grade) {
        // Remove any (RT) or (NT) markers for the calculation
        const cleanGrade = grade.replace(/\([A-Z]{2}\)/g, '').trim();
        
        const gradeMap = {
            'A': 4.0,
            'A-': 3.7,
            'B+': 3.3,
            'B': 3.0,
            'B-': 2.7,
            'C+': 2.3,
            'C': 2.0,
            'C-': 1.7,
            'D+': 1.3,
            'D': 1.0,
            'D-': 0.7,
            'F': 0.0
        };
        
        return gradeMap[cleanGrade] || 0;
    }
});