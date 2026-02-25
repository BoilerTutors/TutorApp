"""API routes for Class, StudentClass, and TutorClass.

- POST   /classes/                    - create a new class
- GET    /classes/                    - list/search classes
- GET    /classes/{class_id}          - get class details

- POST   /classes/student/            - student enrolls in a class
- GET    /classes/student/me          - get current student's classes
- DELETE /classes/student/{id}        - remove student class enrollment

- POST   /classes/tutor/              - tutor adds a class they can teach
- GET    /classes/tutor/me            - get current tutor's classes
- DELETE /classes/tutor/{id}          - remove tutor class entry
"""
