// Simluate table 'courses' in PostgreSQL
let mockCoursesTable = [
  { id: 1, tutor_id: 2, title: "Python for Data Science", instructor: "Dr. Sarah Chen", category: "Programming", level: "Beginner", description: "Learn Python from scratch.", image: "https://example.com", visibility: "open", course_code: null, students: 4820 },
  { id: 2, tutor_id: 3, title: "Advanced Node.js", instructor: "Brian Lead", category: "Programming", level: "Advanced", description: "Master corporate backend frameworks.", image: "https://example.com", visibility: "code", course_code: "EDU-A3K9", students: 150 }
];

export const courseRepository = {
  /**
   *  Search all the active courses
   */
  findAll: async () => {
    return mockCoursesTable;
  },

  /**
   *  Search for a course based on its specific ID
   */
  findById: async (id) => {
    const course = mockCoursesTable.find((c) => c.id === Number(id));
    return course ? { ...course } : null;
  },

  /**
   * Insert a new course in the mock database
   */
  create: async (courseData) => {
    const newCourse = {
      id: mockCoursesTable.length + 1,
      ...courseData,
      students: 0 // 🟡 NOTA: Inicializa en 0, se derivará con COUNT(*) en el futuro
    };
    mockCoursesTable.push(newCourse);
    return newCourse;
  },

  /**
   * Update the data of a course
   */
  update: async (id, updatedFields) => {
    const index = mockCoursesTable.findIndex((c) => c.id === Number(id));
    if (index === -1) return null;

    const existingCourse = mockCoursesTable[index];

    // — El course_code es estrictamente INMUTABLE
    // Ignoramos por completo cualquier 'course_code' que venga en el body
    const secureFields = { ...updatedFields };
    delete secureFields.course_code; 

    // Si cambia de visibilidad a 'code' y NO tenía código previo, se le genera uno
    let finalCode = existingCourse.course_code;
    if (secureFields.visibility === "code" && !finalCode) {
      finalCode = `EDU-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    }

    mockCoursesTable[index] = {
      ...existingCourse,
      ...secureFields,
      course_code: finalCode // Se preserva o se autogenera de forma inmutable
    };

    return mockCoursesTable[index];
  }
};